from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Database Configuration
    DATABASE_URL: str = "postgresql+psycopg://postgres:password@localhost:5432/logistics_events"
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Source Settings
    GDELT_ENABLED: bool = True
    GDELT_INTERVAL_MINUTES: int = 15
    
    PIB_ENABLED: bool = True
    PIB_INTERVAL_MINUTES: int = 30
    
    IMD_ENABLED: bool = True
    IMD_INTERVAL_MINUTES: int = 15
    
    NHAI_ENABLED: bool = True
    NHAI_INTERVAL_MINUTES: int = 60
    
    AAI_ENABLED: bool = True
    AAI_INTERVAL_MINUTES: int = 60
    
    # Processing Thresholds
    RELEVANCE_THRESHOLD: float = 0.65
    LOCATION_CONFIDENCE_THRESHOLD: float = 0.70
    EVENT_SIMILARITY_THRESHOLD: float = 0.82
    
    # LLM Configuration
    LLM_ENABLED: bool = False
    LLM_PROVIDER: Optional[str] = None
    LLM_MODEL: Optional[str] = None
    LLM_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
