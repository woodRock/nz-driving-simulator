
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { latLonToMeters, MAP_CENTER_LAT, MAP_CENTER_LON, getChunkId, getChunkIdsAround, metersToLatLon } from '../../utils/geoUtils';
import { useGameStore } from '../../store/gameStore';
import { TerrainSystem, TERRAIN_ZOOM_LEVEL } from '../../systems/TerrainSystem';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { latLonToNZTM, nztmToTile } from '../../utils/nztm';

interface StreetSignsProps {
    features: any[];
}

const SIGN_OFFSET = 15; 
const SETBACK = 15;      

interface SignData {
    x: number;
    z: number;
    rotation: [number, number, number];
    roadName: string;
    crossRoadNames: string;
    key: string;
}

const SignPost = React.memo(({ position, rotation, roadName, crossRoadNames }: { position: [number, number, number], rotation: [number, number, number], roadName: string, crossRoadNames: string }) => {
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

const SignChunk = ({ signs }: { signs: SignData[] }) => {
    const [, setVersion] = useState(0);

    useEffect(() => {
        const keys = new Set<string>();
        signs.forEach(s => {
             const { lat, lon } = metersToLatLon(s.x, s.z, MAP_CENTER_LAT, MAP_CENTER_LON);
             const { e, n } = latLonToNZTM(lat, lon);
             const { col, row } = nztmToTile(e, n, TERRAIN_ZOOM_LEVEL);
             keys.add(`${col},${row}`);
        });

        const unsubscribe = TerrainSystem.subscribe((key) => {
             if (keys.has(key)) setVersion(v => v + 1);
        });
        return () => { unsubscribe(); };
    }, [signs]);

    return (
        <group>
            {signs.map(sign => {
                const h = TerrainSystem.getHeight(sign.x, sign.z) ?? 0;
                // Base at h+0.2. Sign center is +3 relative to base. Total y = h + 3.2
                const y = h + 3.2;
                return (
                    <SignPost 
                        key={sign.key} 
                        position={[sign.x, y, sign.z]} 
                        rotation={sign.rotation} 
                        roadName={sign.roadName} 
                        crossRoadNames={sign.crossRoadNames} 
                    />
                );
            })}
        </group>
    );
};

export const StreetSigns = ({ features }: StreetSignsProps) => {
    const [visibleChunkIds, setVisibleChunkIds] = useState<string[]>([]);
    const lastChunkId = useRef<string | null>(null);

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

                if (!namesAtNode || namesAtNode.size < 2) return;

                const crossRoads = Array.from(namesAtNode).filter(n => n !== roadName);
                if (crossRoads.length === 0) return;

                const key = `${roadName}-${index}-${suffix}-${nodePoint[0]}-${nodePoint[1]}`;
                if (seenKeys.has(key)) return;
                seenKeys.add(key);

                // Vector Calculation
                const fromM = latLonToMeters(fromPoint[1], fromPoint[0], MAP_CENTER_LAT, MAP_CENTER_LON);
                const vNode = new THREE.Vector3(nodeM.x, 0, nodeM.z);
                const vFrom = new THREE.Vector3(fromM.x, 0, fromM.z);

                const dir = new THREE.Vector3().subVectors(vNode, vFrom).normalize();
                const left = new THREE.Vector3(0, 1, 0).cross(dir).normalize();

                const pos = vNode.clone()
                    .sub(dir.multiplyScalar(SETBACK))
                    .add(left.multiplyScalar(SIGN_OFFSET));

                const angle = Math.atan2(dir.x, dir.z);
                const rotation: [number, number, number] = [0, angle, 0];

                const signData: SignData = {
                    x: pos.x,
                    z: pos.z,
                    rotation,
                    roadName,
                    crossRoadNames: crossRoads[0],
                    key
                };

                const chunkId = getChunkId(pos.x, pos.z);
                if (!chunks.has(chunkId)) chunks.set(chunkId, []);
                chunks.get(chunkId)!.push(signData);
            };

            const processLine = (line: number[][]) => {
                if (line.length < 2) return;
                placeSign(line[0], line[1], 'start'); 
                placeSign(line[line.length-1], line[line.length-2], 'end');
            };

            if (type === 'LineString') {
                processLine(coords);
            } else if (type === 'MultiLineString') {
                coords.forEach((line: number[][]) => processLine(line));
            }
        });
        
        return chunks;

    }, [features]); 

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
                return <SignChunk key={chunkId} signs={signs} />;
            })}
        </group>
    );
};
