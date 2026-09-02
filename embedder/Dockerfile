# NetWorthy embedder — self-hosted multilingual embeddings (CPU).
# Deploy as its own Railway service from the /embedder directory.
FROM python:3.12-slim

WORKDIR /srv

# Pre-download the model at image build time so cold starts never hit
# Hugging Face and the service works on private networks without egress.
COPY requirements.txt .
ARG EMBED_MODEL=intfloat/multilingual-e5-small
ENV EMBED_MODEL=${EMBED_MODEL}
RUN pip install --no-cache-dir -r requirements.txt \
 && python -c "import os; from sentence_transformers import SentenceTransformer; SentenceTransformer(os.environ['EMBED_MODEL'], device='cpu')"

COPY main.py .

ENV PORT=8080
EXPOSE 8080
CMD ["python", "main.py"]
