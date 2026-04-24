# use this link rather than this code for training , zou should upload zour dataset 
# https://ux.priorlabs.ai/playground?_gl=1*504nqv*_ga*MTU4OTE1MTIxNy4xNzc2MjkzMTkz*_ga_9VZ68NQKPM*czE3NzYyOTg1NjIkbzIkZzEkdDE3NzYyOTg3ODAkajU4JGwwJGgw
# ai_python/models/train_suggestion.py

# install: pip install tabpfn-client scikit-learn pandas joblib flask flask-cors
# ai_python/models/train_suggestion_tabpfn_client.py
import tabpfn_client
from tabpfn_client import TabPFNClassifier, set_access_token
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import pandas as pd
import numpy as np
import joblib
import os

# ========== 1. المصادقة ==========
API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYmNmNDc5NGUtZmY0ZS00NWI4LTk1MzItZTc3YmU0YjA0MTExIiwiZXhwIjoxODA3ODM0MTM4fQ.WwSMPbSdmvE55TeyiTIPBR9XeMzV-cIr2C36-SOvBAE"
set_access_token(API_TOKEN)
print("✅ TabPFN Client authenticated successfully!")

# ========== 2. تحميل أو توليد البيانات ==========
def load_or_generate_data():
    data_path = 'ai_python/data/time_slots_data.csv'
    
    if os.path.exists(data_path):
        print(f"📂 Loading existing data from {data_path}")
        df = pd.read_csv(data_path)
        print(f"✅ Loaded {len(df)} records")
    else:
        print("📊 Generating new training data...")
        # توليد بيانات بسيطة للتدريب
        np.random.seed(42)
        data = []
        for i in range(5000):
            hour = np.random.randint(8, 18)
            day_of_week = np.random.randint(0, 7)
            is_weekend = 1 if day_of_week >= 5 else 0
            is_thursday = 1 if day_of_week == 4 else 0
            is_morning_peak = 1 if 9 <= hour <= 11 else 0
            is_evening_peak = 1 if 15 <= hour <= 17 else 0
            is_lunch_time = 1 if hour == 12 else 0
            
            # حساب الجودة
            if is_thursday and (is_morning_peak or is_evening_peak):
                quality = 3  # Poor
            elif is_thursday:
                quality = 2  # Average
            elif is_weekend:
                quality = 0  # Excellent
            elif is_morning_peak or is_evening_peak:
                quality = 2  # Average
            else:
                quality = 1  # Good
            
            data.append({
                'hour': hour, 'day_of_week': day_of_week,
                'is_weekend': is_weekend, 'is_thursday': is_thursday,
                'is_morning_peak': is_morning_peak, 'is_evening_peak': is_evening_peak,
                'is_lunch_time': is_lunch_time, 'quality': quality
            })
        
        df = pd.DataFrame(data)
        os.makedirs('ai_python/data', exist_ok=True)
        df.to_csv(data_path, index=False)
        print(f"✅ Generated {len(df)} records")
    
    return df

# ========== 3. تدريب النموذج ==========
print("\n" + "="*50)
print("🧠 Training TabPFN Classifier (Cloud)")
print("="*50)

df = load_or_generate_data()
target_col = "quality"
feature_cols = ['hour', 'day_of_week', 'is_weekend', 'is_thursday',
                'is_morning_peak', 'is_evening_peak', 'is_lunch_time']

X = df[feature_cols]
y = df[target_col]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"📊 Training samples: {len(X_train)}")
print(f"📊 Testing samples: {len(X_test)}")

# تدريب النموذج
model = TabPFNClassifier()
model.fit(X_train, y_train)
print("✅ Model trained successfully!")

# ========== 4. التقييم ==========
predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)

print(f"\n📈 Model Performance:")
print(f"   Accuracy: {accuracy*100:.1f}%")
print(f"\n📋 Classification Report:")
print(classification_report(y_test, predictions, 
      target_names=['Excellent', 'Good', 'Average', 'Poor']))

# ========== 5. حفظ النموذج ==========
os.makedirs('ai_python/saved_models', exist_ok=True)
joblib.dump(model, 'ai_python/saved_models/tabpfn_suggestion_client.pkl')
print(f"\n💾 Model saved to: ai_python/saved_models/tabpfn_suggestion_client.pkl")

# ========== 6. دالة التنبؤ للاستخدام في API ==========
def predict_time_quality(hour, day_of_week, is_weekend, is_thursday,
                         is_morning_peak, is_evening_peak, is_lunch_time):
    """تنبؤ بجودة وقت الموعد"""
    features = pd.DataFrame([[
        hour, day_of_week, is_weekend, is_thursday,
        is_morning_peak, is_evening_peak, is_lunch_time
    ]], columns=feature_cols)
    
    quality = model.predict(features)[0]
    qualities = {0: 'Excellent', 1: 'Good', 2: 'Average', 3: 'Poor'}
    
    return {
        'quality_score': int(quality),
        'quality_label': qualities[quality],
        'is_recommended': quality <= 1  # Excellent or Good
    }

# ========== 7. اختبار النموذج ==========
print("\n" + "="*50)
print("🧪 Testing the model with examples:")
print("="*50)

test_cases = [
    (10, 4, 0, 1, 1, 0, 0),  # Thursday 10:00 → Poor
    (14, 5, 1, 0, 0, 0, 0),  # Saturday 14:00 → Excellent
    (9, 0, 0, 0, 1, 0, 0),   # Monday 09:00 → Average
    (13, 2, 0, 0, 0, 0, 1),  # Wednesday 13:00 → Good
]

days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

for hour, day, weekend, thursday, morning, evening, lunch in test_cases:
    result = predict_time_quality(hour, day, weekend, thursday, morning, evening, lunch)
    print(f"   {days[day]} {hour:02d}:00 → {result['quality_label']} (Recommended: {result['is_recommended']})")