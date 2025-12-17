import { latLonToNZTM, nztmToTile, tileToNZTMBounds } from '../utils/nztm';
import { metersToLatLon, MAP_CENTER_LAT, MAP_CENTER_LON } from '../utils/geoUtils';

export const TERRAIN_ZOOM_LEVEL = 17;
const TILE_SEGMENTS = 32; // Matches TerrainTile segments

class TerrainSystemManager {
    private tiles: Map<string, Float32Array> = new Map();
    private listeners: Set<(key: string) => void> = new Set();

    // Register raw height data for a tile
    // heightData should be (TILE_SEGMENTS + 1) ^ 2 length (row-major)
    registerTile(col: number, row: number, heightData: Float32Array) {
        const key = `${col},${row}`;
        this.tiles.set(key, heightData);
        this.notifyListeners(key);
    }

    getTileData(col: number, row: number) {
        return this.tiles.get(`${col},${row}`);
    }

    // Get height at Game World coordinates (x, z)
    getHeight(x: number, z: number): number | null {
        // 1. Game (x, z) -> Lat/Lon
        const { lat, lon } = metersToLatLon(x, z, MAP_CENTER_LAT, MAP_CENTER_LON);

        // 2. Lat/Lon -> NZTM
        const { e, n } = latLonToNZTM(lat, lon);

        // 3. NZTM -> Tile (col, row)
        const { col, row } = nztmToTile(e, n, TERRAIN_ZOOM_LEVEL);

        const heightData = this.tiles.get(`${col},${row}`);
        if (!heightData) return null; // Tile not loaded

        // 4. Interpolate within tile
        const bounds = tileToNZTMBounds(col, row, TERRAIN_ZOOM_LEVEL);
        
        // Calculate normalized position (u, v) within tile
        // Bounds.left is West, Bounds.right is East. E increases ->
        // Bounds.top is North, Bounds.bottom is South. N increases ^
        // But Texture/Grid is usually Top-Left origin (High N, Low E)
        
        // u (0..1) = (e - left) / width
        const width = bounds.right - bounds.left;
        const u = (e - bounds.left) / width;

        // v (0..1) = (top - n) / height (Texture Y increases downwards, N decreases)
        const height = bounds.top - bounds.bottom;
        const v = (bounds.top - n) / height;

        // Ensure within bounds (should be if nztmToTile is correct, but floating point)
        if (u < 0 || u > 1 || v < 0 || v > 1) return null;

        // Map to grid coordinates
        const gridX = u * TILE_SEGMENTS;
        const gridY = v * TILE_SEGMENTS;

        const x0 = Math.floor(gridX);
        const x1 = Math.min(x0 + 1, TILE_SEGMENTS);
        const y0 = Math.floor(gridY);
        const y1 = Math.min(y0 + 1, TILE_SEGMENTS);

        // Fractional parts
        const tx = gridX - x0;
        const ty = gridY - y0;

        // Fetch 4 samples
        // Grid size is (TILE_SEGMENTS + 1) width
        const stride = TILE_SEGMENTS + 1;
        
        const h00 = heightData[y0 * stride + x0];
        const h10 = heightData[y0 * stride + x1];
        const h01 = heightData[y1 * stride + x0];
        const h11 = heightData[y1 * stride + x1];

        // Bilinear Interpolation
        // Top edge
        const hTop = h00 + (h10 - h00) * tx;
        // Bottom edge
        const hBot = h01 + (h11 - h01) * tx;
        // Final
        const h = hTop + (hBot - hTop) * ty;

        return h;
    }

    subscribe(callback: (key: string) => void) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(key: string) {
        this.listeners.forEach(cb => cb(key));
    }
}

export const TerrainSystem = new TerrainSystemManager();