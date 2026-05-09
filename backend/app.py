from flask import Flask, jsonify, request
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np
import os
import datetime
import math
import shap

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

BASE = os.path.dirname(os.path.abspath(__file__))

# ── LOAD MODELS ──
with open(os.path.join(BASE, "models/model_admission.pkl"), "rb") as f:
    model_admission = pickle.load(f)
with open(os.path.join(BASE, "models/model_rework.pkl"), "rb") as f:
    model_rework = pickle.load(f)
with open(os.path.join(BASE, "models/model_discharge.pkl"), "rb") as f:
    model_discharge = pickle.load(f)
with open(os.path.join(BASE, "models/model_transfer.pkl"), "rb") as f:
    model_transfer = pickle.load(f)
with open(os.path.join(BASE, "models/model_overall.pkl"), "rb") as f:
    model_overall = pickle.load(f)

print("All models loaded!")

# ── LOAD DATASET ──
df_global = pd.read_csv(os.path.join(BASE, "hospital_synthetic_data.csv"))

# ── PRECOMPUTE CORRELATION MATRIX (Fix 4) ──
delay_cols_cascade = ['Admission_Delay_Min', 'TAT_Min', 'Bed_Delay_Min',
                      'Wait_Time_Min', 'Rework_Count', 'Num_Transfers']
corr_matrix = df_global[delay_cols_cascade].corr()
thresholds_cascade = df_global[delay_cols_cascade].quantile(0.75).to_dict()

# ── PRECOMPUTE SHAP EXPLAINER (Fix 2) ──
shap_explainer = shap.TreeExplainer(model_overall)
print("SHAP explainer ready!")

# ── DATASET REPLAY INDEX (Fix 3) ──
patient_index = [0]

# ─────────────────────────────────────────
# UTILITY FUNCTIONS
# ─────────────────────────────────────────

def calculate_debt_score(wait, tat, bed_delay, admission_delay,
                          transfers, process_steps, loop_count, rework):
    return round(0.15*wait + 0.10*tat + 0.10*bed_delay + 0.05*admission_delay +
                 0.10*transfers*10 + 0.05*process_steps*5 +
                 0.05*loop_count*10 + 0.08*rework*10, 2)

def get_severity(score):
    if score < 30: return "HEALTHY"
    elif score < 60: return "MODERATE"
    elif score < 85: return "HIGH"
    else: return "CRITICAL"

def get_severity_color(score):
    if score < 30: return "green"
    elif score < 60: return "yellow"
    elif score < 85: return "orange"
    else: return "red"

