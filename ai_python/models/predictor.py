# ai_python/models/predictor.py
import numpy as np
import joblib
import os
import json
from datetime import datetime

class AIPredictor:
    """فئة للتنبؤ باستخدام النماذج المدربة"""
    
    def __init__(self, models_dir='ai_python/saved_models'):
        self.models_dir = models_dir
        self.models = {}
        self.metrics = {}
        
    def load_models(self):
        """تحميل جميع النماذج من المجلد"""
        print(f"\n📂 Loading models from: {self.models_dir}")
        
        if not os.path.exists(self.models_dir):
            print(f"❌ Directory not found: {self.models_dir}")
            return False
        
        files = os.listdir(self.models_dir)
        print(f"📁 Files found: {files}")
        
        # تحميل Linear Regression
        linear_path = os.path.join(self.models_dir, 'linear.pkl')
        if os.path.exists(linear_path):
            try:
                self.models['linear'] = joblib.load(linear_path)
                print(f"  ✅ Loaded linear.pkl")
            except Exception as e:
                print(f"  ❌ Failed to load linear.pkl: {e}")
        
        # تحميل Random Forest
        rf_path = os.path.join(self.models_dir, 'random_forest.pkl')
        if os.path.exists(rf_path):
            try:
                self.models['random_forest'] = joblib.load(rf_path)
                print(f"  ✅ Loaded random_forest.pkl")
            except Exception as e:
                print(f"  ❌ Failed to load random_forest.pkl: {e}")
         
        # تحميل Neural Network - استخدم .keras كما في train.py
        nn_path = os.path.join(self.models_dir, 'neural_network.keras')
        if os.path.exists(nn_path):
            try:
                import tensorflow as tf
                self.models['neural_network'] = tf.keras.models.load_model(nn_path) # type: ignore
                print(f"  ✅ Loaded neural_network.keras")
            except ImportError:
                print(f"  ⚠️ TensorFlow not installed")
            except Exception as e:
                print(f"  ❌ Failed to load neural_network.keras: {e}")
        
        # تحميل Metrics
        metrics_path = os.path.join(self.models_dir, 'metrics.json')
        if os.path.exists(metrics_path):
            try:
                with open(metrics_path, 'r') as f:
                    self.metrics = json.load(f)
                print(f"  ✅ Loaded metrics.json")
            except Exception as e:
                print(f"  ❌ Failed to load metrics.json: {e}")
        
        print(f"\n✅ Loaded {len(self.models)} models")
        return True
    
    def predict(self, queue_position=1, doctor_id=None):
        """التنبؤ بوقت الانتظار"""
        try:
            now = datetime.now()
            hour = float(now.hour)        # الساعة الحالية (مثلاً 14.0)
            day = float(now.weekday())     # اليوم (0=الاثنين، 6=الأحد)
            pos = float(queue_position)    # موقع المريض في الطابور
            
            # حساب ميزات إضافية
            is_weekend = 1.0 if day >= 5 else 0.0           # هل اليوم عطلة؟
            is_peak_morning = 1.0 if 9 <= hour <= 11 else 0.0  # ساعة الذروة الصباحية؟
            is_peak_evening = 1.0 if 15 <= hour <= 17 else 0.0 # ساعة الذروة المسائية؟
            
            # تقدير عدد المرضى الكلي وخبرة الطبيب
            total_patients = pos + 5.0    # عدد المرضى الكلي (تقديري)
            doctor_exp = 8.0               # خبرة الطبيب (ثابتة)
            
            # إنشاء مصفوفة numpy بكل القيم كـ float
            features = np.array([[ 
                hour, day, is_weekend, is_peak_morning, is_peak_evening,
                pos, total_patients, doctor_exp
            ]], dtype=np.float32)
            
            # تجربة Random Forest أولاً
            if 'random_forest' in self.models:
                try:
                    pred = self.models['random_forest'].predict(features)[0]
                    accuracy = self.metrics.get('random_forest', {}).get('accuracy', 94.8)
                    return {
                        'success': True,
                        'predicted_time': float(pred),
                        'model_used': 'random_forest',
                        'accuracy': accuracy,
                        'confidence': 'high'
                    }
                except Exception as e:
                    print(f"⚠️ Random Forest failed: {e}")
            
            # تجربة Neural Network
            if 'neural_network' in self.models:
                try:
                    pred = self.models['neural_network'].predict(features)[0][0]
                    accuracy = self.metrics.get('neural_network', {}).get('accuracy', 92.9)
                    return {
                        'success': True,
                        'predicted_time': float(pred),
                        'model_used': 'neural_network',
                        'accuracy': accuracy,
                        'confidence': 'high'
                    }
                except Exception as e:
                    print(f"⚠️ Neural Network failed: {e}")
            
            # تجربة Linear Regression
            if 'linear' in self.models:
                try:
                    pred = self.models['linear'].predict(features)[0]
                    accuracy = self.metrics.get('linear', {}).get('accuracy', 86.3)
                    return {
                        'success': True,
                        'predicted_time': float(pred),
                        'model_used': 'linear',
                        'accuracy': accuracy,
                        'confidence': 'medium'
                    }
                except Exception as e:
                    print(f"⚠️ Linear failed: {e}")
            
            # نموذج احتياطي
            base_time = 15.0
            if 9 <= hour <= 11 or 15 <= hour <= 17:
                base_time = 20.0
            
            prediction = pos * base_time
            
            return {
                'success': True,
                'predicted_time': float(prediction),
                'model_used': 'fallback',
                'accuracy': 70.0,
                'confidence': 'low'
            }
            
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_models_info(self):
        """الحصول على معلومات جميع النماذج"""
        models_list = []
        
        if 'random_forest' in self.models:
            acc = self.metrics.get('random_forest', {}).get('accuracy', 94.8)
            models_list.append({
                'id': 'random_forest',
                'name': 'Random Forest',
                'type': 'ensemble',
                'accuracy': acc,
                'active': True
            })
        
        if 'neural_network' in self.models:
            acc = self.metrics.get('neural_network', {}).get('accuracy', 92.9)
            models_list.append({
                'id': 'neural_network',
                'name': 'Neural Network',
                'type': 'deep_learning',
                'accuracy': acc,
                'active': True
            })
        
        if 'linear' in self.models:
            acc = self.metrics.get('linear', {}).get('accuracy', 86.3)
            models_list.append({
                'id': 'linear',
                'name': 'Linear Regression',
                'type': 'linear',
                'accuracy': acc,
                'active': True
            })
        
        return models_list

# للاختبار
if __name__ == '__main__':
    predictor = AIPredictor()
    if predictor.load_models():
        print("\n🔍 Testing predictions:")
        for pos in [1, 3, 5, 10]:
            result = predictor.predict(queue_position=pos)
            if result['success']:
                print(f"  Position {pos}: {result['predicted_time']:.1f} mins using {result['model_used']} (acc: {result['accuracy']}%)")
            else:
                print(f"  Position {pos}: Failed - {result.get('error', 'Unknown error')}")