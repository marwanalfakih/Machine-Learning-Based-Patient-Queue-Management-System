# ai_python/models/predictor.py
import json
import os
import numpy as np
import joblib
from datetime import datetime

class AIPredictor:
    def __init__(self, models_dir='ai_python/saved_models'):
        self.models_dir = models_dir
        self.model = None
        self.metrics = {}
        self.is_loaded = False
        
    def load_model(self):
        """تحميل النموذج المدرب"""
        model_path = os.path.join(self.models_dir, 'tabpfn_queue.pkl')
        metrics_path = os.path.join(self.models_dir, 'metrics.json')
        
        # ✅ التحقق من وجود الملف
        if not os.path.exists(model_path):
            print(f"❌ Model not found at: {model_path}")
            print("   Please run 'python models/train.py' first!")
            return False
        
        try:
            self.model = joblib.load(model_path)
            self.is_loaded = True
            print(f"✅ Loaded model from: {model_path}")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            return False
        
        if os.path.exists(metrics_path):
            with open(metrics_path, 'r') as f:
                self.metrics = json.load(f)
            print(f"✅ Loaded metrics - Accuracy: {self.metrics.get('accuracy', 'N/A')}%")
        
        return True
    
    def predict(self, patients_ahead, total_patients, doctor_experience,
                distance_km, eta_minutes, current_hour=None, current_day=None):
        """التنبؤ بوقت الانتظار"""
        
        # ✅ التحقق من تحميل النموذج أولاً
        if self.model is None:
            print("❌ Model not loaded! Call load_model() first.")
            return {
                'success': False, 
                'error': 'Model not loaded. Please train the model first.'
            }
        
        if not self.is_loaded:
            print("❌ Model not loaded properly!")
            return {
                'success': False, 
                'error': 'Model not loaded properly.'
            }
        
        try:
            if current_hour is None:
                current_hour = datetime.now().hour
            if current_day is None:
                current_day = datetime.now().weekday()
            
            is_weekend = 1.0 if current_day >= 5 else 0.0
            is_peak_morning = 1.0 if 9 <= current_hour <= 11 else 0.0
            is_peak_evening = 1.0 if 15 <= current_hour <= 17 else 0.0
            
            # ✅ بناء الميزات
            features = np.array([[
                float(current_hour),
                float(current_day),
                float(is_weekend),
                float(is_peak_morning),
                float(is_peak_evening),
                float(patients_ahead),
                float(total_patients),
                float(doctor_experience),
                float(distance_km),
                float(eta_minutes),
                40.0  # speed_kmh
            ]])
            
            # ✅ التنبؤ
            clinic_wait = self.model.predict(features)[0]
            total_wait = clinic_wait + eta_minutes
            
            return {
                'success': True,
                'predicted_time': round(float(total_wait), 1),
                'clinic_wait_time': round(float(clinic_wait), 1),
                'model_accuracy': self.metrics.get('accuracy', 85)
            }
            
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_info(self):
        """معلومات عن النموذج"""
        return {
            'is_loaded': self.is_loaded,
            'metrics': self.metrics,
            'model_type': 'TabPFN'
        }


# ✅ للاختبار
if __name__ == '__main__':
    print("\n" + "="*50)
    print("🧪 Testing QueuePredictor")
    print("="*50)
    
    predictor = AIPredictor()
    
    if predictor.load_model():
        print("\n✅ Model loaded successfully!")
        
        # اختبار التنبؤ
        result = predictor.predict(
            patients_ahead=4,
            total_patients=15,
            doctor_experience=10,
            distance_km=5.2,
            eta_minutes=12
        )
        
        if result['success']:
            print(f"\n📊 Test Prediction:")
            print(f"   Predicted time: {result['predicted_time']} minutes")
            print(f"   Clinic wait: {result['clinic_wait_time']} minutes")
            print(f"   Model accuracy: {result['model_accuracy']}%")
        else:
            print(f"\n❌ Prediction failed: {result.get('error')}")
    else:
        print("\n❌ Failed to load model!")
        print("   Please run: python models/train.py")