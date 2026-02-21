# ai_python/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
import joblib
import os
from datetime import datetime, timedelta
import logging

# إعداد التسجيل
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# ========== استيراد predictor المحسن ==========
# from models.predictor import WaitingTimePredictor
from models.predictor import AIPredictor

class Config:
    MODEL_PATH = os.path.join(os.path.dirname(__file__), 'saved_models')

config = Config()
# predictor = WaitingTimePredictor(config)
predictor = AIPredictor(models_dir='saved_models')
predictor.load_models()

@app.route('/api/predict', methods=['POST'])
def predict():
    """التنبؤ بوقت الانتظار"""
    try:
        data = request.json
        position = data.get('queuePosition', 1)
        doctor_id = data.get('doctorID')
        
        # تجهيز الخصائص (مبسط)
        now = datetime.now()
        features = pd.DataFrame({
            'hour': [now.hour],
            'day_of_week': [now.weekday()],
            'is_weekend': [1 if now.weekday() >= 5 else 0],
            'is_peak_morning': [1 if 9 <= now.hour <= 11 else 0],
            'is_peak_evening': [1 if 15 <= now.hour <= 17 else 0],
            'queue_position': [position],
            'total_patients': [position + 5],
            'doctor_experience': [8],
            'hour_sin': [np.sin(2 * np.pi * now.hour / 24)],
            'hour_cos': [np.cos(2 * np.pi * now.hour / 24)],
            'dow_sin': [np.sin(2 * np.pi * now.weekday() / 7)],
            'dow_cos': [np.cos(2 * np.pi * now.weekday() / 7)]
        })
        
        # التنبؤ
        prediction, model_name, accuracy = predictor.predict(features)
        
        # مستوى الثقة
        if accuracy > 90:
            confidence = 'high'
        elif accuracy > 80:
            confidence = 'medium'
        else:
            confidence = 'low'
        
        return jsonify({
            'success': True,
            'predictedWaitTime': round(prediction, 1),
            'confidence': confidence,
            'model': {
                'name': model_name,
                'accuracy': accuracy
            }
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/congestion', methods=['GET'])
def predict_congestion():
    """التنبؤ بالازدحام"""
    try:
        hours = int(request.args.get('hours', 6))
        predictions = []
        
        current_hour = datetime.now().hour
        current_day = datetime.now().weekday()
        
        for i in range(hours):
            target_hour = (current_hour + i) % 24
            target_day = current_day
            
            # تعديل اليوم إذا تعدى منتصف الليل
            if current_hour + i >= 24:
                target_day = (current_day + 1) % 7
            
            # تنبؤ معقول
            if 9 <= target_hour <= 11 or 15 <= target_hour <= 17:
                if target_day < 5:  # أيام العمل
                    predicted_patients = np.random.randint(15, 25)
                    predicted_wait = np.random.randint(20, 35)
                    level = 'High'
                else:  # نهاية الأسبوع
                    predicted_patients = np.random.randint(8, 15)
                    predicted_wait = np.random.randint(15, 25)
                    level = 'Medium'
            else:
                predicted_patients = np.random.randint(5, 12)
                predicted_wait = np.random.randint(10, 20)
                level = 'Low'
            
            predictions.append({
                'hour': target_hour,
                'day': target_day,
                'day_name': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][target_day],
                'predictedPatients': predicted_patients,
                'predictedWaitTime': predicted_wait,
                'congestionLevel': level,
                'timestamp': (datetime.now() + timedelta(hours=i)).isoformat()
            })
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'model_used': 'statistical'
        })
        
    except Exception as e:
        logger.error(f"Congestion prediction error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models', methods=['GET'])
def get_models():
    """الحصول على معلومات النماذج"""
    models_list = predictor.get_model_info()
    
    return jsonify({
        'success': True,
        'models': models_list,
        'total': len(models_list)
    })

@app.route('/api/health', methods=['GET'])
def health():
    """فحص صحة الخدمة"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': len(predictor.get_model_info()),
        'models': [m['name'] for m in predictor.get_model_info()],
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)