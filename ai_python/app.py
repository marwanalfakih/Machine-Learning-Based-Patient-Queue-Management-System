# ai_python/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime
import logging

from models.predictor import AIPredictor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# تهيئة المتنبئ
predictor = AIPredictor(models_dir='saved_models')
predictor.load_models()

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': predictor.model is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.json or {}
        position = int(data.get('queuePosition', 1))
        
        result = predictor.predict(queue_position=position)
        
        if result['success']:
            return jsonify({
                'success': True,
                'predictedWaitTime': round(result['predicted_time'], 1),
                'confidence': result['confidence'],
                'model': {
                    'name': result['model_used'],
                    'accuracy': result['accuracy']
                }
            })
        else:
            return jsonify({'success': False, 'error': 'Prediction failed'}), 500
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models', methods=['GET'])
def get_models():
    models = predictor.get_models_info()
    return jsonify({'success': True, 'models': models})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)