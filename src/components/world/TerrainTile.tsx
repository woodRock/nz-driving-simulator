import React, { useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { tileToNZTMBounds, nztmToLatLon } from '../../utils/nztm';
import { latLonToMeters, MAP_CENTER_LAT, MAP_CENTER_LON } from '../../utils/geoUtils';
import TerrainWorker from '../../workers/terrain.worker?worker';

import { TerrainSystem } from '../../systems/TerrainSystem';

// Constants
const ELEVATION_API_KEY = 'c01kcnafcmyays2y3hygwc7nrd9';
const ELEVATION_TEMPLATE = `https://basemaps.linz.govt.nz/v1/tiles/elevation/NZTM2000Quad/{z}/{x}/{y}.png?api=${ELEVATION_API_KEY}&pipeline=terrain-rgb`;
const SATELLITE_TEMPLATE = `https://basemaps.linz.govt.nz/v1/tiles/wellington-2025-0.2m/NZTM2000Quad/{z}/{x}/{y}.jpg?api=${ELEVATION_API_KEY}`;

interface TerrainTileProps {
    col: number;
    row: number;
    zoom: number;
}

export const TerrainTile: React.FC<TerrainTileProps> = ({ col, row, zoom }) => {
    const satelliteUrl = SATELLITE_TEMPLATE
        .replace('{z}', zoom.toString())
        .replace('{x}', col.toString())
        .replace('{y}', row.toString());

    const elevationUrl = ELEVATION_TEMPLATE
        .replace('{z}', zoom.toString())
        .replace('{x}', col.toString())
        .replace('{y}', row.toString());

    const satelliteTexture = useLoader(THREE.TextureLoader, satelliteUrl);
    satelliteTexture.colorSpace = THREE.SRGBColorSpace;

    const [heightData, setHeightData] = useState<Float32Array | null>(null);

    useEffect(() => {
        const worker = new TerrainWorker();
        const segments = 32;

        worker.postMessage({ url: elevationUrl, segments });

        worker.onmessage = (e) => {
            if (e.data.error) {
                console.error('Terrain load failed', e.data.error);
                return;
            }
            const heights = e.data.heights;
            setHeightData(heights);
            TerrainSystem.registerTile(col, row, heights);
            worker.terminate();
        };

        return () => {
            worker.terminate();
        };
    }, [elevationUrl, col, row]);

    const geometry = useMemo(() => {
        if (!heightData) return null;

        // 1. Calculate World Position of Corners
        const { left, top, right, bottom } = tileToNZTMBounds(col, row, zoom);
        
        const tlWgs = nztmToLatLon(left, top);
        const trWgs = nztmToLatLon(right, top);
        const blWgs = nztmToLatLon(left, bottom);
        const brWgs = nztmToLatLon(right, bottom);
        
        const tl = latLonToMeters(tlWgs.lat, tlWgs.lon, MAP_CENTER_LAT, MAP_CENTER_LON);
        const tr = latLonToMeters(trWgs.lat, trWgs.lon, MAP_CENTER_LAT, MAP_CENTER_LON);
        const bl = latLonToMeters(blWgs.lat, blWgs.lon, MAP_CENTER_LAT, MAP_CENTER_LON);
        const br = latLonToMeters(brWgs.lat, brWgs.lon, MAP_CENTER_LAT, MAP_CENTER_LON);

        // 2. Create PlaneGeometry
        const segments = 32;
        const geom = new THREE.PlaneGeometry(1, 1, segments, segments);
        
        // 3. Deform Vertices
        const posAttribute = geom.attributes.position;
        
        for (let i = 0; i <= segments; i++) { // y (rows)
            for (let j = 0; j <= segments; j++) { // x (cols)
                const index = i * (segments + 1) + j;
                
                // Interpolate X/Z position
                const u = j / segments;
                const v = i / segments; // Top to Bottom (0 -> 1)
                
                // Bilinear interpolation for corner mapping (handles rotation/skew)
                const topX = tl.x + (tr.x - tl.x) * u;
                const topZ = tl.z + (tr.z - tl.z) * u;
                
                const botX = bl.x + (br.x - bl.x) * u;
                const botZ = bl.z + (br.z - bl.z) * u;
                
                const x = topX + (botX - topX) * v;
                const z = topZ + (botZ - topZ) * v; // Game Z
                
                // Height
                const h = heightData[index];
                
                posAttribute.setXYZ(index, x, h, z);
            }
        }
        
        geom.computeVertexNormals();
        return geom;

    }, [heightData, col, row, zoom]);

    if (!geometry) return null;

    return (
        <mesh geometry={geometry} receiveShadow castShadow>
            <meshStandardMaterial map={satelliteTexture} side={THREE.DoubleSide} />
        </mesh>
    );
};
