# ai_python/data/generate_data.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os

class SyntheticDataGenerator:
    def __init__(self):
        self.data = None
        
    def generate(self, num_records=10000):
        """توليد بيانات محاكاة تشبه الواقع مع ميزات GPS"""
        
        print(f"Generating {num_records} synthetic records with GPS features...")
        np.random.seed(42)
        random.seed(42)
        
        data = []
        start_date = datetime(2024, 1, 1)
        
        # إحداثيات المستشفى (الطائف)
        hospital_lat, hospital_lng = 21.24545, 40.41980
        
        for i in range(num_records):
            # توليد تاريخ ووقت عشوائي
            days_offset = random.randint(0, 365)
            hour = random.randint(8, 20)
            
            current_date = start_date + timedelta(days=days_offset, hours=hour)
            
            # خصائص الوقت
            hour = current_date.hour
            day_of_week = current_date.weekday()
            is_weekend = 1 if day_of_week >= 5 else 0
            is_peak_morning = 1 if 9 <= hour <= 11 else 0
            is_peak_evening = 1 if 15 <= hour <= 17 else 0
            
            # ========== ميزات GPS ==========
            # توليد مسافة عشوائية (1-20 كم)
            distance_km = random.uniform(1, 20)
            
            # توليد وقت وصول بناءً على المسافة (سرعة 30-60 كم/ساعة)
            speed_kmh = random.uniform(30, 60)
            eta_minutes = (distance_km / speed_kmh) * 60
            
            # توليد إحداثيات عشوائية حول المستشفى
            lat_offset = (distance_km / 111) * random.uniform(-1, 1)
            lng_offset = (distance_km / 111) * random.uniform(-1, 1) / np.cos(np.radians(hospital_lat))
            patient_lat = hospital_lat + lat_offset
            patient_lng = hospital_lng + lng_offset
            
            # عدد المرضى الكلي يعتمد على الوقت والمسافة
            if is_peak_morning or is_peak_evening:
                if is_weekend:
                    total_patients = random.randint(8, 15)
                else:
                    total_patients = random.randint(15, 25)
            else:
                if is_weekend:
                    total_patients = random.randint(3, 8)
                else:
                    total_patients = random.randint(8, 15)
            
            # موقع المريض في قائمة الانتظار
            position = random.randint(1, total_patients)
            
            # بيانات الطبيب
            doctor_id = random.randint(1, 20)
            doctor_experience = random.randint(1, 20)
            
            # ========== حساب وقت الانتظار الفعلي (الهدف) ==========
            base_time = 15  # دقيقة لكل مريض
            
            # تأثير ساعات الذروة
            if is_peak_morning or is_peak_evening:
                base_time = base_time * 1.3
            
            # تأثير يوم الأسبوع
            if day_of_week == 4:  # الخميس
                base_time = base_time * 1.2
            elif is_weekend:
                base_time = base_time * 0.8
            
            # تأثير خبرة الطبيب
            doctor_factor = max(0.7, 1.0 - (doctor_experience * 0.015))
            base_time = base_time * doctor_factor
            
            # وقت العيادة = position * base_time
            clinic_wait = position * base_time
            
            # تأثير المسافة على وقت الانتظار (المرضى البعيدون قد يتأخرون)
            distance_penalty = 1 + (distance_km * 0.02)
            clinic_wait = clinic_wait * distance_penalty
            
            # الوقت الكلي = وقت العيادة + وقت الوصول
            total_wait = clinic_wait + eta_minutes + np.random.normal(0, 5)
            total_wait = max(5, total_wait)
            
            data.append({
                'record_id': i,
                'timestamp': current_date.isoformat(),
                'hour': hour,
                'day_of_week': day_of_week,
                'is_weekend': is_weekend,
                'is_peak_morning': is_peak_morning,
                'is_peak_evening': is_peak_evening,
                'queue_position': position,
                'total_patients': total_patients,
                'doctor_id': doctor_id,
                'doctor_experience': doctor_experience,
                # ميزات GPS الجديدة
                'distance_km': round(distance_km, 2),
                'eta_minutes': round(eta_minutes, 1),
                'speed_kmh': round(speed_kmh, 1),
                'patient_latitude': patient_lat,
                'patient_longitude': patient_lng,
                # المتغير المستهدف
                'waiting_time': round(total_wait, 1),
                'clinic_wait_time': round(clinic_wait, 1)
            })
        
        self.data = pd.DataFrame(data)
        
        # حفظ البيانات
        os.makedirs('ai_python/data', exist_ok=True)
        self.data.to_csv('ai_python/data/synthetic_data.csv', index=False)
        
        self.print_statistics()
        return self.data
    
    def print_statistics(self):
        """طباعة إحصائيات البيانات"""
        if self.data is None:
            return
        
        print("\n" + "="*50)
        print("SYNTHETIC DATA STATISTICS (with GPS)")
        print("="*50)
        print(f"Total records: {len(self.data)}")
        print(f"Features: {list(self.data.columns)}")
        print(f"\nWaiting Time Statistics:")
        print(f"  Mean: {self.data['waiting_time'].mean():.1f} minutes")
        print(f"  Std: {self.data['waiting_time'].std():.1f} minutes")
        print(f"  Min: {self.data['waiting_time'].min():.1f} minutes")
        print(f"  Max: {self.data['waiting_time'].max():.1f} minutes")
        
        print(f"\nGPS Statistics:")
        print(f"  Distance - Mean: {self.data['distance_km'].mean():.1f} km")
        print(f"  ETA - Mean: {self.data['eta_minutes'].mean():.1f} minutes")
        print(f"  Speed - Mean: {self.data['speed_kmh'].mean():.1f} km/h")

if __name__ == '__main__':
    generator = SyntheticDataGenerator()
    generator.generate(10000)