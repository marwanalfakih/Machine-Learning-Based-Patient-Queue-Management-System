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
        """توليد بيانات محاكاة تشبه الواقع"""
        
        print(f"Generating {num_records} synthetic records...")
        np.random.seed(42)
        random.seed(42)
        
        data = []
        start_date = datetime(2024, 1, 1)
        
        for i in range(num_records):
            # توليد تاريخ ووقت عشوائي
            days_offset = random.randint(0, 365)
            hour = random.randint(8, 20)  # 8 صباحاً - 8 مساءً
            
            current_date = start_date + timedelta(days=days_offset, hours=hour)
            
            # خصائص الوقت
            hour = current_date.hour
            day_of_week = current_date.weekday()  # 0-6 (الاثنين-الأحد)
            is_weekend = 1 if day_of_week >= 5 else 0
            is_peak_morning = 1 if 9 <= hour <= 11 else 0
            is_peak_evening = 1 if 15 <= hour <= 17 else 0
            
            # عدد المرضى الكلي يعتمد على الوقت
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
            doctor_experience = random.randint(1, 20)  # سنوات الخبرة
            
            # وقت الانتظار الفعلي (الهدف)
            base_time = 15  # دقيقة لكل مريض
            
            # تأثير ساعات الذروة
            if is_peak_morning or is_peak_evening:
                base_time = base_time * 1.3
            
            # تأثير يوم الأسبوع
            if day_of_week == 4:  # الخميس (مزدحم)
                base_time = base_time * 1.2
            elif is_weekend:
                base_time = base_time * 0.8
            
            # تأثير خبرة الطبيب (الأطباء الخبراء أسرع)
            doctor_factor = max(0.7, 1.0 - (doctor_experience * 0.015))
            base_time = base_time * doctor_factor
            
            # وقت الانتظار = position * base_time + random noise
            waiting_time = position * base_time + np.random.normal(0, 5)
            waiting_time = max(5, waiting_time)  # لا يقل عن 5 دقائق
            
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
                'waiting_time': round(waiting_time, 1)
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
        print("SYNTHETIC DATA STATISTICS")
        print("="*50)
        print(f"Total records: {len(self.data)}")
        print(f"Date range: {self.data['timestamp'].min()} to {self.data['timestamp'].max()}")
        print(f"\nWaiting Time Statistics:")
        print(f"  Mean: {self.data['waiting_time'].mean():.1f} minutes")
        print(f"  Std: {self.data['waiting_time'].std():.1f} minutes")
        print(f"  Min: {self.data['waiting_time'].min():.1f} minutes")
        print(f"  Max: {self.data['waiting_time'].max():.1f} minutes")
        
        print("\nWaiting Time by Hour:")
        hourly = self.data.groupby('hour')['waiting_time'].agg(['mean', 'count'])
        for hour, row in hourly.iterrows():
            print(f"  {hour:02d}:00 - {row['mean']:.1f} min ({int(row['count'])} samples)")
        
        print("\nWaiting Time by Day:")
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        daily = self.data.groupby('day_of_week')['waiting_time'].mean()
        daily_df = daily.reset_index()
        daily_df.columns = ['day_of_week', 'waiting_time']

        for _, row in daily_df.iterrows():
            day_int = int(row['day_of_week'])
            print(f"  {days[day_int]}: {row['waiting_time']:.1f} minutes")

if __name__ == '__main__':
    generator = SyntheticDataGenerator()
    generator.generate(10000)