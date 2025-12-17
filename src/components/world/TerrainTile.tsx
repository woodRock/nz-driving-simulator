import React, { useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { tileToNZTMBounds, nztmToLatLon } from '../../utils/nztm';
import { latLonToMeters, MAP_CENTER_LAT, MAP_CENTER_LON } from '../../utils/geoUtils';

import { TerrainSystem } from '../../systems/TerrainSystem';

// Constants
const ELEVATION_API_KEY = 'c01kcnafcmyays2y3hygwc7nrd9';
const ELEVATION_TEMPLATE = `https://basemaps.linz.govt.nz/v1/tiles/elevation/NZTM2000Quad/{z}/{x}/{y}.png?api=${ELEVATION_API_KEY}&pipeline=terrain-rgb`;
const SATELLITE_TEMPLATE = `https://basemaps.linz.govt.nz/v1/tiles/wellington-2025-0.2m/NZTM2000Quad/{z}/{x}/{y}.jpg?api=${ELEVATION_API_KEY}`;

// Helper to decode Mapbox Terrain-RGB
// height = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
const decodeHeight = (r: number, g: number, b: number) => {
    return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
};

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

    // We can't use useLoader for elevation because we need pixel data, not a texture on GPU.
    // So we fetch it manually.
    const [heightData, setHeightData] = useState<Float32Array | null>(null);

    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = elevationUrl;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const data = imageData.data;
            
            // Create height array (vertices)
            // PlaneGeometry with 32 segments = 33x33 vertices (Reduced from 64 for performance)
            const segments = 32; 
            const heights = new Float32Array((segments + 1) * (segments + 1));
            
            for (let i = 0; i <= segments; i++) { // y
                for (let j = 0; j <= segments; j++) { // x
                    // Map vertex (j, i) to image pixel
                    const pixelX = Math.floor((j / segments) * (img.width - 1));
                    const pixelY = Math.floor((i / segments) * (img.height - 1));
                    
                    const idx = (pixelY * img.width + pixelX) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    
                    heights[i * (segments + 1) + j] = decodeHeight(r, g, b);
                }
            }
            setHeightData(heights);
            TerrainSystem.registerTile(col, row, heights);
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
                // Top edge (u)
                const topX = tl.x + (tr.x - tl.x) * u;
                const topZ = tl.z + (tr.z - tl.z) * u;
                
                // Bottom edge (u)
                const botX = bl.x + (br.x - bl.x) * u;
                const botZ = bl.z + (br.z - bl.z) * u;
                
                // Final pos (v) - note: plane geometry Y goes + to -, or we just map 0..1
                // Standard Plane: Y is Up. UV (0,1) is Top-Left.
                // We are iterating i 0..64. i=0 is Top row? 
                // PlaneGeometry vertices are ordered row by row, top to bottom usually?
                // Let's check Threejs docs or assume standard: row-major, top-left to bottom-right.
                // Actually PlaneGeometry(w, h, segW, segH)
                // It builds rows Y from +h/2 down to -h/2.
                // So i=0 is Top Row. i=segments is Bottom Row.
                
                const x = topX + (botX - topX) * v;
                const z = topZ + (botZ - topZ) * v; // Game Z
                
                // Height
                const h = heightData[index];
                
                // Set Position (x, y, z) -> Game (x, y=h, z)
                // But PlaneGeometry is created in XY plane.
                // We want to map it to XZ plane.
                // Default Plane: x, y, z=0.
                // We will rotate mesh -PI/2 X.
                // Then local x -> World x. local y -> World -z. local z -> World y.
                // Wait, modifying the geometry directly is better to avoid confusion.
                // Let's set X, Y, Z directly corresponding to World X, World Y (Height), World Z.
                
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
