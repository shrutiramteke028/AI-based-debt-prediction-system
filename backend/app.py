from flask import Flask, jsonify, request
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np
import os
import datetime
import math

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

def calculate_debt_score(wait, tat, bed_delay, admission_delay, transfers, process_steps, loop_count, rework):
    return round(0.15*wait + 0.10*tat + 0.10*bed_delay + 0.05*admission_delay +
                 0.10*transfers*10 + 0.05*process_steps*5 + 0.05*loop_count*10 + 0.08*rework*10, 2)

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

def generate_recommendations(doctor_load, bed_occupancy, rework_count, num_transfers, discharge_bi, resource_util, department, debt_score):
    recs = []
    if doctor_load > 40:
        recs.append({"priority": 1, "action": f"Assign 2 additional doctors to {department}", "impact_pct": 34, "cost_estimate": 1200, "savings_estimate": round(debt_score * 0.34 * 150, 0), "urgency": "NOW"})
    if bed_occupancy > 80:
        recs.append({"priority": 2, "action": "Fast-track pending discharge approvals to free beds", "impact_pct": 22, "cost_estimate": 0, "savings_estimate": round(debt_score * 0.22 * 150, 0), "urgency": "URGENT"})
    if rework_count > 1:
        recs.append({"priority": 3, "action": "Assign senior staff to verify data entries in Lab", "impact_pct": 18, "cost_estimate": 800, "savings_estimate": round(debt_score * 0.18 * 150, 0), "urgency": "HIGH"})
    if num_transfers > 2:
        recs.append({"priority": 4, "action": "Optimize patient routing - reduce inter-dept transfers", "impact_pct": 15, "cost_estimate": 0, "savings_estimate": round(debt_score * 0.15 * 150, 0), "urgency": "MODERATE"})
    if discharge_bi > 20:
        recs.append({"priority": 5, "action": "Automate discharge approval workflow for insurance cases", "impact_pct": 12, "cost_estimate": 400, "savings_estimate": round(debt_score * 0.12 * 150, 0), "urgency": "MODERATE"})
    if resource_util > 85:
        recs.append({"priority": 6, "action": f"Open additional counter in {department} during peak hours", "impact_pct": 10, "cost_estimate": 600, "savings_estimate": round(debt_score * 0.10 * 150, 0), "urgency": "LOW"})
    if not recs:
        recs.append({"priority": 1, "action": "Monitor department - no critical intervention needed", "impact_pct": 5, "cost_estimate": 0, "savings_estimate": 0, "urgency": "LOW"})
    return sorted(recs, key=lambda x: x["priority"])