# ── FIX 2: SHAP-DRIVEN RECOMMENDATION ENGINE ──
def generate_recommendations(data, department, debt_score, shap_values=None, feature_names=None):
    recs = []

    action_map = {
        'Doctor_Load': ('Assign additional doctors to ' + department, 34, 1200),
        'Bed_Occupancy_%': ('Fast-track pending discharge approvals to free beds', 22, 0),
        'Rework_Count': ('Assign senior staff to verify data entries in Lab', 18, 800),
        'TAT_Min': ('Prioritize pending lab reports immediately', 20, 0),
        'Num_Transfers': ('Optimize patient routing — reduce inter-dept transfers', 15, 0),
        'Discharge_Bottleneck_Index': ('Automate discharge approval for insurance cases', 12, 400),
        'Resource_Utilization_Rate': ('Open additional counter during peak hours', 10, 600),
        'Loop_Count': ('Eliminate repeated process steps — streamline workflow', 8, 0),
    }

    urgency_map = {1: 'NOW', 2: 'URGENT', 3: 'HIGH', 4: 'MODERATE', 5: 'LOW'}

    # SHAP-driven recommendations (AI-driven)
    if shap_values is not None and feature_names is not None:
        top_features = sorted(
            zip(feature_names, shap_values),
            key=lambda x: abs(x[1]),
            reverse=True
        )
        priority = 1
        for feat, val in top_features:
            if feat in action_map and val > 0:
                action, impact, cost = action_map[feat]
                recs.append({
                    "priority": priority,
                    "action": action,
                    "impact_pct": impact,
                    "cost_estimate": cost,
                    "savings_estimate": round(debt_score * (impact/100) * 150, 0),
                    "urgency": urgency_map.get(priority, 'LOW'),
                    "driven_by": f"SHAP: {feat} (+{round(val, 3)})"
                })
                priority += 1
                if priority > 5:
                    break

    # Fallback to rule-based if SHAP unavailable
    if not recs:
        doctor_load = data.get("doctor_load", 0)
        bed_occupancy = data.get("bed_occupancy", 0)
        rework_count = data.get("rework_count", 0)
        num_transfers = data.get("num_transfers", 0)
        discharge_bi = data.get("discharge_bottleneck_index", 0)

        if doctor_load > 40:
            recs.append({"priority": 1, "action": action_map['Doctor_Load'][0], "impact_pct": 34, "cost_estimate": 1200, "savings_estimate": round(debt_score*0.34*150, 0), "urgency": "NOW", "driven_by": "Rule: High Doctor Load"})
        if bed_occupancy > 80:
            recs.append({"priority": 2, "action": action_map['Bed_Occupancy_%'][0], "impact_pct": 22, "cost_estimate": 0, "savings_estimate": round(debt_score*0.22*150, 0), "urgency": "URGENT", "driven_by": "Rule: High Bed Occupancy"})
        if rework_count > 1:
            recs.append({"priority": 3, "action": action_map['Rework_Count'][0], "impact_pct": 18, "cost_estimate": 800, "savings_estimate": round(debt_score*0.18*150, 0), "urgency": "HIGH", "driven_by": "Rule: High Rework"})
        if num_transfers > 2:
            recs.append({"priority": 4, "action": action_map['Num_Transfers'][0], "impact_pct": 15, "cost_estimate": 0, "savings_estimate": round(debt_score*0.15*150, 0), "urgency": "MODERATE", "driven_by": "Rule: High Transfers"})
        if not recs:
            recs.append({"priority": 1, "action": "Monitor department — no critical intervention needed", "impact_pct": 5, "cost_estimate": 0, "savings_estimate": 0, "urgency": "LOW", "driven_by": "Rule: Normal State"})

    return sorted(recs, key=lambda x: x["priority"])

# ── FIX 4: CORRELATION-BASED CASCADE DETECTION ──
def detect_cascade(tat, bed_delay, admission_delay, wait_time, rework, transfers):
    input_vals = {
        'TAT_Min': tat,
        'Bed_Delay_Min': bed_delay,
        'Admission_Delay_Min': admission_delay,
        'Wait_Time_Min': wait_time,
        'Rework_Count': rework,
        'Num_Transfers': transfers
    }
    cascade = []
    for col, val in input_vals.items():
        threshold = thresholds_cascade.get(col, 0)
        if val > threshold:
            correlated = corr_matrix[col].abs().sort_values(ascending=False)
            next_stage = correlated.index[1]
            corr_val = float(correlated.iloc[1])
            if corr_val > 0.3:
                cascade.append({
                    "stage": col.replace('_Min', '').replace('_', ' '),
                    "delay": round(val, 1),
                    "causes": next_stage.replace('_Min', '').replace('_', ' '),
                    "correlation": round(corr_val, 3),
                    "impact": "HIGH" if corr_val > 0.5 else "MODERATE"
                })
    root_cause = cascade[0]["stage"] if cascade else "None"
    return {"chain": cascade, "root_cause": root_cause}

# ─────────────────────────────────────────
# API ROUTES
# ─────────────────────────────────────────

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "HospitalDebt-AI Backend Running!", "status": "ok"})

