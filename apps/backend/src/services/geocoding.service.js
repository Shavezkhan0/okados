import axios from 'axios';

class GeocodingService {
  async getCoordinates(address) {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.log('Google Maps API not configured');
        return { success: false, mock: true };
      }

      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            address,
            key: apiKey,
          },
        }
      );

      if (response.data.status === 'OK') {
        const location = response.data.results[0].geometry.location;
        return {
          success: true,
          latitude: location.lat,
          longitude: location.lng,
        };
      }

      return { success: false, error: response.data.status };
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getAddressFromCoordinates(lat, lng) {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return { success: false, mock: true };
      }

      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            latlng: `${lat},${lng}`,
            key: apiKey,
          },
        }
      );

      if (response.data.status === 'OK') {
        return {
          success: true,
          address: response.data.results[0].formatted_address,
          components: response.data.results[0].address_components,
        };
      }

      return { success: false, error: response.data.status };
    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      return { success: false, error: error.message };
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export default new GeocodingService();
