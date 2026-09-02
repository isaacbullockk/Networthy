"""Smoke-test the embedder contract without the heavy model.

The sandbox has no torch/sentence-transformers, so we stub the module and
fake the model. The Docker image runs the real multilingual-e5-small.
"""
import importlib
import sys
import types
from unittest.mock import MagicMock

import numpy as np
import pytest


@pytest.fixture()
def client():
    fake_model = MagicMock()
    fake_model.encode.side_effect = lambda texts, **kw: np.tile(
        np.arange(384, dtype="float32"), (len(texts), 1)
    )
    fake_st = types.ModuleType("sentence_transformers")
    fake_st.SentenceTransformer = MagicMock(return_value=fake_model)
    sys.modules["sentence_transformers"] = fake_st
    try:
        sys.modules.pop("main", None)
        main = importlib.import_module("main")
        from fastapi.testclient import TestClient

        with TestClient(main.app) as c:
            yield c
    finally:
        sys.modules.pop("sentence_transformers", None)
        sys.modules.pop("main", None)


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["ready"] is True


def test_embed_contract(client):
    r = client.post("/embed", json={"texts": ["skills: react", "skills: haccp"]})
    assert r.status_code == 200
    data = r.json()
    assert len(data["embeddings"]) == 2
    assert all(len(v) == 384 for v in data["embeddings"])


def test_rejects_empty_and_oversized(client):
    assert client.post("/embed", json={"texts": []}).status_code == 422
    assert client.post("/embed", json={"texts": ["x" * 3000]}).status_code == 413
    assert client.post("/embed", json={"texts": ["ok"] * 100}).status_code == 422
