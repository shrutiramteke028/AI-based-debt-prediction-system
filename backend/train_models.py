import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, accuracy_score, classification_report
from xgboost import XGBRegressor, XGBClassifier

print("Loading dataset...")
df = pd.read_csv("hospital_synthetic_data.csv")
print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
print("Columns:", list(df.columns))

# Create derived columns
df['Rework_Flag'] = ((df['Rework_Count'] > 0) | (df['Repeated_Tests'] > 0)).astype(int)
df['Transfer_Delay_Flag'] = (df['Num_Transfers'] > 2).astype(int)

# MODULE 1 - Admission Delay (Regression)
print("\n--- Module 1: Admission Delay ---")
X1 = df[['Visit_Hour', 'Day_Type', 'Triage_Level', 'Doctor_Load', 'Staff_To_Patient_Ratio', 'Bed_Occupancy_%']]
y1 = df['Admission_Delay_Min']
X1_train, X1_test, y1_train, y1_test = train_test_split(X1, y1, test_size=0.2, random_state=42)
model1 = XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42)
model1.fit(X1_train, y1_train)
mae1 = mean_absolute_error(y1_test, model1.predict(X1_test))
print(f"MAE: {mae1:.2f} mins")
print(f"Feature order: {list(X1.columns)}")
with open("models/model_admission.pkl", "wb") as f:
    pickle.dump(model1, f)
print("Saved model_admission.pkl")

# MODULE 2 - Rework Predictor (Classification)
print("\n--- Module 2: Rework Predictor ---")
X2 = df[['Doctor_Load', 'Num_Transfers', 'Resource_Utilization_Rate', 'Visit_Hour', 'Staff_To_Patient_Ratio', 'Triage_Level']]
y2 = df['Rework_Flag']
X2_train, X2_test, y2_train, y2_test = train_test_split(X2, y2, test_size=0.2, random_state=42)
model2 = XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, eval_metric='logloss')
model2.fit(X2_train, y2_train)
acc2 = accuracy_score(y2_test, model2.predict(X2_test))
print(f"Accuracy: {acc2*100:.2f}%")
print(f"Feature order: {list(X2.columns)}")
with open("models/model_rework.pkl", "wb") as f:
    pickle.dump(model2, f)
print("Saved model_rework.pkl")

# MODULE 3 - Discharge Delay (Regression)
print("\n--- Module 3: Discharge Delay ---")
X3 = df[['Discharge_Bottleneck_Index', 'Bed_Occupancy_%', 'Doctor_Load', 'Loop_Count', 'System_Downtime_Impact', 'Num_Process_Steps']]
y3 = df['Bed_Delay_Min']
X3_train, X3_test, y3_train, y3_test = train_test_split(X3, y3, test_size=0.2, random_state=42)
model3 = XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42)
model3.fit(X3_train, y3_train)
mae3 = mean_absolute_error(y3_test, model3.predict(X3_test))
print(f"MAE: {mae3:.2f} mins")
print(f"Feature order: {list(X3.columns)}")
with open("models/model_discharge.pkl", "wb") as f:
    pickle.dump(model3, f)
print("Saved model_discharge.pkl")

# MODULE 4 - Transfer Delay (Classification)
print("\n--- Module 4: Transfer Delay ---")
X4 = df[['Visit_Hour', 'Triage_Level', 'Doctor_Load', 'Num_Process_Steps', 'Resource_Utilization_Rate', 'Bed_Occupancy_%']]
y4 = df['Transfer_Delay_Flag']
X4_train, X4_test, y4_train, y4_test = train_test_split(X4, y4, test_size=0.2, random_state=42)
model4 = XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, eval_metric='logloss')
model4.fit(X4_train, y4_train)
acc4 = accuracy_score(y4_test, model4.predict(X4_test))
print(f"Accuracy: {acc4*100:.2f}%")
print(f"Feature order: {list(X4.columns)}")
with open("models/model_transfer.pkl", "wb") as f:
    pickle.dump(model4, f)
print("Saved model_transfer.pkl")

# MODULE 5 - Overall Risk (Classification)
print("\n--- Module 5: Overall Risk ---")
X5 = df[['Visit_Hour', 'Day_Type', 'Triage_Level', 'Doctor_Load', 'Staff_To_Patient_Ratio',
          'Resource_Utilization_Rate', 'Bed_Occupancy_%', 'Num_Transfers', 'Num_Process_Steps',
          'Loop_Count', 'Rework_Count', 'Repeated_Tests', 'Data_Error_Count',
          'System_Downtime_Impact', 'Discharge_Bottleneck_Index']]
y5 = df['Delay_Risk']
X5_train, X5_test, y5_train, y5_test = train_test_split(X5, y5, test_size=0.2, random_state=42)
model5 = XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, eval_metric='logloss')
model5.fit(X5_train, y5_train)
acc5 = accuracy_score(y5_test, model5.predict(X5_test))
print(f"Accuracy: {acc5*100:.2f}%")
print(f"Feature order: {list(X5.columns)}")
with open("models/model_overall.pkl", "wb") as f:
    pickle.dump(model5, f)
print("Saved model_overall.pkl")

print("\n" + "="*50)
print("ALL MODELS TRAINED SUCCESSFULLY!")
print("="*50)
print(f"Module 1 - Admission Delay  MAE: {mae1:.2f} mins")
print(f"Module 2 - Rework           ACC: {acc2*100:.2f}%")
print(f"Module 3 - Discharge Delay  MAE: {mae3:.2f} mins")
print(f"Module 4 - Transfer Delay   ACC: {acc4*100:.2f}%")
print(f"Module 5 - Overall Risk     ACC: {acc5*100:.2f}%")
