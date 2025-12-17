import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/gameStore';
import { metersToLatLon, MAP_CENTER_LAT, MAP_CENTER_LON } from '../../utils/geoUtils';
import { latLonToNZTM, nztmToTile } from '../../utils/nztm';
import { TerrainTile } from './TerrainTile';

// Configuration
const ZOOM_LEVEL = 17; // Lower zoom for larger tiles (less churn, better performance)
const LOAD_RADIUS = 2; // Reduced radius for performance

export const OnlineSatelliteLayer: React.FC = () => {
    const [tiles, setTiles] = useState<{ col: number, row: number, key: string }[]>([]);
    const lastTileRef = useRef<{ col: number, row: number } | null>(null);

    useFrame(() => {
        const { x, z } = useGameStore.getState().telemetry.position;
        
        // Convert Game Meters -> Lat/Lon
        const { lat, lon } = metersToLatLon(x, z, MAP_CENTER_LAT, MAP_CENTER_LON);
        
        // Convert Lat/Lon -> NZTM
        const { e, n } = latLonToNZTM(lat, lon);
        
        // Get Center Tile
        const centerTile = nztmToTile(e, n, ZOOM_LEVEL);
        
        // Update if tile changed
        if (!lastTileRef.current || lastTileRef.current.col !== centerTile.col || lastTileRef.current.row !== centerTile.row) {
            lastTileRef.current = centerTile;
            
            const newTiles = [];
            for (let dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
                for (let dy = -LOAD_RADIUS; dy <= LOAD_RADIUS; dy++) {
                    const tCol = centerTile.col + dx;
                    const tRow = centerTile.row + dy;
                    newTiles.push({ col: tCol, row: tRow, key: `${ZOOM_LEVEL}-${tCol}-${tRow}` });
                }
            }
            setTiles(newTiles);
        }
    });

    return (
        <group>
            {tiles.map(t => (
                <TerrainTile key={t.key} col={t.col} row={t.row} zoom={ZOOM_LEVEL} />
            ))}
        </group>
    );
};

