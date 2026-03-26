from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.connection import router as connection_router
from routes.profile import router as profile_router
from routes.preview import router as preview_router
from routes.upload import router as upload_router
from routes.schema import router as schema_router

app = FastAPI(title="SchemaIQ Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://schemaiqdashboard.netlify.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(connection_router, prefix="")
app.include_router(upload_router, prefix="")
app.include_router(schema_router, prefix="")
app.include_router(profile_router, prefix="")
app.include_router(preview_router, prefix="")
