# ai_python/models/train.py

import os
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from tabpfn_client import TabPFNRegressor, set_access_token
import joblib

# =========================
# CONFIGURATION
# =========================
API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYmNmNDc5NGUtZmY0ZS00NWI4LTk1MzItZTc3YmU0YjA0MTExIiwiZXhwIjoxODA3ODM0MTM4fQ.WwSMPbSdmvE55TeyiTIPBR9XeMzV-cIr2C36-SOvBAE"

DATA_PATH = "ai_python/data/synthetic_data.csv"
SAVE_DIR = "ai_python/saved_models"

# ✅ الميزات الصحيحة (نستخدم queue_position ثم نحسب patients_ahead داخل الكود)
FEATURES = [
    'hour',              # الساعة الحالية (0-23)
    'day_of_week',       # اليوم (0=Monday, 6=Sunday)
    'is_weekend',        # هل هو عطلة نهاية الأسبوع؟
    'is_peak_morning',   # ساعة الذروة الصباحية (9-11)
    'is_peak_evening',   # ساعة الذروة المسائية (15-17)
    'queue_position',    # موقع المريض في قائمة الانتظار (1,2,3...)
    'total_patients',    # إجمالي المرضى في queue
    'doctor_experience', # خبرة الدكتور بالسنوات
    'distance_km',       # المسافة من المستشفى (كم) - من GPS
    'eta_minutes',       # وقت الوصول المتوقع (دقائق) - من GPS
    'speed_kmh'          # السرعة (كم/ساعة) - من GPS
]

TARGET = "waiting_time"

os.makedirs(SAVE_DIR, exist_ok=True)

# =========================
# AUTHENTICATION
# =========================
print("🔐 Authenticating with TabPFN Cloud...")
set_access_token(API_TOKEN)
print("✅ Authentication successful!")

# =========================
# LOAD DATA
# =========================
print(f"\n📂 Loading data from: {DATA_PATH}")
df = pd.read_csv(DATA_PATH)

# ✅ إضافة عمود patients_ahead (محسوب من queue_position)
df['patients_ahead'] = df['queue_position'] - 1
print(f"✅ Added 'patients_ahead' column (calculated from queue_position)")

# التحقق من وجود جميع الأعمدة المطلوبة
missing_cols = [c for c in FEATURES if c not in df.columns]
if missing_cols:
    raise ValueError(f"Missing columns: {missing_cols}")

print(f"✅ Loaded {len(df)} records")
print(f"📊 Features: {FEATURES}")
print(f"📊 Added feature: patients_ahead = queue_position - 1")
print(f"🎯 Target: {TARGET}")

# عرض عينة من البيانات
print("\n📋 Sample data:")
print(df[FEATURES + ['patients_ahead', TARGET]].head(10))

# =========================
# PREPARE DATA
# =========================
# ✅ نستخدم patients_ahead بدلاً من queue_position للتدريب
X = df[['hour', 'day_of_week', 'is_weekend', 'is_peak_morning', 'is_peak_evening',
        'patients_ahead', 'total_patients', 'doctor_experience',
        'distance_km', 'eta_minutes', 'speed_kmh']].values

y = df[TARGET].values

# تقسيم البيانات
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42
)

print(f"\n📊 Data split:")
print(f"   Training: {len(X_train)} samples")
print(f"   Testing: {len(X_test)} samples")
print(f"   Features shape: {X_train.shape}")

# =========================
# TRAIN TABPFN MODEL
# =========================
print("\n🧠 Training TabPFN Regressor...")
model = TabPFNRegressor()
model.fit(X_train, y_train)
print("✅ Model training completed!")

# =========================
# EVALUATE MODEL
# =========================
print("\n📈 Evaluating model on test data...")
y_pred = model.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(np.mean((y_test - y_pred) ** 2))
r2 = r2_score(y_test, y_pred)
accuracy = 100 - (mae / y_test.mean() * 100)

metrics = {
    "model": "tabpfn",
    "mae": round(float(mae), 2),
    "rmse": round(float(rmse), 2),
    "r2": round(float(r2), 3),
    "accuracy": round(float(accuracy), 1),
    "samples": len(X_train),
    "features_used": ['hour', 'day_of_week', 'is_weekend', 'is_peak_morning', 
                      'is_peak_evening', 'patients_ahead', 'total_patients',
                      'doctor_experience', 'distance_km', 'eta_minutes', 'speed_kmh']
}

print(f"\n📊 Model Performance:")
print(f"   MAE: {metrics['mae']} minutes")
print(f"   RMSE: {metrics['rmse']} minutes")
print(f"   R²: {metrics['r2']}")
print(f"   Accuracy: {metrics['accuracy']}%")

# =========================
# SAVE MODEL & METADATA
# =========================
print(f"\n💾 Saving model to: {SAVE_DIR}")

# حفظ النموذج
model_path = os.path.join(SAVE_DIR, 'tabpfn_queue.pkl')
joblib.dump(model, model_path)
print(f"   ✅ Saved: tabpfn_queue.pkl")

# ✅ حفظ أسماء الميزات (مع patients_ahead)
features_list = ['hour', 'day_of_week', 'is_weekend', 'is_peak_morning', 
                 'is_peak_evening', 'patients_ahead', 'total_patients',
                 'doctor_experience', 'distance_km', 'eta_minutes', 'speed_kmh']

features_path = os.path.join(SAVE_DIR, 'features.json')
with open(features_path, 'w') as f:
    json.dump(features_list, f, indent=2)
print(f"   ✅ Saved: features.json (with patients_ahead)")

# حفظ مقاييس الأداء
metrics_path = os.path.join(SAVE_DIR, 'metrics.json')
with open(metrics_path, 'w') as f:
    json.dump(metrics, f, indent=2)
print(f"   ✅ Saved: metrics.json")

print("\n" + "="*50)
print("🎉 TRAINING COMPLETED SUCCESSFULLY!")
print("="*50)
print(f"Model ready for production at: {model_path}")