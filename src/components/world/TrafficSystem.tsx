
import React, { useState, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoadGraph } from '../../utils/RoadGraph';
import { AICar } from '../vehicle/AICar';
import { useGameStore } from '../../store/gameStore';
import { getChunkIdsAround } from '../../utils/geoUtils';

interface TrafficSystemProps {
    features: any[];
}

interface ActiveCar {
    id: string;
    path: THREE.Vector3[];
    color: string;
    speed: number;
    currentChunkId: string; // Track which chunk the car started in
}

const CAR_COUNT = 8; // Reduced count for local area
const ROAD_WIDTH = 20;
const LANE_OFFSET = ROAD_WIDTH / 4; 

export const TrafficSystem: React.FC<TrafficSystemProps> = ({ features }) => {
    const [cars, setCars] = useState<ActiveCar[]>([]);
    const graph = useMemo(() => new RoadGraph(features), [features]);
    const nextSpawnTime = useRef(0);

    const applyLaneOffset = (points: THREE.Vector3[]) => {
        const offsetPoints: THREE.Vector3[] = [];
        if (points.length < 2) return points;

        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            const next = points[i + 1];
            const prev = points[i - 1];

            let dir = new THREE.Vector3();

            if (next) {
                dir.subVectors(next, current).normalize();
            } else if (prev) {
                dir.subVectors(current, prev).normalize();
            }

            // Perpendicular to the left
            const perp = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
            const offset = perp.multiplyScalar(LANE_OFFSET);
            
            offsetPoints.push(current.clone().add(offset));
        }
        return offsetPoints;
    };

    useFrame((state) => {
        if (!graph || features.length === 0) return;

        const now = state.clock.getElapsedTime();
        if (now < nextSpawnTime.current) return;

        const playerPos = useGameStore.getState().telemetry.position;
        // const currentChunkId = getChunkId(playerPos.x, playerPos.z);
        
        // Active area: Current chunk + immediate neighbors (radius 1 = 3x3 grid)
        const activeChunkIds = getChunkIdsAround(playerPos.x, playerPos.z, 1);
        const activeChunkSet = new Set(activeChunkIds);

        setCars(prevCars => {
            // Cull cars that started in chunks no longer active
            // (Simplification: cars might drive INTO active chunks, but generally we want to spawn/despawn based on player locality)
            const keptCars = prevCars.filter(car => activeChunkSet.has(car.currentChunkId));

            if (keptCars.length < CAR_COUNT) {
                // Pick a random chunk from the active set to spawn in
                const spawnChunkId = activeChunkIds[Math.floor(Math.random() * activeChunkIds.length)];
                const spawnNode = graph.getRandomNodeInChunk(spawnChunkId);

                if (spawnNode) {
                    // Don't spawn too close to player?
                    const distToPlayer = spawnNode.position.distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z));
                    
                    if (distToPlayer > 50) { // Minimum 50m spawn distance
                        const rawPath = graph.getRandomPath(spawnNode.id, 10);
                        if (rawPath.length > 1) {
                            const offsetPath = applyLaneOffset(rawPath);
                            const newCar: ActiveCar = {
                                id: `car-${now}-${Math.random()}`,
                                path: offsetPath,
                                color: ['red', 'blue', 'white', 'silver', 'black'][Math.floor(Math.random() * 5)],
                                speed: 8 + Math.random() * 4,
                                currentChunkId: spawnChunkId
                            };
                            keptCars.push(newCar);
                        }
                    }
                }
            }
            return keptCars;
        });

        nextSpawnTime.current = now + 0.5; // Check twice a second
    });

    return (
        <group>
            {cars.map(car => (
                <AICar
                    key={car.id}
                    pathPoints={car.path}
                    speed={car.speed}
                    color={car.color}
                />
            ))}
        </group>
    );
};
