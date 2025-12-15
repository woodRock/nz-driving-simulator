import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

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
    const meshGroup = useRef<THREE.Mesh>(null); // Ref for the visual mesh
    const nextPos = useMemo(() => new THREE.Vector3(), []);

    const { start, end, totalDistance } = useMemo(() => {
        const s = new THREE.Vector3(...startPos);
        const e = new THREE.Vector3(...endPos);
        const dist = s.distanceTo(e);
        return { start: s, end: e, totalDistance: dist };
    }, [startPos[0], startPos[1], startPos[2], endPos[0], endPos[1], endPos[2]]);

    // Unique ID for physics system registration
    const physicsObjectId = useRef(`pedestrian_${Math.random().toFixed(5)}`);
    // Pedestrian dimensions for AABB collision
    const pedestrianSize = new THREE.Vector3(0.5, 1.8, 0.5); // Based on boxGeometry args

    useEffect(() => {
        if (!meshGroup.current) return;

        // Register pedestrian with PhysicsSystem
        const pedestrianPhysicsObject: PhysicsObject = {
            id: physicsObjectId.current,
            position: meshGroup.current.position,
            quaternion: new THREE.Quaternion(), // Pedestrians don't typically rotate
            size: pedestrianSize,
            type: 'pedestrian',
            onCollide: (other: PhysicsObject) => {
                console.log(`Pedestrian collided with ${other.type}`);
            }
        };
        PhysicsSystem.registerObject(pedestrianPhysicsObject);

        // Cleanup: unregister on unmount
        return () => {
            PhysicsSystem.unregisterObject(physicsObjectId.current);
        };
    }, []); // Empty dependency array means this runs once on mount and once on unmount

    useFrame((state) => {
        if (!meshGroup.current || totalDistance === 0) return;

        const now = state.clock.getElapsedTime();

        if (now < delay) {
            meshGroup.current.position.copy(start); // Directly update mesh position during delay
            return;
        }

        const distTraveled = (now - delay) * speed;
        const alpha = (distTraveled % totalDistance) / totalDistance;

        nextPos.lerpVectors(start, end, alpha);
        meshGroup.current.position.copy(nextPos); // Directly update mesh position for smooth movement

        // Manually update the PhysicsSystem object's position
        const physicsObject = PhysicsSystem.getObject(physicsObjectId.current);
        if (physicsObject) {
            physicsObject.position.copy(meshGroup.current.position);
        }
    });

    return (
        <mesh ref={meshGroup} position={startPos} castShadow userData={{ type: 'pedestrian' }}> 
            {/* Pedestrian model is ~1.8m tall, so center is 0.9 */}
            <boxGeometry args={[0.5, 1.8, 0.5]} /> {/* Pedestrian-like dimensions */}
            <meshStandardMaterial color={color} />
        </mesh>
    );
};