from fastapi import FastAPI
from server.app.main import app as core_app

app = FastAPI(
    title="Seven Music Vercel Gateway",
    version="0.2.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


@app.get("/api")
@app.get("/api/")
async def api_root() -> dict[str, str]:
    return {
        "name": "Seven Music API",
        "status": "online",
        "version": "0.2.0",
    }


app.mount("/api", core_app)
