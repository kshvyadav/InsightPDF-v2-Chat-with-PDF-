FROM python:3.11-slim

WORKDIR /app

# Real-time console logs stream hone ke liye
ENV PYTHONUNBUFFERED=1

# Dependencies pehle copy aur install taaki docker caching ka faayda mile
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the project files
COPY . .

# Ensure data directory exists for uploaded PDFs
RUN mkdir -p /app/data

# Expose FastAPI port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 
