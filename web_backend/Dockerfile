FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y libatomic1 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code AND the prisma folder
COPY . .

# Temporarily disable strict SSL checks for the Prisma download behind corporate proxies
ENV NODE_TLS_REJECT_UNAUTHORIZED="0"
ENV PYTHONHTTPSVERIFY="0"
RUN prisma generate
ENV NODE_TLS_REJECT_UNAUTHORIZED="1"
ENV PYTHONHTTPSVERIFY="1"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]