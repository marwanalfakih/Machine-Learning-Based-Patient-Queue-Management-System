# ai_python/app.py
# ai_python/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS 
import numpy as np
from datetime import datetime, timedelta
import logging
import os

# إعداد التسجيل
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# ========== استيراد predictor ==========
from models.predictor import AIPredictor  # ✅ المسار الصحيح

predictor = AIPredictor(models_dir='ai_python/saved_models')
predictor.load_models()

@app.route('/api/predict', methods=['POST'])
def predict():
    """التنبؤ بوقت الانتظار"""
    try:
        data = request.json
        position = int(data.get('queuePosition', 1))  # ✅ استخدام int
        doctor_id = data.get('doctorID')
        
        # ✅ استخدام الدالة بشكل صحيح
        result = predictor.predict(queue_position=position, doctor_id=doctor_id)
        
        if not result['success']:
            return jsonify({'success': False, 'error': result.get('error', 'Prediction failed')}), 500
        
        return jsonify({
            'success': True,
            'predictedWaitTime': round(result['predicted_time'], 1),
            'confidence': result['confidence'],
            'model': {
                'name': result['model_used'],
                'accuracy': result['accuracy']
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
    models_list = predictor.get_models_info()  # ✅ اسم الدالة الصحيح
    
    return jsonify({
        'success': True,
        'models': models_list,
        'total': len(models_list)
    })

@app.route('/api/health', methods=['GET'])
def health():
    """فحص صحة الخدمة"""
    models_info = predictor.get_models_info()
    return jsonify({
        'status': 'healthy',
        'models_loaded': len(models_info),
        'models': [m['name'] for m in models_info],
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)