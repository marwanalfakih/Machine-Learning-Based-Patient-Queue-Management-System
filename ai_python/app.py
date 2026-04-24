# ai_python/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# ========== استيراد النموذج ==========
from models.predictor import AIPredictor

# ✅ إنشاء وتحميل النموذج
predictor = AIPredictor()
model_loaded = predictor.load_model()

if not model_loaded:
    logger.warning("⚠️ Model not loaded! Predictions will use fallback only.")

# ========== ENDPOINT: التنبؤ ==========
@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        logger.info(f"📊 Prediction request: {data}")
        
        # استخراج البيانات
        distance_km = float(data.get('distance_km', 0))
        eta_minutes = float(data.get('eta_minutes', 0))
        total_patients = int(data.get('total_patients', 1))
        patients_ahead = int(data.get('patients_ahead', 0))
        doctor_experience = int(data.get('doctor_experience', 5))
        
        current_hour = datetime.now().hour
        current_day = datetime.now().weekday()
        
        # ✅ استخدام النموذج إذا كان محملاً
        if predictor.is_loaded and predictor.model is not None:
            result = predictor.predict(
                patients_ahead=patients_ahead,
                total_patients=total_patients,
                doctor_experience=doctor_experience,
                distance_km=distance_km,
                eta_minutes=eta_minutes,
                current_hour=current_hour,
                current_day=current_day
            )
            
            if result['success']:
                return jsonify({
                    'success': True,
                    'predictedWaitTime': result['predicted_time'],
                    'clinicWaitTime': result['clinic_wait_time'],
                    'confidence': 'high',
                    'accuracy': result.get('model_accuracy', 85)
                })
        
        # ✅ Fallback (إذا فشل النموذج)
        is_peak = 1 if (9 <= current_hour <= 11 or 15 <= current_hour <= 17) else 0
        base = 20 if is_peak else 15
        clinic_wait = patients_ahead * base
        total_wait = clinic_wait + eta_minutes
        
        return jsonify({
            'success': True,
            'predictedWaitTime': round(total_wait, 1),
            'clinicWaitTime': round(clinic_wait, 1),
            'confidence': 'medium',
            'accuracy': 70
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': predictor.is_loaded,
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 AI Prediction Service")
    print("="*50)
    print(f"Model loaded: {predictor.is_loaded}")
    if predictor.is_loaded and predictor.metrics:
        print(f"Model accuracy: {predictor.metrics.get('accuracy', 'N/A')}%")
    print("Server: http://localhost:5001")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=5001, debug=True)