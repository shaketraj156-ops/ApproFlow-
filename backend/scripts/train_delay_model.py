"""
train_delay_model.py: Trains a Gradient Boosting baseline classifier
for stage delay prediction and outputs models/delay_model.joblib.
"""
import os
import numpy as np
import joblib
from sklearn.ensemble import GradientBoostingClassifier

def train_and_export_model():
    print("[INFO] Training baseline ML delay prediction model...")
    os.makedirs("models", exist_ok=True)
    np.random.seed(42)

    # Synthetic training set: [days_in_stage, sla_days, deficiency_count, intake_requested, age_days]
    n_samples = 2000
    days_in_stage = np.random.uniform(1, 25, n_samples)
    sla_days = np.random.choice([5, 7, 10, 15], n_samples)
    deficiency_count = np.random.poisson(0.7, n_samples)
    intake_requested = np.random.choice([60, 120, 180, 240, 300], n_samples)
    age_days = np.random.uniform(5, 90, n_samples)

    X = np.column_stack([days_in_stage, sla_days, deficiency_count, intake_requested, age_days])
    
    # Ground truth probability of SLA breach
    linear_risk = (days_in_stage / sla_days) * 0.7 + (deficiency_count * 0.15) + (intake_requested / 1000.0)
    y_prob = 1 / (1 + np.exp(-(linear_risk - 1.0)))
    y = (y_prob > 0.5).astype(int)

    clf = GradientBoostingClassifier(n_estimators=50, max_depth=3, random_state=42)
    clf.fit(X, y)

    target_path = os.path.join("models", "delay_model.joblib")
    joblib.dump(clf, target_path)
    print(f"[SUCCESS] Trained delay model exported to {target_path}")

if __name__ == "__main__":
    train_and_export_model()