@app.route("/api/predict", methods=["POST", "OPTIONS"])
def predict_all():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        data = request.json or {}
        visit_hour      = float(data.get("visit_hour", 12))
        day_type        = float(data.get("day_type", 0))
        triage_level    = float(data.get("triage_level", 2))
        doctor_load     = float(data.get("doctor_load", 20))
        staff_ratio     = float(data.get("staff_to_patient_ratio", 0.3))
        resource_util   = float(data.get("resource_utilization_rate", 70))
        bed_occupancy   = float(data.get("bed_occupancy", 70))
        num_transfers   = float(data.get("num_transfers", 1))
        num_steps       = float(data.get("num_process_steps", 5))
        loop_count      = float(data.get("loop_count", 0))
        rework_count    = float(data.get("rework_count", 0))
        repeated_tests  = float(data.get("repeated_tests", 0))
        data_errors     = float(data.get("data_error_count", 0))
        downtime        = float(data.get("system_downtime_impact", 0))
        discharge_bi    = float(data.get("discharge_bottleneck_index", 10))
        wait_time       = float(data.get("wait_time_min", 30))
        tat_min         = float(data.get("tat_min", 45))
        bed_delay       = float(data.get("bed_delay_min", 20))
        admission_delay = float(data.get("admission_delay_min", 15))
        department      = data.get("department", "OPD")

        # Module 1 - Admission Delay
        X1 = pd.DataFrame([[visit_hour, day_type, triage_level, doctor_load, staff_ratio, bed_occupancy]],
                           columns=['Visit_Hour', 'Day_Type', 'Triage_Level', 'Doctor_Load',
                                    'Staff_To_Patient_Ratio', 'Bed_Occupancy_%'])
        pred_admission = float(model_admission.predict(X1)[0])

        # Module 2 - Rework
        X2 = pd.DataFrame([[doctor_load, num_transfers, resource_util, visit_hour, staff_ratio, triage_level]],
                           columns=['Doctor_Load', 'Num_Transfers', 'Resource_Utilization_Rate',
                                    'Visit_Hour', 'Staff_To_Patient_Ratio', 'Triage_Level'])
        pred_rework_prob = float(model_rework.predict_proba(X2)[0][1])
        pred_rework_flag = int(model_rework.predict(X2)[0])

        # Module 3 - Discharge/Bed Delay
        X3 = pd.DataFrame([[discharge_bi, bed_occupancy, doctor_load, loop_count, downtime, num_steps]],
                           columns=['Discharge_Bottleneck_Index', 'Bed_Occupancy_%', 'Doctor_Load',
                                    'Loop_Count', 'System_Downtime_Impact', 'Num_Process_Steps'])
        pred_discharge = float(model_discharge.predict(X3)[0])

        # Module 4 - Transfer Delay
        X4 = pd.DataFrame([[visit_hour, triage_level, doctor_load, num_steps, resource_util, bed_occupancy]],
                           columns=['Visit_Hour', 'Triage_Level', 'Doctor_Load', 'Num_Process_Steps',
                                    'Resource_Utilization_Rate', 'Bed_Occupancy_%'])
        pred_transfer_prob = float(model_transfer.predict_proba(X4)[0][1])
        pred_transfer_flag = int(model_transfer.predict(X4)[0])

        # Module 5 - Overall Risk
        X5 = pd.DataFrame([[visit_hour, day_type, triage_level, doctor_load, staff_ratio, resource_util,
                             bed_occupancy, num_transfers, num_steps, loop_count, rework_count,
                             repeated_tests, data_errors, downtime, discharge_bi]],
                           columns=['Visit_Hour', 'Day_Type', 'Triage_Level', 'Doctor_Load',
                                    'Staff_To_Patient_Ratio', 'Resource_Utilization_Rate',
                                    'Bed_Occupancy_%', 'Num_Transfers', 'Num_Process_Steps',
                                    'Loop_Count', 'Rework_Count', 'Repeated_Tests',
                                    'Data_Error_Count', 'System_Downtime_Impact',
                                    'Discharge_Bottleneck_Index'])
        pred_overall_prob = float(model_overall.predict_proba(X5)[0][1])
        pred_overall_flag = int(model_overall.predict(X5)[0])

        # Debt Score
        debt_score = calculate_debt_score(wait_time, tat_min, bed_delay, admission_delay,
                                          num_transfers, num_steps, loop_count, rework_count)
        severity = get_severity(debt_score)
        rupee_equivalent = round(debt_score * 150, 0)

        # FIX 2: SHAP-driven recommendations
        try:
            shap_vals_rec = shap_explainer.shap_values(X5)[0].tolist()
            feat_names_rec = X5.columns.tolist()
        except:
            shap_vals_rec = None
            feat_names_rec = None

        recommendations = generate_recommendations(
            {
                "doctor_load": doctor_load,
                "bed_occupancy": bed_occupancy,
                "rework_count": rework_count,
                "num_transfers": num_transfers,
                "discharge_bottleneck_index": discharge_bi,
                "resource_utilization_rate": resource_util
            },
            department, debt_score,
            shap_values=shap_vals_rec,
            feature_names=feat_names_rec
        )

        # FIX 4: Correlation-based cascade
        cascade = detect_cascade(tat_min, bed_delay, admission_delay,
                                  wait_time, rework_count, num_transfers)

        before_after = {
            "before": {
                "debt_score": debt_score,
                "admission_delay": round(pred_admission, 1),
                "discharge_delay": round(pred_discharge, 1),
                "rework_risk": round(pred_rework_prob * 100, 1),
                "transfer_risk": round(pred_transfer_prob * 100, 1),
                "rupee_loss": rupee_equivalent
            },
            "after": {
                "debt_score": round(debt_score * 0.58, 2),
                "admission_delay": round(pred_admission * 0.6, 1),
                "discharge_delay": round(pred_discharge * 0.55, 1),
                "rework_risk": round(pred_rework_prob * 100 * 0.5, 1),
                "transfer_risk": round(pred_transfer_prob * 100 * 0.6, 1),
                "rupee_loss": round(rupee_equivalent * 0.4, 0)
            }
        }

        return jsonify({
            "status": "success",
            "department": department,
            "debt_score": debt_score,
            "severity": severity,
            "severity_color": get_severity_color(debt_score),
            "rupee_equivalent": rupee_equivalent,
            "predictions": {
                "admission_delay_min": round(pred_admission, 1),
                "rework_probability": round(pred_rework_prob * 100, 1),
                "rework_flag": pred_rework_flag,
                "discharge_delay_min": round(pred_discharge, 1),
                "transfer_delay_probability": round(pred_transfer_prob * 100, 1),
                "transfer_delay_flag": pred_transfer_flag,
                "overall_risk_probability": round(pred_overall_prob * 100, 1),
                "overall_risk_flag": pred_overall_flag
            },
            "recommendations": recommendations,
            "cascade": cascade,
            "before_after": before_after
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/departments", methods=["GET"])
def department_overview():
    df = df_global.copy()
    df["Debt_Score"] = (
        0.15 * df["Wait_Time_Min"] + 0.10 * df["TAT_Min"] +
        0.10 * df["Bed_Delay_Min"] + 0.05 * df["Admission_Delay_Min"] +
        0.10 * df["Num_Transfers"] * 10 + 0.05 * df["Num_Process_Steps"] * 5 +
        0.05 * df["Loop_Count"] * 10 + 0.08 * df["Rework_Count"] * 10
    )
    triage_map = {1: "ICU", 2: "OPD", 3: "Ward"}
    df["Department"] = df["Triage_Level"].map(triage_map)
    lab_df = df[df["TAT_Min"] > df["TAT_Min"].quantile(0.6)].copy()
    lab_df["Department"] = "Lab"
    pharmacy_df = df[df["Rework_Count"] > 0].copy()
    pharmacy_df["Department"] = "Pharmacy"
    discharge_df = df[df["Discharge_Bottleneck_Index"] > df["Discharge_Bottleneck_Index"].quantile(0.6)].copy()
    discharge_df["Department"] = "Discharge"
    all_df = pd.concat([df, lab_df, pharmacy_df, discharge_df])
    dept_order = ["OPD", "Lab", "Ward", "ICU", "Pharmacy", "Discharge"]
    result = []
    for i, dept in enumerate(dept_order):
        subset = all_df[all_df["Department"] == dept]
        if len(subset) == 0:
            continue
        # FIX 3: Use real dataset row instead of average
        row = subset.sample(1).iloc[0]
        score = round(float(row["Debt_Score"]), 1)
        avg_wait = round(float(row["Wait_Time_Min"]), 1)
        patients = int(row["Doctor_Load"])
        result.append({
            "name": dept,
            "debt_score": score,
            "severity": get_severity(score),
            "severity_color": get_severity_color(score),
            "patients_waiting": patients,
            "avg_delay_min": avg_wait
        })
    return jsonify({"status": "success", "departments": result})


# FIX 1: Debt Pulse using real hourly averages
@app.route("/api/debt-pulse", methods=["GET"])
def debt_pulse():
    df = df_global.copy()
    df["Debt_Score"] = (
        0.15 * df["Wait_Time_Min"] + 0.10 * df["TAT_Min"] +
        0.10 * df["Bed_Delay_Min"] + 0.05 * df["Admission_Delay_Min"] +
        0.10 * df["Num_Transfers"] * 10 + 0.05 * df["Num_Process_Steps"] * 5 +
        0.05 * df["Loop_Count"] * 10 + 0.08 * df["Rework_Count"] * 10
    )
    hourly_avg = df.groupby("Visit_Hour")["Debt_Score"].mean()
    now = datetime.datetime.now()
    current_hour = now.hour
    pulse = []
    # Rolling 60-minute window using real hourly averages
    for i in range(20):
        t = now - datetime.timedelta(minutes=(20 - i) * 3)
        hour = (current_hour - (20 - i) // 4) % 24
        score = float(hourly_avg.get(hour, hourly_avg.mean()))
        pulse.append({
            "time": t.strftime("%H:%M"),
            "debt_score": round(score, 1)
        })
    return jsonify({"status": "success", "pulse": pulse})


@app.route("/api/peak-hours", methods=["GET"])
def peak_hours():
    df = df_global.copy()
    df["Debt_Score"] = (
        0.15 * df["Wait_Time_Min"] + 0.10 * df["TAT_Min"] +
        0.10 * df["Bed_Delay_Min"] + 0.05 * df["Admission_Delay_Min"] +
        0.10 * df["Num_Transfers"] * 10 + 0.05 * df["Num_Process_Steps"] * 5 +
        0.05 * df["Loop_Count"] * 10 + 0.08 * df["Rework_Count"] * 10
    )
    hourly = df.groupby("Visit_Hour")["Debt_Score"].mean().reset_index()
    hourly.columns = ["hour", "avg_debt_score"]
    hourly["avg_debt_score"] = hourly["avg_debt_score"].round(2)
    peak_hour = int(hourly.loc[hourly["avg_debt_score"].idxmax(), "hour"])
    return jsonify({
        "status": "success",
        "hourly_data": hourly.to_dict(orient="records"),
        "peak_hour": peak_hour,
        "peak_label": f"{peak_hour}:00 - {peak_hour+1}:00"
    })


@app.route("/api/shap", methods=["POST", "OPTIONS"])
def shap_explain():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        data = request.json or {}
        visit_hour     = float(data.get("visit_hour", 12))
        day_type       = float(data.get("day_type", 0))
        triage_level   = float(data.get("triage_level", 2))
        doctor_load    = float(data.get("doctor_load", 20))
        staff_ratio    = float(data.get("staff_to_patient_ratio", 0.3))
        resource_util  = float(data.get("resource_utilization_rate", 70))
        bed_occupancy  = float(data.get("bed_occupancy", 70))
        num_transfers  = float(data.get("num_transfers", 1))
        num_steps      = float(data.get("num_process_steps", 5))
        loop_count     = float(data.get("loop_count", 0))
        rework_count   = float(data.get("rework_count", 0))
        repeated_tests = float(data.get("repeated_tests", 0))
        data_errors    = float(data.get("data_error_count", 0))
        downtime       = float(data.get("system_downtime_impact", 0))
        discharge_bi   = float(data.get("discharge_bottleneck_index", 10))

        X = pd.DataFrame([[visit_hour, day_type, triage_level, doctor_load, staff_ratio,
                            resource_util, bed_occupancy, num_transfers, num_steps, loop_count,
                            rework_count, repeated_tests, data_errors, downtime, discharge_bi]],
                          columns=['Visit_Hour', 'Day_Type', 'Triage_Level', 'Doctor_Load',
                                   'Staff_To_Patient_Ratio', 'Resource_Utilization_Rate',
                                   'Bed_Occupancy_%', 'Num_Transfers', 'Num_Process_Steps',
                                   'Loop_Count', 'Rework_Count', 'Repeated_Tests',
                                   'Data_Error_Count', 'System_Downtime_Impact',
                                   'Discharge_Bottleneck_Index'])

        shap_values = shap_explainer.shap_values(X)
        feature_names = X.columns.tolist()
        shap_vals = shap_values[0].tolist()
        shap_data = sorted(
            [{"feature": f, "value": round(v, 4)} for f, v in zip(feature_names, shap_vals)],
            key=lambda x: abs(x["value"]), reverse=True)

        return jsonify({
            "status": "success",
            "shap_explanation": shap_data[:8],
            "base_value": round(float(shap_explainer.expected_value), 4)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# FIX 3: Dataset replay endpoint
@app.route("/api/live-patient", methods=["GET"])
def live_patient():
    idx = patient_index[0] % len(df_global)
    row = df_global.iloc[idx].to_dict()
    patient_index[0] += 1
    row_clean = {k: (float(v) if hasattr(v, 'item') else v)
                 for k, v in row.items()}
    return jsonify({"status": "success", "patient": row_clean, "index": idx})


if __name__ == "__main__":
    print("Starting HospitalDebt-AI Backend...")
    print("API running at http://localhost:5000")
    app.run(debug=True, port=5000)