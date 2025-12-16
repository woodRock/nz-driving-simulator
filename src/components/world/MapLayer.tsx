
import { useLoader, useFrame } from '@react-three/fiber';
import { useState, useRef } from 'react';
import * as THREE from 'three';
import { latLonToMeters, latLonToTile, tileToLatLon, metersToLatLon, MAP_CENTER_LAT, MAP_CENTER_LON } from '../../utils/geoUtils';
import { useGameStore } from '../../store/gameStore';

// Configure the map area
const ZOOM = 17; // Good resolution
const TILE_RANGE = 3; // 7x7 grid = 49 tiles (safer limit)

const MapTile = ({ x, y }: { x: number, y: number }) => {
    const url = `https://tile.openstreetmap.org/${ZOOM}/${x}/${y}.png`;
    const texture = useLoader(THREE.TextureLoader, url);
    
    // Calculate world position for this tile
    const { lat, lon } = tileToLatLon(x, y, ZOOM);
    const { x: worldX, z: worldZ } = latLonToMeters(lat, lon, MAP_CENTER_LAT, MAP_CENTER_LON);

    // Calculate tile size in meters
    const nextTile = tileToLatLon(x + 1, y + 1, ZOOM);
    const nextWorld = latLonToMeters(nextTile.lat, nextTile.lon, MAP_CENTER_LAT, MAP_CENTER_LON);
    
    const width = Math.abs(nextWorld.x - worldX);
    const height = Math.abs(nextWorld.z - worldZ);

    const centerX = worldX + width / 2;
    const centerZ = worldZ + (nextWorld.z - worldZ) / 2; 

    return (
        <mesh position={[centerX, -0.5, centerZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial map={texture} />
        </mesh>
    );
};

export const MapLayer = () => {
    const [tiles, setTiles] = useState<{ x: number, y: number, key: string }[]>([]);
    const lastTileRef = useRef<{ x: number, y: number } | null>(null);

    useFrame(() => {
        const { x, z } = useGameStore.getState().telemetry.position;
        
        // Convert player meters back to Lat/Lon
        const { lat, lon } = metersToLatLon(x, z, MAP_CENTER_LAT, MAP_CENTER_LON);
        
        // Get current tile
        const centerTile = latLonToTile(lat, lon, ZOOM);

        // Update if tile changed
        if (!lastTileRef.current || lastTileRef.current.x !== centerTile.x || lastTileRef.current.y !== centerTile.y) {
            lastTileRef.current = centerTile;
            
            const newTiles = [];
            for (let dx = -TILE_RANGE; dx <= TILE_RANGE; dx++) {
                for (let dy = -TILE_RANGE; dy <= TILE_RANGE; dy++) {
                    const tx = centerTile.x + dx;
                    const ty = centerTile.y + dy;
                    newTiles.push({ x: tx, y: ty, key: `${tx}-${ty}` });
                }
            }
            setTiles(newTiles);
        }
    });

    return (
        <group>
            {tiles.map(tile => (
                <MapTile key={tile.key} x={tile.x} y={tile.y} />
            ))}
        </group>
    );
};
