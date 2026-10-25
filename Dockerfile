FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

# 1. Pehle lightweight CPU-only torch install karein
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# 2. Ab requirements.txt install karein (ab yeh heavy CUDA torch dobara download nahi karega)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]