from pydantic_settings import BaseSettings

class Settings(BaseSettings):
   
    openrouter_api_key: str
    db_server: str
    db_name: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    DATABASE_URL: str

    class Config:
        extra = "allow" 
        env_file = ".env"  

settings = Settings()