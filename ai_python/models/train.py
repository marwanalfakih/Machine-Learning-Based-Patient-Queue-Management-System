# ai_python/models/train.py
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
import joblib
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import os
import sys
import json

# إضافة المسار
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# استيراد مولد البيانات
try:
    from data.generate_data import SyntheticDataGenerator
    HAS_GENERATOR = True
    print("✅ Successfully imported SyntheticDataGenerator")
except ImportError as e:
    HAS_GENERATOR = False
    print(f"⚠️ Could not import SyntheticDataGenerator: {e}")

class ModelTrainer:
    """فئة موحدة لتدريب جميع نماذج AI"""
    
    def __init__(self):
        self.models = {}
        self.metrics = {}
        self.feature_names = [
            'hour', 'day_of_week', 'is_weekend', 
            'is_peak_morning', 'is_peak_evening',
            'queue_position', 'total_patients', 
            'doctor_experience'
        ]
        self.save_dir = 'saved_models'
        
    def load_data(self):
        """تحميل أو توليد البيانات باستخدام SyntheticDataGenerator"""
        data_path = 'data/synthetic_data.csv'
        
        # إذا كان الملف موجوداً، استخدمه
        if os.path.exists(data_path):
            print(f"✅ Loading existing data from {data_path}")
            df = pd.read_csv(data_path)
            print(f"   Loaded {len(df)} records")
        else:
            # إذا لم يكن الملف موجوداً، استخدم المولد
            if HAS_GENERATOR:
                print(f"📊 Generating new synthetic data...")
                generator = SyntheticDataGenerator()
                df = generator.generate(10000)
                print(f"✅ Generated {len(df)} records")
            else:
                # إذا لم يكن المولد موجوداً، استخدم المولد الداخلي البسيط
                print(f"⚠️ Using internal simple data generator")
                df = self._generate_simple_data(5000)
        
        # التحقق من وجود جميع الأعمدة المطلوبة
        missing_cols = [col for col in self.feature_names if col not in df.columns]
        if missing_cols:
            print(f"⚠️ Missing columns: {missing_cols}")
            # إضافة الأعمدة المفقودة بقيم افتراضية
            for col in missing_cols:
                df[col] = 0
        
        # تجهيز الميزات
        X = df[self.feature_names]
        y = df['waiting_time'] if 'waiting_time' in df.columns else df.get('waiting_time', df.get('wait_time', None))
        
        if y is None:
            raise ValueError("No target column (waiting_time) found in data")
        
        # تقسيم البيانات
        X_train, X_temp, y_train, y_temp = train_test_split(
            X, y, test_size=0.3, random_state=42
        )
        X_val, X_test, y_val, y_test = train_test_split(
            X_temp, y_temp, test_size=0.5, random_state=42
        )
        
        print(f"\n📊 Data split:")
        print(f"  Training: {len(X_train)} samples")
        print(f"  Validation: {len(X_val)} samples")
        print(f"  Testing: {len(X_test)} samples")
        
        return X_train, X_val, X_test, y_train, y_val, y_test
    
    def _generate_simple_data(self, num_samples=5000):
        """مولد بيانات بسيط احتياطي (إذا لم يكن المولد الأصلي متاحاً)"""
        print(f"📊 Generating {num_samples} simple synthetic samples...")
        
        np.random.seed(42)
        data = []
        
        for i in range(num_samples):
            hour = np.random.randint(8, 20)
            day = np.random.randint(0, 7)
            position = np.random.randint(1, 20)
            total = position + np.random.randint(5, 15)
            exp = np.random.randint(1, 20)
            
            is_weekend = 1 if day >= 5 else 0
            is_peak_morning = 1 if 9 <= hour <= 11 else 0
            is_peak_evening = 1 if 15 <= hour <= 17 else 0
            
            # حساب وقت الانتظار
            base = 15 * position
            if is_peak_morning or is_peak_evening:
                base *= 1.3
            if is_weekend:
                base *= 0.8
            if day == 4:  # الخميس
                base *= 1.2
            
            waiting_time = base + np.random.normal(0, 5)
            waiting_time = max(5, waiting_time)
            
            data.append({
                'hour': hour,
                'day_of_week': day,
                'is_weekend': is_weekend,
                'is_peak_morning': is_peak_morning,
                'is_peak_evening': is_peak_evening,
                'queue_position': position,
                'total_patients': total,
                'doctor_experience': exp,
                'waiting_time': waiting_time
            })
        
        df = pd.DataFrame(data)
        
        # حفظ البيانات
        os.makedirs('data', exist_ok=True)
        df.to_csv('data/synthetic_data.csv', index=False)
        print(f"✅ Saved simple data to data/synthetic_data.csv")
        
        return df
    
    def train_linear(self, X_train, y_train):
        """تدريب نموذج Linear Regression"""
        print("\n" + "="*40)
        print("🧮 Training Linear Regression...")
        
        model = LinearRegression()
        model.fit(X_train, y_train)
        
        self.models['linear'] = model
        print("✅ Linear Regression trained")
        return model
    
    def train_random_forest(self, X_train, y_train):
        """تدريب نموذج Random Forest"""
        print("\n" + "="*40)
        print("🌲 Training Random Forest...")
        
        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            random_state=42,
            n_jobs=-1,
            verbose=0
        )
        model.fit(X_train, y_train)
        
        self.models['random_forest'] = model
        print("✅ Random Forest trained")
        
        # أهمية الميزات
        importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\n📈 Feature Importance:")
        for _, row in importance.head(5).iterrows():
            print(f"  {row['feature']}: {row['importance']:.3f}")
        
        return model
    
    def train_neural_network(self, X_train, y_train, X_val, y_val):
        """تدريب نموذج Neural Network"""
        print("\n" + "="*40)
        print("🧠 Training Neural Network...")
        
        model = keras.Sequential([
            layers.Dense(64, activation='relu', input_shape=[X_train.shape[1]]),
            layers.Dropout(0.2),
            layers.Dense(32, activation='relu'),
            layers.Dropout(0.2),
            layers.Dense(16, activation='relu'),
            layers.Dense(1)
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )
        
        early_stop = keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        )
        
        history = model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=100,
            batch_size=32,
            callbacks=[early_stop],
            verbose=0
        )
        
        self.models['neural_network'] = model
        print(f"✅ Neural Network trained ({len(history.history['loss'])} epochs)")
        
        return model, history
    
    def evaluate_models(self, X_test, y_test):
        """تقييم جميع النماذج"""
        print("\n" + "="*50)
        print("📊 MODEL EVALUATION RESULTS")
        print("="*50)
        
        results = {}
        y_mean = y_test.mean()
        
        # تحويل إلى numpy
        if hasattr(y_test, 'values'):
            y_test_array = y_test.values
        else:
            y_test_array = np.array(y_test)
        
        for name, model in self.models.items():
            # تنبؤ
            y_pred = model.predict(X_test)
            
            if hasattr(y_pred, 'numpy'):
                y_pred_array = y_pred.numpy().flatten()
            else:
                y_pred_array = np.array(y_pred).flatten()
            
            # مقاييس
            mae = mean_absolute_error(y_test_array, y_pred_array)
            rmse = np.sqrt(mean_squared_error(y_test_array, y_pred_array))
            r2 = r2_score(y_test_array, y_pred_array)
            accuracy = 100 - (mae / y_mean * 100)
            
            results[name] = {
                'mae': round(float(mae), 2),
                'rmse': round(float(rmse), 2),
                'r2': round(float(r2), 3),
                'accuracy': round(float(accuracy), 1)
            }
            
            print(f"\n{name.upper()}:")
            print(f"  MAE: {mae:.2f} minutes")
            print(f"  RMSE: {rmse:.2f} minutes")
            print(f"  R²: {r2:.3f}")
            print(f"  Accuracy: {accuracy:.1f}%")
        
        self.metrics = results
        return results
    
    def save_models(self):
        """حفظ جميع النماذج"""
        os.makedirs(self.save_dir, exist_ok=True)
        print(f"\n💾 Saving models to {self.save_dir}/")
        
        for name, model in self.models.items():
            if name == 'linear':
                path = f'{self.save_dir}/linear.pkl'
                joblib.dump(model, path)
                print(f"  ✅ Saved linear.pkl")
            
            elif name == 'random_forest':
                path = f'{self.save_dir}/random_forest.pkl'
                joblib.dump(model, path)
                print(f"  ✅ Saved random_forest.pkl")
            
            elif name == 'neural_network':
                path = f'{self.save_dir}/neural_network.h5'
                model.save(path)
                print(f"  ✅ Saved neural_network.h5")
        
        # حفظ metrics
        metrics_path = f'{self.save_dir}/metrics.json'
        with open(metrics_path, 'w') as f:
            json.dump(self.metrics, f, indent=2)
        print(f"  ✅ Saved metrics.json")
    
    def run_training(self):
        """تشغيل التدريب الكامل"""
        print("\n" + "="*60)
        print("🚀 AI MODEL TRAINING PIPELINE")
        print("="*60)
        
        # تحميل البيانات
        X_train, X_val, X_test, y_train, y_val, y_test = self.load_data()
        
        # تدريب النماذج
        self.train_linear(X_train, y_train)
        self.train_random_forest(X_train, y_train)
        self.train_neural_network(X_train, y_train, X_val, y_val)
        
        # تقييم
        results = self.evaluate_models(X_test, y_test)
        
        # حفظ
        self.save_models()
        
        # النموذج الأفضل
        best_model = max(results.items(), key=lambda x: x[1]['accuracy'])
        print("\n" + "="*50)
        print(f"🏆 BEST MODEL: {best_model[0].upper()}")
        print(f"   Accuracy: {best_model[1]['accuracy']}%")
        print(f"   MAE: {best_model[1]['mae']} minutes")
        print("="*50)
        
        return results

if __name__ == '__main__':
    trainer = ModelTrainer()
    trainer.run_training()