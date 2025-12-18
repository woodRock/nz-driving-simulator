
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
const ROAD_WIDTH = 12; // Matches RoadChunk.tsx
const LANE_OFFSET = ROAD_WIDTH / 5; 

export const TrafficSystem: React.FC<TrafficSystemProps> = ({ features }) => {
    const [cars, setCars] = useState<ActiveCar[]>([]);
    const graph = useMemo(() => new RoadGraph(features), [features]);
    const nextSpawnTime = useRef(0);

    const applyLaneOffset = (points: THREE.Vector3[]) => {
        const offsetPoints: THREE.Vector3[] = [];
        if (points.length < 2) return points;

        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            
            let dir1 = new THREE.Vector3();
            let dir2 = new THREE.Vector3();
            
            if (i > 0) {
                dir1.subVectors(current, points[i-1]).normalize();
            }
            if (i < points.length - 1) {
                dir2.subVectors(points[i+1], current).normalize();
            } else {
                dir2.copy(dir1); // Use prev direction if at end
            }
            if (i === 0) dir1.copy(dir2); // Use next direction if at start

            // Average direction
            const avgDir = new THREE.Vector3().addVectors(dir1, dir2).normalize();
            
            // Perpendicular to the left (Left Hand Traffic)
            const perp = new THREE.Vector3(0, 1, 0).cross(avgDir).normalize();
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
        if (isNaN(playerPos.x) || isNaN(playerPos.z)) {
            console.warn("TrafficSystem: Player position is NaN", playerPos);
            return;
        }
        
        // Active area: Current chunk + immediate neighbors (radius 1 = 3x3 grid)
        const activeChunkIds = getChunkIdsAround(playerPos.x, playerPos.z, 1);
        const activeChunkSet = new Set(activeChunkIds);

        setCars(prevCars => {
            // Cull cars that started in chunks no longer active
            const keptCars = prevCars.filter(car => activeChunkSet.has(car.currentChunkId));

            if (keptCars.length < CAR_COUNT) {
                // Pick a random chunk from the active set to spawn in
                const spawnChunkId = activeChunkIds[Math.floor(Math.random() * activeChunkIds.length)];
                const spawnNode = graph.getRandomNodeInChunk(spawnChunkId);

                if (spawnNode) {
                    const distToPlayer = spawnNode.position.distanceTo(new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z));
                    
                    if (distToPlayer > 50) { 
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
                            console.log(`TrafficSystem: Spawned car at chunk ${spawnChunkId}, total cars: ${keptCars.length}`);
                        } else {
                            console.log(`TrafficSystem: Failed to get random path from node ${spawnNode.id}`);
                        }
                    }
                } else {
                    // console.log(`TrafficSystem: No nodes found in chunk ${spawnChunkId}`);
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
