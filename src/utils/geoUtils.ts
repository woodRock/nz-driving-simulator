
export const EARTH_RADIUS = 6371000; // meters

// Center of the map (Wellington CBD)
// Updated to roughly the intersection of Humber St and The Parade or just general Wellington center
export const MAP_CENTER_LAT = -41.28889; 
export const MAP_CENTER_LON = 174.77722;

// Chunking configuration
export const CHUNK_SIZE = 150; // meters (reduced from 500)

// Convert Lat/Lon to Meters relative to a center point
export function latLonToMeters(lat: number, lon: number, centerLat: number = MAP_CENTER_LAT, centerLon: number = MAP_CENTER_LON) {
  const x = (lon - centerLon) * (Math.PI / 180) * EARTH_RADIUS * Math.cos((centerLat * Math.PI) / 180);
  const z = -(lat - centerLat) * (Math.PI / 180) * EARTH_RADIUS; 
  // +X = East, -Z = North
  return { x, z };
}

// Convert Meters (x, z) back to Lat/Lon
export function metersToLatLon(x: number, z: number, centerLat: number = MAP_CENTER_LAT, centerLon: number = MAP_CENTER_LON) {
    const lat = centerLat - (z / EARTH_RADIUS) * (180 / Math.PI);
    const lon = centerLon + (x / (EARTH_RADIUS * Math.cos((centerLat * Math.PI) / 180))) * (180 / Math.PI);
    return { lat, lon };
}

// Convert Lat/Lon to OSM Tile coordinates
export function latLonToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const latRad = (lat * Math.PI) / 180;
  const xtile = Math.floor(n * ((lon + 180) / 360));
  const ytile = Math.floor(
    (n * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI)) / 2
  );
  return { x: xtile, y: ytile };
}

// Convert OSM Tile coordinates to Lat/Lon (Top-Left corner of the tile)
export function tileToLatLon(x: number, y: number, zoom: number) {
    const n = Math.pow(2, zoom);
    const lon = (x / n) * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
    const lat = (latRad * 180) / Math.PI;
    return { lat, lon };
}

// Get Chunk Key from meters
export function getChunkId(x: number, z: number) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    return `${cx},${cz}`;
}

export function getChunkIdsAround(x: number, z: number, radius: number = 1) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const ids = [];
    for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
            ids.push(`${cx + i},${cz + j}`);
        }
    }
    return ids;
}
