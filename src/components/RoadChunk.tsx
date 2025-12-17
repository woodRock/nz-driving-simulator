import React, { useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { TerrainSystem, TERRAIN_ZOOM_LEVEL } from '../systems/TerrainSystem';
import { latLonToNZTM, nztmToTile } from '../utils/nztm';
import { metersToLatLon, MAP_CENTER_LAT, MAP_CENTER_LON } from '../utils/geoUtils';

interface RoadSegment {
    p1: THREE.Vector3;
    p2: THREE.Vector3;
}

interface RoadChunkProps {
    chunkId: string;
    segments: RoadSegment[];
}

const ROAD_WIDTH = 12; // Reduced from 20 to fit better
const MARKING_WIDTH = 0.2;
const Y_OFFSET = 0.15;

export const RoadChunk: React.FC<RoadChunkProps> = ({ segments }) => {
    const [version, setVersion] = useState(0);

    // Subscribe to terrain updates for this chunk
    useEffect(() => {
        const keys = new Set<string>();
        
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        
        if (segments.length > 0) {
             segments.forEach(s => {
                 minX = Math.min(minX, s.p1.x, s.p2.x);
                 maxX = Math.max(maxX, s.p1.x, s.p2.x);
                 minZ = Math.min(minZ, s.p1.z, s.p2.z);
                 maxZ = Math.max(maxZ, s.p1.z, s.p2.z);
             });

            const checkPoint = (x: number, z: number) => {
                const { lat, lon } = metersToLatLon(x, z, MAP_CENTER_LAT, MAP_CENTER_LON);
                const { e, n } = latLonToNZTM(lat, lon);
                const { col, row } = nztmToTile(e, n, TERRAIN_ZOOM_LEVEL);
                keys.add(`${col},${row}`);
            };

            checkPoint(minX, minZ);
            checkPoint(maxX, maxZ);
            checkPoint(minX, maxZ);
            checkPoint(maxX, minZ);
        }

        const unsubscribe = TerrainSystem.subscribe((updatedKey) => {
            if (keys.has(updatedKey)) {
                setVersion(v => v + 1);
            }
        });
        return () => { unsubscribe(); };
    }, [segments]);

    const { roadGeometry, markingGeometry } = useMemo(() => {
        if (segments.length === 0) return { roadGeometry: null, markingGeometry: null };

        const roadPositions: number[] = [];
        const roadIndices: number[] = [];
        let roadVertCount = 0;

        const markingPositions: number[] = [];
        const markingIndices: number[] = [];
        let markingVertCount = 0;

        for (const seg of segments) {
            const { p1, p2 } = seg;

            const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
            const perp = new THREE.Vector3(-dir.z, 0, dir.x); // Unit vector
            
            const halfWidth = ROAD_WIDTH / 2;
            const perpOffset = perp.clone().multiplyScalar(halfWidth);

            // Calculate 4 corners in 2D (x, z)
            const c1 = new THREE.Vector3().subVectors(p1, perpOffset); // p1 Left
            const c2 = new THREE.Vector3().addVectors(p1, perpOffset); // p1 Right
            const c3 = new THREE.Vector3().subVectors(p2, perpOffset); // p2 Left
            const c4 = new THREE.Vector3().addVectors(p2, perpOffset); // p2 Right

            // Sample Height for EACH corner independently
            const h1 = TerrainSystem.getHeight(c1.x, c1.z) ?? p1.y;
            const h2 = TerrainSystem.getHeight(c2.x, c2.z) ?? p1.y;
            const h3 = TerrainSystem.getHeight(c3.x, c3.z) ?? p2.y;
            const h4 = TerrainSystem.getHeight(c4.x, c4.z) ?? p2.y;

            // Apply heights
            c1.y = h1 + Y_OFFSET;
            c2.y = h2 + Y_OFFSET;
            c3.y = h3 + Y_OFFSET;
            c4.y = h4 + Y_OFFSET;

            // --- Road Mesh ---
            roadPositions.push(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z, c3.x, c3.y, c3.z, c4.x, c4.y, c4.z);
            roadIndices.push(
                roadVertCount + 0, roadVertCount + 1, roadVertCount + 2,
                roadVertCount + 1, roadVertCount + 3, roadVertCount + 2
            );
            roadVertCount += 4;

            // --- Markings (Center line) ---
            const mHalf = MARKING_WIDTH / 2;
            const mOff = perp.clone().multiplyScalar(mHalf);
            
            // Center positions
            const mp1 = p1.clone(); 
            const mp2 = p2.clone();
            
            // Average height of road at center? Or sample center?
            // Sample center for accuracy
            const hM1 = TerrainSystem.getHeight(mp1.x, mp1.z) ?? p1.y;
            const hM2 = TerrainSystem.getHeight(mp2.x, mp2.z) ?? p2.y;

            mp1.y = hM1 + Y_OFFSET + 0.02; // Slightly above road
            mp2.y = hM2 + Y_OFFSET + 0.02;

            const mc1 = new THREE.Vector3().subVectors(mp1, mOff);
            const mc2 = new THREE.Vector3().addVectors(mp1, mOff);
            const mc3 = new THREE.Vector3().subVectors(mp2, mOff);
            const mc4 = new THREE.Vector3().addVectors(mp2, mOff);

            markingPositions.push(mc1.x, mc1.y, mc1.z, mc2.x, mc2.y, mc2.z, mc3.x, mc3.y, mc3.z, mc4.x, mc4.y, mc4.z);
            markingIndices.push(
                markingVertCount + 0, markingVertCount + 1, markingVertCount + 2,
                markingVertCount + 1, markingVertCount + 3, markingVertCount + 2
            );
            markingVertCount += 4;
        }

        const rGeo = new THREE.BufferGeometry();
        rGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
        rGeo.setIndex(roadIndices);
        rGeo.computeVertexNormals();

        const mGeo = new THREE.BufferGeometry();
        mGeo.setAttribute('position', new THREE.Float32BufferAttribute(markingPositions, 3));
        mGeo.setIndex(markingIndices);
        mGeo.computeVertexNormals();

        return { roadGeometry: rGeo, markingGeometry: mGeo };

    }, [segments, version]);

    if (!roadGeometry) return null;

    return (
        <group>
            <mesh geometry={roadGeometry}>
                <meshStandardMaterial color="#424242" roughness={0.9} />
            </mesh>
            <mesh geometry={markingGeometry}>
                <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
};
