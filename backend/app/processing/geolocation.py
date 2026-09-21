import logging
from typing import List, Optional
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from app.models.location import Location

logger = logging.getLogger(__name__)

class GeolocationResolver:
    def __init__(self, user_agent: str = "logistics_accessibility_engine/1.0", timeout: int = 5):
        self.geolocator = Nominatim(user_agent=user_agent, timeout=timeout)

    def resolve(self, location_names: List[str]) -> List[Location]:
        """
        Resolves location text into geographic coordinates (PostGIS Geometry).
        Avoids blindly resolving ambiguous names.
        """
        locations = []
        for name in location_names:
            loc = self._resolve_single(name)
            if loc:
                locations.append(loc)
        return locations
        
    def _resolve_single(self, name: str) -> Optional[Location]:
        if not name or len(name) < 3:
            return None
            
        try:
            # We add ", India" context to improve accuracy since this is an India-focused logistics engine.
            # In a fully generic system, country bias would come from config.
            query = f"{name}, India"
            location_data = self.geolocator.geocode(query, exactly_one=True, addressdetails=True)
            
            if not location_data:
                # Try without India context if the first fails
                location_data = self.geolocator.geocode(name, exactly_one=True, addressdetails=True)
                
            if not location_data:
                return None
                
            address = location_data.raw.get('address', {})
            
            # Construct PostGIS WKT Point
            geom_wkt = f'SRID=4326;POINT({location_data.longitude} {location_data.latitude})'
            
            return Location(
                name=name,
                normalized_name=location_data.address,
                latitude=location_data.latitude,
                longitude=location_data.longitude,
                geometry=geom_wkt,
                city=address.get('city') or address.get('town') or address.get('village'),
                district=address.get('county') or address.get('state_district'),
                state=address.get('state'),
                country=address.get('country'),
                confidence=0.8 # Nominatim doesn't provide a direct confidence score, but finding a match is a strong signal
            )
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            logger.error(f"Geocoding service error for {name}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error resolving location {name}: {e}")
            return None