def detect_cascade(tat, bed_delay, admission_delay, wait_time, rework, transfers):
    cascade = []
    if tat > 60:
        cascade.append({"stage": "Lab TAT", "delay": tat, "causes": "Discharge Queue Backup", "impact": "HIGH"})
    if bed_delay > 40:
        cascade.append({"stage": "Bed Delay", "delay": bed_delay, "causes": "Admission Backlog", "impact": "HIGH"})
    if admission_delay > 30:
        cascade.append({"stage": "Admission Delay", "delay": admission_delay, "causes": "OPD Wait Surge", "impact": "MODERATE"})
    if rework > 1:
        cascade.append({"stage": "Rework", "delay": rework * 15, "causes": "Repeated Tests + Data Errors", "impact": "MODERATE"})
    if transfers > 2:
        cascade.append({"stage": "Transfers", "delay": transfers * 10, "causes": "Department Congestion", "impact": "LOW"})
    root_cause = cascade[0]["stage"] if cascade else "None"
    return {"chain": cascade, "root_cause": root_cause}

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
                           columns=['Visit_Hour', 'Day_Type', 'Triage_Level', 'Doctor_Load', 'Staff_To_Patient_Ratio', 'Bed_Occupancy_%'])
        pred_admission = float(model_admission.predict(X1)[0])

        # Module 2 - Rework
        X2 = pd.DataFrame([[doctor_load, num_transfers, resource_util, visit_hour, staff_ratio, triage_level]],
                           columns=['Doctor_Load', 'Num_Transfers', 'Resource_Utilization_Rate', 'Visit_Hour', 'Staff_To_Patient_Ratio', 'Triage_Level'])
        pred_rework_prob = float(model_rework.predict_proba(X2)[0][1])
        pred_rework_flag = int(model_rework.predict(X2)[0])

        # Module 3 - Discharge/Bed Delay
        X3 = pd.DataFrame([[discharge_bi, bed_occupancy, doctor_load, loop_count, downtime, num_steps]],
                           columns=['Discharge_Bottleneck_Index', 'Bed_Occupancy_%', 'Doctor_Load', 'Loop_Count', 'System_Downtime_Impact', 'Num_Process_Steps'])
        pred_discharge = float(model_discharge.predict(X3)[0])

        # Module 4 - Transfer Delay
        X4 = pd.DataFrame([[visit_hour, triage_level, doctor_load, num_steps, resource_util, bed_occupancy]],
                           columns=['Visit_Hour', 'Triage_Level', 'Doctor_Load', 'Num_Process_Steps', 'Resource_Utilization_Rate', 'Bed_Occupancy_%'])
        pred_transfer_prob = float(model_transfer.predict_proba(X4)[0][1])
        pred_transfer_flag = int(model_transfer.predict(X4)[0])

        # Module 5 - Overall Risk
        X5 = pd.DataFrame([[visit_hour, day_type, triage_level, doctor_load, staff_ratio, resource_util,
                             bed_occupancy, num_transfers, num_steps, loop_count, rework_count,
                             repeated_tests, data_errors, downtime, discharge_bi]],
                           columns=['Visit_Hour', 'Day_Type', 'Triage_Level', 'Doctor_Load', 'Staff_To_Patient_Ratio',
                                    'Resource_Utilization_Rate', 'Bed_Occupancy_%', 'Num_Transfers', 'Num_Process_Steps',
                                    'Loop_Count', 'Rework_Count', 'Repeated_Tests', 'Data_Error_Count',
                                    'System_Downtime_Impact', 'Discharge_Bottleneck_Index'])
        pred_overall_prob = float(model_overall.predict_proba(X5)[0][1])
        pred_overall_flag = int(model_overall.predict(X5)[0])

        debt_score = calculate_debt_score(wait_time, tat_min, bed_delay, admission_delay,
                                          num_transfers, num_steps, loop_count, rework_count)
        severity = get_severity(debt_score)
        rupee_equivalent = round(debt_score * 150, 0)

        recommendations = generate_recommendations(
            doctor_load, bed_occupancy, rework_count, num_transfers,
            discharge_bi, resource_util, department, debt_score)

        cascade = detect_cascade(tat_min, bed_delay, admission_delay, wait_time, rework_count, num_transfers)

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
    minute = datetime.datetime.now().minute
    for i, dept in enumerate(dept_order):
        subset = all_df[all_df["Department"] == dept]
        if len(subset) == 0:
            continue
        score = round(float(subset["Debt_Score"].mean()), 1)
        avg_wait = round(float(subset["Wait_Time_Min"].mean()), 1)
        patients = int(subset["Doctor_Load"].mean())
        variation = math.sin(minute * 0.1 + i) * 4
        score = round(max(10, min(99, score + variation)), 1)
        result.append({
            "name": dept,
            "debt_score": score,
            "severity": get_severity(score),
            "severity_color": get_severity_color(score),
            "patients_waiting": patients,
            "avg_delay_min": avg_wait
        })
    return jsonify({"status": "success", "departments": result})

@app.route("/api/debt-pulse", methods=["GET"])
def debt_pulse():
    df = df_global.copy()
    df["Debt_Score"] = (
        0.15 * df["Wait_Time_Min"] + 0.10 * df["TAT_Min"] +
        0.10 * df["Bed_Delay_Min"] + 0.05 * df["Admission_Delay_Min"] +
        0.10 * df["Num_Transfers"] * 10 + 0.05 * df["Num_Process_Steps"] * 5 +
        0.05 * df["Loop_Count"] * 10 + 0.08 * df["Rework_Count"] * 10
    )
    hourly = df.groupby("Visit_Hour")["Debt_Score"].mean()
    now = datetime.datetime.now()
    pulse = []
    for i in range(20):
        t = now - datetime.timedelta(minutes=(20 - i) * 3)
        hour = t.hour
        base_score = float(hourly.get(hour, hourly.mean()))
        variation = math.sin(i * 0.5) * 3
        score = round(max(10, min(99, base_score + variation)), 1)
        pulse.append({"time": t.strftime("%H:%M"), "debt_score": score})
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
        import shap
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
        explainer = shap.TreeExplainer(model_overall)
        shap_values = explainer.shap_values(X)
        feature_names = X.columns.tolist()
        shap_vals = shap_values[0].tolist()
        shap_data = sorted(
            [{"feature": f, "value": round(v, 4)} for f, v in zip(feature_names, shap_vals)],
            key=lambda x: abs(x["value"]), reverse=True)
        return jsonify({"status": "success", "shap_explanation": shap_data[:8],
                        "base_value": round(float(explainer.expected_value), 4)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    print("Starting HospitalDebt-AI Backend...")
    print("API running at http://localhost:5000")
    app.run(debug=True, port=5000)
