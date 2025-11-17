// config/mapbox.ts
// Mapbox configuration (FREE tier: 100,000 requests/month!)

export const MAPBOX_CONFIG = {
  ACCESS_TOKEN: 'pk.eyJ1Ijoia2VyZW1hbGhhbiIsImEiOiJjbWkxd2QyenYwNjljMndxdmFtczYyODBnIn0.pytXVOg9kWURn4zOngXhNg',
  SEARCH_LIMIT: 5,
  COUNTRY_CODES: 'it', // Limit to Italy (remove for worldwide)
};

// Search for places using Mapbox Geocoding API
export const searchPlaces = async (
  query: string,
  proximity?: { lat: number; lng: number }
): Promise<any[]> => {
  if (!query || query.length < 2) return [];

  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_CONFIG.ACCESS_TOKEN,
      limit: MAPBOX_CONFIG.SEARCH_LIMIT.toString(),
      types: 'poi,address,place', // Points of interest, addresses, places
      ...(proximity && {
        proximity: `${proximity.lng},${proximity.lat}`,
      }),
      ...(MAPBOX_CONFIG.COUNTRY_CODES && {
        country: MAPBOX_CONFIG.COUNTRY_CODES,
      }),
    });

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`
    );

    const data = await response.json();
    
    if (!data.features) {
      console.error('Mapbox API Error:', data.message);
      return [];
    }

    // Transform Mapbox response to match our UI
    return data.features.map((feature: any) => ({
      id: feature.id,
      place_name: feature.place_name,
      text: feature.text, // Main name
      place_type: feature.place_type,
      center: feature.center, // [lng, lat]
      context: feature.context, // Additional info like city, region
      properties: feature.properties,
    }));
  } catch (error) {
    console.error('Mapbox search error:', error);
    return [];
  }
};

// Reverse geocode coordinates to get address
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_CONFIG.ACCESS_TOKEN,
      types: 'poi,address',
      limit: '1',
    });

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?${params}`
    );

    const data = await response.json();
    
    if (data.features && data.features[0]) {
      return data.features[0].place_name;
    }
    
    return null;
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
};