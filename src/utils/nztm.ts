import proj4 from 'proj4';

// Define NZTM2000 projection
// EPSG:2193
proj4.defs('EPSG:2193', '+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

const WGS84 = 'EPSG:4326';
const NZTM = 'EPSG:2193';

// NZTM2000Quad Grid Definition (from LINZ Capabilities)
const ORIGIN_N = 10438190.1652;
const ORIGIN_E = -3260586.7284;
const TILE_SIZE = 256;
// Initial Resolution (Level 0) calculated from ScaleDenominator 139770566.007179 * 0.00028
const INITIAL_RESOLUTION = 39135.758482011;

/**
 * Convert WGS84 Lat/Lon to NZTM Easting/Northing
 */
export function latLonToNZTM(lat: number, lon: number) {
    const [e, n] = proj4(WGS84, NZTM, [lon, lat]);
    return { e, n };
}

/**
 * Convert NZTM Easting/Northing to WGS84 Lat/Lon
 */
export function nztmToLatLon(e: number, n: number) {
    const [lon, lat] = proj4(NZTM, WGS84, [e, n]);
    return { lat, lon };
}

/**
 * Get Tile Coordinates (col, row) for a given NZTM point at specific zoom level
 */
export function nztmToTile(e: number, n: number, zoom: number) {
    const resolution = INITIAL_RESOLUTION / Math.pow(2, zoom);
    
    // E increases to right
    const distE = e - ORIGIN_E;
    const col = Math.floor(distE / (TILE_SIZE * resolution));
    
    // N decreases downwards (but NZTM N increases upwards)
    // Grid Origin is Top-Left (High N, Low E).
    // So Row increases as N decreases.
    const distN = ORIGIN_N - n;
    const row = Math.floor(distN / (TILE_SIZE * resolution));
    
    return { col, row };
}

/**
 * Get NZTM Bounds (left, top, right, bottom) for a specific tile
 */
export function tileToNZTMBounds(col: number, row: number, zoom: number) {
    const resolution = INITIAL_RESOLUTION / Math.pow(2, zoom);
    const tileSizeM = TILE_SIZE * resolution;
    
    const left = ORIGIN_E + (col * tileSizeM);
    const right = left + tileSizeM;
    
    const top = ORIGIN_N - (row * tileSizeM);
    const bottom = top - tileSizeM;
    
    return { left, top, right, bottom };
}
