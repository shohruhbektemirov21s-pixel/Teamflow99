FROM python:3.12-slim
WORKDIR /load
COPY backend/loadtesting/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/loadtesting/locustfile.py ./
COPY backend/loadtesting/login_locustfile.py ./
ENTRYPOINT ["locust"]
