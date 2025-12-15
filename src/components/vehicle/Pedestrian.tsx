import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';

interface PedestrianProps {
    startPos: [number, number, number];
    endPos: [number, number, number];
    speed?: number;
    delay?: number;
    color?: string;
}

export const Pedestrian: React.FC<PedestrianProps> = ({
    startPos,
    endPos,
    speed = 1.5, // Slower speed for pedestrian
    delay = 0,
    color = '#8E44AD' // Purple color
}) => {
    const rigidBody = useRef<RapierRigidBody>(null);
    const meshGroup = useRef<THREE.Mesh>(null); // Ref for the visual mesh
    const nextPos = useMemo(() => new THREE.Vector3(), []);

    const { start, end, totalDistance } = useMemo(() => {
        const s = new THREE.Vector3(...startPos);
        const e = new THREE.Vector3(...endPos);
        const dist = s.distanceTo(e);
        return { start: s, end: e, totalDistance: dist };
    }, [startPos[0], startPos[1], startPos[2], endPos[0], endPos[1], endPos[2]]);

    useFrame((state) => {
        if (!rigidBody.current || !meshGroup.current || totalDistance === 0) return;

        const now = state.clock.getElapsedTime();

        if (now < delay) {
            rigidBody.current.setNextKinematicTranslation(start);
            meshGroup.current.position.copy(start); // Directly update mesh position during delay
            return;
        }

        const distTraveled = (now - delay) * speed;
        const alpha = (distTraveled % totalDistance) / totalDistance;

        nextPos.lerpVectors(start, end, alpha);
        rigidBody.current.setNextKinematicTranslation(nextPos);
        meshGroup.current.position.copy(nextPos); // Directly update mesh position for smooth movement
    });

    return (
        <RigidBody
            ref={rigidBody}
            type="kinematicPosition"
            position={startPos}
            colliders="cuboid"
            userData={{ type: 'pedestrian' }} // For collision detection
        >
            <mesh ref={meshGroup} position={[0, 0.9, 0]} castShadow> {/* Pedestrian model is ~1.8m tall, so center is 0.9 */}
                <boxGeometry args={[0.5, 1.8, 0.5]} /> {/* Pedestrian-like dimensions */}
                <meshStandardMaterial color={color} />
            </mesh>
        </RigidBody>
    );
};
