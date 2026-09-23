from fastapi import FastAPI
from server.app.main import app as core_app

app = FastAPI(
    title="Seven Music API",
    version="0.2.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.mount("/api", core_app)
