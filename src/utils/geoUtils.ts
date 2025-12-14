
export const EARTH_RADIUS = 6371000; // meters

// Convert Lat/Lon to Meters relative to a center point
export function latLonToMeters(lat: number, lon: number, centerLat: number, centerLon: number) {
  const x = (lon - centerLon) * (Math.PI / 180) * EARTH_RADIUS * Math.cos((centerLat * Math.PI) / 180);
  const z = -(lat - centerLat) * (Math.PI / 180) * EARTH_RADIUS; // -z is North in 3D usually, but let's stick to standard map orientation where -z (up on screen in top-down) is North? 
  // In Three.js: +Y is up. +Z is usually towards camera. -Z is into screen.
  // Let's align: +X = East, -Z = North.
  return { x, z };
}
