# ai_python/accept_license.py
from huggingface_hub import login, HfApi

# قم بتسجيل الدخول إلى Hugging Face (مرة واحدة)
# ستحتاج إلى حساب على huggingface.co
# انتقل إلى https://huggingface.co/settings/tokens لإنشاء توكن

# الطريقة الأولى: استخدام توكن
# login(token="hf_YOUR_TOKEN_HERE")

# الطريقة الثانية: تصفح يدوي
print("Please visit: https://huggingface.co/PriorLabs/TabPFN")
print("Accept the license agreement, then run this script again")