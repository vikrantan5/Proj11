import { calculateDistance } from './safetyMapService';
import ENV from '../config/env';

const GOOGLE_MAPS_API_KEY = ENV.GOOGLE_MAPS_API_KEY;

/**
 * Calculate weighted safety score for a route segment
 * @param {Object} point - {latitude, longitude}
 * @param {Array} safetyMarkers - Array of all safety markers
 * @param {number} influenceRadius - Radius in km where markers affect score
 * @returns {number} - Safety score (0-100, higher is safer)
 */
export const calculateSafetyScore = (point, safetyMarkers, influenceRadius = 0.5) => {
  let score = 50; // Neutral starting score
  
  safetyMarkers.forEach(marker => {
    const distance = calculateDistance(
      point.latitude,
      point.longitude,
      marker.coordinates.latitude,
      marker.coordinates.longitude
    );
    
    // Only consider markers within influence radius
    if (distance <= influenceRadius) {
      // Calculate influence strength (closer = stronger influence)
      const influence = 1 - (distance / influenceRadius);
      
      // Apply marker influence based on status and upvotes
      const upvoteMultiplier = 1 + (marker.upvotes * 0.1); // Each upvote adds 10% weight
      
      if (marker.status === 'safe') {
        score += 30 * influence * upvoteMultiplier;
      } else if (marker.status === 'caution') {
        score -= 15 * influence * upvoteMultiplier;
      } else if (marker.status === 'unsafe') {
        score -= 40 * influence * upvoteMultiplier;
      }
    }
  });
  
  // Clamp score between 0 and 100
  return Math.max(0, Math.min(100, score));
};

/**
 * Get route from Google Directions API
 * @param {Object} origin - {latitude, longitude}
 * @param {Object} destination - {latitude, longitude}
 * @param {boolean} alternatives - Whether to request alternative routes
 * @returns {Promise<Array>} - Array of route objects
 */
export const getRoutesFromGoogle = async (origin, destination, alternatives = true) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&alternatives=${alternatives}&mode=walking&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error('Google Directions API error:', data.status, data.error_message);
      throw new Error(data.error_message || 'Failed to get routes');
    }
    
    return data.routes.map(route => ({
      polyline: route.overview_polyline.points,
      distance: route.legs[0].distance.value, // in meters
      duration: route.legs[0].duration.value, // in seconds
      steps: route.legs[0].steps,
      bounds: route.bounds,
    }));
  } catch (error) {
    console.error('Error fetching routes from Google:', error);
    throw error;
  }
};

/**
 * Decode Google polyline to coordinates
 * @param {string} encoded - Encoded polyline string
 * @returns {Array} - Array of {latitude, longitude}
 */
export const decodePolyline = (encoded) => {
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
};

/**
 * Calculate safety score for entire route
 * @param {Array} routePoints - Array of {latitude, longitude}
 * @param {Array} safetyMarkers - Array of safety markers
 * @returns {number} - Average safety score for route
 */
export const calculateRouteSafetyScore = (routePoints, safetyMarkers) => {
  if (!routePoints || routePoints.length === 0) return 50;
  
  // Sample points along route (every ~50 meters worth of points)
  const samplingInterval = Math.max(1, Math.floor(routePoints.length / 20));
  const sampledPoints = routePoints.filter((_, index) => index % samplingInterval === 0);
  
  // Calculate safety score for each sampled point
  const scores = sampledPoints.map(point => 
    calculateSafetyScore(point, safetyMarkers)
  );
  
  // Return average score
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(averageScore);
};

/**
 * Get safest route considering safety markers
 * @param {Object} origin - {latitude, longitude}
 * @param {Object} destination - {latitude, longitude}
 * @param {Array} safetyMarkers - Array of safety markers
 * @returns {Promise<Object>} - Best route with safety information
 */
export const getSafestRoute = async (origin, destination, safetyMarkers) => {
  try {
    console.log('Calculating safest route...');
    
    // Get alternative routes from Google
    const routes = await getRoutesFromGoogle(origin, destination, true);
    
    if (!routes || routes.length === 0) {
      throw new Error('No routes found');
    }
    
    // Analyze each route
    const analyzedRoutes = routes.map(route => {
      const points = decodePolyline(route.polyline);
      const safetyScore = calculateRouteSafetyScore(points, safetyMarkers);
      
      return {
        ...route,
        points,
        safetyScore,
        // Calculate weighted score combining safety and distance
        // Prioritize safety but also consider distance
        weightedScore: (safetyScore * 0.7) + ((1 - (route.distance / 10000)) * 30),
      };
    });
    
    // Sort by weighted score (highest = best)
    analyzedRoutes.sort((a, b) => b.weightedScore - a.weightedScore);
    
    const bestRoute = analyzedRoutes[0];
    
    console.log(`Found ${analyzedRoutes.length} routes:`);
    analyzedRoutes.forEach((route, index) => {
      console.log(`  Route ${index + 1}: Safety ${route.safetyScore}/100, Distance ${(route.distance / 1000).toFixed(2)}km, Weighted ${route.weightedScore.toFixed(1)}`);
    });
    
    return {
      route: bestRoute,
      alternatives: analyzedRoutes.slice(1),
    };
  } catch (error) {
    console.error('Error calculating safest route:', error);
    throw error;
  }
};

/**
 * Get fastest route (standard Google route)
 * @param {Object} origin - {latitude, longitude}
 * @param {Object} destination - {latitude, longitude}
 * @returns {Promise<Object>} - Fastest route
 */
export const getFastestRoute = async (origin, destination) => {
  try {
    const routes = await getRoutesFromGoogle(origin, destination, false);
    if (!routes || routes.length === 0) {
      throw new Error('No routes found');
    }
    
    const route = routes[0];
    return {
      ...route,
      points: decodePolyline(route.polyline),
    };
  } catch (error) {
    console.error('Error getting fastest route:', error);
    throw error;
  }
};
