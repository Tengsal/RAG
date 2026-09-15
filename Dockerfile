FROM python:3.11-slim

RUN apt-get update && apt-get install -y curl zstd && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://ollama.com/install.sh | sh

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend

RUN ollama serve & sleep 5 && ollama pull qwen3:1.7b

EXPOSE 10000

CMD ["sh", "-c", "ollama serve & python -m uvicorn backend.api:app --host 0.0.0.0 --port 10000"]
