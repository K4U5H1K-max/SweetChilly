from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.location import Location
from app.repositories.base import BaseRepository

class LocationRepository(BaseRepository[Location]):
    def get_by_name(self, db: Session, name: str) -> Optional[Location]:
        return db.query(Location).filter(Location.name == name).first()
        
    def find_nearby(self, db: Session, lat: float, lon: float, radius_km: float, limit: int = 100) -> List[Location]:
        """
        Finds locations within radius_km of the given lat/lon using PostGIS ST_DWithin.
        """
        point = f'SRID=4326;POINT({lon} {lat})'
        # ST_DWithin with geography uses meters
        radius_meters = radius_km * 1000
        
        return db.query(Location).filter(
            func.ST_DWithin(Location.geometry, point, radius_meters)
        ).limit(limit).all()

location_repo = LocationRepository(Location)
