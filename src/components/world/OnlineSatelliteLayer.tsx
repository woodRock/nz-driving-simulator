import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { useGameStore } from '../../store/gameStore';
import { latLonToMeters, metersToLatLon, MAP_CENTER_LAT, MAP_CENTER_LON } from '../../utils/geoUtils';
import { useMemo } from 'react'; // Import useMemo
import { latLonToNZTM, nztmToTile, tileToNZTMBounds, nztmToLatLon } from '../../utils/nztm';

// Configuration
const ZOOM_LEVEL = 17; // Reverted zoom level back to 17
const LOAD_RADIUS = 3; // 7x7 grid = 49 tiles, covers ~2.1km width at Zoom 15

const WMTS_TEMPLATE = 'https://basemaps.linz.govt.nz/v1/tiles/wellington-2025-0.2m/NZTM2000Quad/{z}/{x}/{y}.jpg?api=c01kcnafcmyays2y3hygwc7nrd9';

const TileMesh: React.FC<{ col: number, row: number, zoom: number }> = ({ col, row, zoom }) => {
    // Memoize geometry to avoid recreating it on re-renders (though rare here, it's safer)
    const geometry = useMemo(() => {
        // 1. Get NZTM Bounds
        const { left, top, right, bottom } = tileToNZTMBounds(col, row, zoom);
        
        // 2. Convert 4 corners to Game Meters
        const tlWgs = nztmToLatLon(left, top);
        const trWgs = nztmToLatLon(right, top);
        const blWgs = nztmToLatLon(left, bottom);
        const brWgs = nztmToLatLon(right, bottom);
        
        // Convert to Game Meters
        const tl = latLonToMeters(tlWgs.lat, tlWgs.lon, MAP_CENTER_LAT, MAP_CENTER_LON);
        const tr = latLonToMeters(trWgs.lat, trWgs.lon, MAP_CENTER_LAT, MAP_CENTER_LON);
        const bl = latLonToMeters(blWgs.lat, blWgs.lon, MAP_CENTER_LAT, MAP_CENTER_LON);
        const br = latLonToMeters(brWgs.lat, brWgs.lon, MAP_CENTER_LAT, MAP_CENTER_LON);

        const positions = new Float32Array([
            tl.x, -0.6, tl.z, // TL
            tr.x, -0.6, tr.z, // TR
            bl.x, -0.6, bl.z, // BL
            br.x, -0.6, br.z  // BR
        ]);
        
        const indices = new Uint16Array([
            0, 2, 1,
            2, 3, 1
        ]);
        
        const uvs = new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            1, 0
        ]);
        
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geo.setIndex(new THREE.BufferAttribute(indices, 1));
        geo.computeVertexNormals();
        return geo;
    }, [col, row, zoom]);

    const url = WMTS_TEMPLATE
        .replace('{z}', zoom.toString())
        .replace('{x}', col.toString())
        .replace('{y}', row.toString());
        
    const texture = useLoader(THREE.TextureLoader, url);
    texture.colorSpace = THREE.SRGBColorSpace;

    return (
        <mesh geometry={geometry} receiveShadow>
            <meshStandardMaterial map={texture} />
        </mesh>
    );
};


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
                <TileMesh key={t.key} col={t.col} row={t.row} zoom={ZOOM_LEVEL} />
            ))}
        </group>
    );
};
