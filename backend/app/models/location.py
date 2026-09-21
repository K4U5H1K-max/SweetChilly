from sqlalchemy import Column, String, Float
from geoalchemy2 import Geometry
from app.db.base import Base
import uuid

class Location(Base):
    __tablename__ = "locations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    city = Column(String, index=True)
    district = Column(String, index=True)
    state = Column(String, index=True)
    country = Column(String, index=True)
    
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Use EPSG:4326 (WGS 84) for geographic coordinates
    geometry = Column(Geometry(geometry_type='POINT', srid=4326))
    
    confidence = Column(Float)
