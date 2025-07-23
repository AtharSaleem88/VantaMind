from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import user, message, conversation  # Ensures tables are created
from app.auth.routes import router as auth_router
from app.langchain.llm_agent import router as llm_router 


app = FastAPI()

# ✅ CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace "*" with your React frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ Include API routers
app.include_router(auth_router, prefix="/auth", tags=["Authetication"])
app.include_router(llm_router)

# ✅ Health check route
@app.get("/")
def root():
    return {"message": "Welcome to VantaMind API"}

# ✅ Database connection check
@app.get("/check-db")
def check_db_connection():
    try:
        with engine.connect() as conn:
            return {"status": "✅ Connected to SQL Server successfully!"}
    except Exception as e:
        return {"status": "❌ Failed to connect", "error": str(e)}
