
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { latLonToMeters, MAP_CENTER_LAT, MAP_CENTER_LON, getChunkId, getChunkIdsAround } from '../../utils/geoUtils';
import { useGameStore } from '../../store/gameStore';
import { TerrainSystem } from '../../systems/TerrainSystem';
import React, { useState, useEffect, useRef, useMemo } from 'react';

interface StreetSignsProps {
    features: any[];
}

// const ROAD_WIDTH = 20; 
const SIGN_OFFSET = 15; // Meters from center line to left (Clear the road half-width of 10m)
const SETBACK = 15;      // Meters back from the node center (Clear the cross-road half-width of 10m)

interface SignData {
    position: [number, number, number];
    rotation: [number, number, number];
    roadName: string;
    crossRoadNames: string;
    key: string;
}

const SignPost = React.memo(({ position, rotation, roadName, crossRoadNames }: Omit<SignData, 'key'>) => {
    return (
        <group position={position} rotation={rotation}>
            {/* Pole */}
            <mesh position={[0, -1.5, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 4]} />
                <meshStandardMaterial color="#555" />
            </mesh>
            
            {/* Blade 1: Current Road (Parallel to road) */}
            <group position={[0, 0.8, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh>
                    <boxGeometry args={[1.8, 0.4, 0.05]} />
                    <meshStandardMaterial color="#006633" />
                </mesh>
                <Text
                    position={[0, 0, 0.06]}
                    fontSize={0.2}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                >
                    {roadName}
                </Text>
                <Text
                    position={[0, 0, -0.06]}
                    rotation={[0, Math.PI, 0]}
                    fontSize={0.2}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                >
                    {roadName}
                </Text>
            </group>

            {/* Blade 2: Cross Road (Perpendicular to road) */}
            <group position={[0, 1.3, 0]}>
                <mesh>
                    <boxGeometry args={[1.8, 0.4, 0.05]} />
                    <meshStandardMaterial color="#006633" />
                </mesh>
                <Text
                    position={[0, 0, 0.06]}
                    fontSize={0.2}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                >
                    {crossRoadNames}
                </Text>
                <Text
                    position={[0, 0, -0.06]}
                    rotation={[0, Math.PI, 0]}
                    fontSize={0.2}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                >
                    {crossRoadNames}
                </Text>
            </group>
        </group>
    );
});

export const StreetSigns = ({ features }: StreetSignsProps) => {
    const [visibleChunkIds, setVisibleChunkIds] = useState<string[]>([]);
    const lastChunkId = useRef<string | null>(null);
    const [terrainVersion, setTerrainVersion] = useState(0);

    useEffect(() => {
        const unsubscribe = TerrainSystem.subscribe(() => {
            setTerrainVersion(v => v + 1);
        });
        return () => { unsubscribe(); };
    }, []);

    const chunkedSigns = useMemo(() => {
        if (!features || features.length === 0) return new Map<string, SignData[]>();

        const chunks = new Map<string, SignData[]>();
        const nodeMap = new Map<string, Set<string>>();
        const seenKeys = new Set<string>();
        const coordKey = (x: number, z: number) => `${Math.round(x)},${Math.round(z)}`;

        // Phase 1: Identify Intersections and collect Road Names
        features.forEach(feature => {
            if (!feature.geometry || !feature.properties?.name) return;
            
            const name = feature.properties.name;
            const coords = feature.geometry.coordinates;
            const type = feature.geometry.type;

            const processPoints = (line: number[][]) => {
                // Register all points, as intersections can happen mid-segment in raw data?
                // Typically graph nodes are endpoints. Let's assume endpoints for now to save perf.
                // If geometry is split at intersections (common in GIS), endpoints are enough.
                if (line.length < 2) return;
                
                // Start
                const startM = latLonToMeters(line[0][1], line[0][0], MAP_CENTER_LAT, MAP_CENTER_LON);
                const startK = coordKey(startM.x, startM.z);
                if (!nodeMap.has(startK)) nodeMap.set(startK, new Set());
                nodeMap.get(startK)!.add(name);

                // End
                const endM = latLonToMeters(line[line.length-1][1], line[line.length-1][0], MAP_CENTER_LAT, MAP_CENTER_LON);
                const endK = coordKey(endM.x, endM.z);
                if (!nodeMap.has(endK)) nodeMap.set(endK, new Set());
                nodeMap.get(endK)!.add(name);
            };

            if (type === 'LineString') {
                processPoints(coords);
            } else if (type === 'MultiLineString') {
                coords.forEach((line: number[][]) => processPoints(line));
            }
        });

        // Phase 2: Place Signs
        features.forEach((feature, index) => {
            if (!feature.geometry || !feature.properties?.name) return;

            const roadName = feature.properties.name;
            const coords = feature.geometry.coordinates;
            const type = feature.geometry.type;

            const placeSign = (nodePoint: number[], fromPoint: number[], suffix: string) => {
                const nodeM = latLonToMeters(nodePoint[1], nodePoint[0], MAP_CENTER_LAT, MAP_CENTER_LON);
                const nodeK = coordKey(nodeM.x, nodeM.z);
                const namesAtNode = nodeMap.get(nodeK);

                // Only place sign if it's an intersection (>= 2 unique road names)
                // Filter out the current road name from the count to ensure it's a cross-road
                if (!namesAtNode || namesAtNode.size < 2) return;

                const crossRoads = Array.from(namesAtNode).filter(n => n !== roadName);
                if (crossRoads.length === 0) return; // Intersection of same-named segments?

                const key = `${roadName}-${index}-${suffix}-${nodePoint[0]}-${nodePoint[1]}`;
                if (seenKeys.has(key)) return;
                seenKeys.add(key);

                // Vector Calculation
                const fromM = latLonToMeters(fromPoint[1], fromPoint[0], MAP_CENTER_LAT, MAP_CENTER_LON);
                const vNode = new THREE.Vector3(nodeM.x, 0, nodeM.z);
                const vFrom = new THREE.Vector3(fromM.x, 0, fromM.z);

                // Direction of incoming traffic (From -> Node)
                const dir = new THREE.Vector3().subVectors(vNode, vFrom).normalize();
                
                // Left Vector
                const left = new THREE.Vector3(0, 1, 0).cross(dir).normalize();

                // Position: Back from node, Offset to left
                const pos = vNode.clone()
                    .sub(dir.multiplyScalar(SETBACK))
                    .add(left.multiplyScalar(SIGN_OFFSET));

                // Terrain Height Adjustment
                const h = TerrainSystem.getHeight(pos.x, pos.z) ?? 0;
                pos.y = h + 0.2; // Base of pole at ground level (plus tiny offset to avoid clipping)

                // Rotation: Facing incoming traffic (opposite to dir)
                // Or aligned with road?
                // Standard: Blade 1 (Road Name) aligns with road. Blade 2 (Cross) aligns 90deg.
                // Angle of road:
                const angle = Math.atan2(dir.x, dir.z);
                const rotation: [number, number, number] = [0, angle, 0];

                const signData: SignData = {
                    position: [pos.x, pos.y + 3, pos.z], // Center of sign blades is at y+3 relative to base
                    rotation,
                    roadName,
                    crossRoadNames: crossRoads[0], // Take first cross road name for simplicity
                    key
                };

                // Add to chunk
                const chunkId = getChunkId(pos.x, pos.z);
                if (!chunks.has(chunkId)) chunks.set(chunkId, []);
                chunks.get(chunkId)!.push(signData);
            };

            const processLine = (line: number[][]) => {
                if (line.length < 2) return;
                // Check Start (Approaching from P1 to P0?) No, line is P0->P1...
                // Segment P0 -> P1.
                // At P0: Incoming traffic comes from P1? No, P0->P1 is one side.
                // If the road is two-way:
                // 1. Approaching P0 from P1. Place sign at P0.
                // 2. Approaching P1 from P0. Place sign at P1.
                
                placeSign(line[0], line[1], 'start'); // Intersection at P0, traffic from P1
                placeSign(line[line.length-1], line[line.length-2], 'end'); // Intersection at Pn, traffic from Pn-1
            };

            if (type === 'LineString') {
                processLine(coords);
            } else if (type === 'MultiLineString') {
                coords.forEach((line: number[][]) => processLine(line));
            }
        });
        
        return chunks;

    }, [features, terrainVersion]); // Re-calculate when terrain updates

    useFrame(() => {
        const { x, z } = useGameStore.getState().telemetry.position;
        const currentId = getChunkId(x, z);
        
        if (currentId !== lastChunkId.current) {
            lastChunkId.current = currentId;
            const ids = getChunkIdsAround(x, z, 1); 
            setVisibleChunkIds(ids);
        }
    });

    return (
        <group>
            {visibleChunkIds.map(chunkId => {
                const signs = chunkedSigns.get(chunkId);
                if (!signs) return null;
                return (
                    <group key={chunkId}>
                        {signs.map((sign: SignData) => (
                            <SignPost
                                key={sign.key}
                                position={sign.position}
                                rotation={sign.rotation}
                                roadName={sign.roadName}
                                crossRoadNames={sign.crossRoadNames}
                            />
                        ))}
                    </group>
                );
            })}
        </group>
    );
};
