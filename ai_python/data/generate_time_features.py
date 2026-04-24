
# ai_python/data/generate_time_features.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os

class TimeSlotDataGenerator:
    """توليد بيانات لتدريب نموذج اقتراح المواعيد"""
    
    def generate(self, num_records=5000):
        print(f"📊 Generating {num_records} time slot records...")
        np.random.seed(42)
        
        data = []
        start_date = datetime(2024, 1, 1)
        
        for i in range(num_records):
            # توليد تاريخ عشوائي
            days_offset = random.randint(0, 365)
            current_date = start_date + timedelta(days=days_offset)
            
            # ميزات الوقت
            hour = random.randint(8, 17)  # 8 صباحاً - 5 مساءً
            day_of_week = current_date.weekday()  # 0=Monday, 6=Sunday
            is_weekend = 1 if day_of_week >= 5 else 0
            is_thursday = 1 if day_of_week == 4 else 0  # الخميس
            is_morning_peak = 1 if 9 <= hour <= 11 else 0
            is_evening_peak = 1 if 15 <= hour <= 17 else 0
            is_lunch_time = 1 if hour == 12 else 0
            
            # عدد المواعيد المحجوزة في هذا الوقت (هدف التصنيف)
            # الأوقات الجيدة = قلة الازدحام
            base_booked = 0
            
            # تأثير اليوم
            if is_thursday:
                base_booked += random.randint(4, 8)
            elif is_weekend:
                base_booked += random.randint(1, 3)
            else:
                base_booked += random.randint(2, 5)
            
            # تأثير الساعة
            if is_morning_peak or is_evening_peak:
                base_booked += random.randint(2, 4)
            elif is_lunch_time:
                base_booked += random.randint(0, 2)
            
            # إضافة ضوضاء
            booked_count = base_booked + random.randint(-2, 2)
            booked_count = max(0, booked_count)
            
            # تصنيف جودة الوقت (0=ممتاز, 1=جيد, 2=متوسط, 3=سيء)
            if booked_count <= 2:
                quality = 0  # ممتاز
            elif booked_count <= 4:
                quality = 1  # جيد
            elif booked_count <= 6:
                quality = 2  # متوسط
            else:
                quality = 3  # سيء
            
            data.append({
                'hour': hour,
                'day_of_week': day_of_week,
                'is_weekend': is_weekend,
                'is_thursday': is_thursday,
                'is_morning_peak': is_morning_peak,
                'is_evening_peak': is_evening_peak,
                'is_lunch_time': is_lunch_time,
                'booked_count': booked_count,
                'quality': quality  # الهدف
            })
        
        df = pd.DataFrame(data)
        os.makedirs('ai_python/data', exist_ok=True)
        df.to_csv('ai_python/data/time_slots_data.csv', index=False)
        
        print(f"✅ Generated {len(df)} time slot records")
        print(f"   Quality distribution:\n{df['quality'].value_counts().sort_index()}")
        return df

if __name__ == '__main__':
    generator = TimeSlotDataGenerator()
    generator.generate(5000)