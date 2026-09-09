FROM python:3.11-slim
WORKDIR /app
COPY ml-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY ml-service ./
COPY data /data
ENV ML_TERMINALS=/data/terminals.json ML_CONFIG=/data/config.json
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
