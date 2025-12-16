import React, { useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react'; // Added forwardRef, useImperativeHandle
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

interface PedestrianProps {
    startPos: [number, number, number];
    endPos: [number, number, number];
    speed?: number;
    // delay?: number; // Removed internal delay handling
    color?: string;
    active?: boolean; // New prop
}

export const Pedestrian = React.memo(forwardRef<THREE.Group, PedestrianProps>(({ // Wrapped with forwardRef
    startPos,
    endPos,
    speed = 1.5, // Slower speed for pedestrian
    // delay = 0, // Removed internal delay handling
    color = '#8E44AD', // Purple color
    active = false // Default to not active
}, ref) => { // Accept ref as second argument
    const innerRef = useRef<THREE.Group>(null); // Changed to THREE.Group
    useImperativeHandle(ref, () => innerRef.current!); // Expose internal ref

    const nextPos = useMemo(() => new THREE.Vector3(), []);

    // Time when pedestrian was activated, to ensure movement starts correctly
    const activationTime = useRef<number | null>(null);

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
        if (!innerRef.current) return;

        // Register pedestrian with PhysicsSystem
        const pedestrianPhysicsObject: PhysicsObject = {
            id: physicsObjectId.current,
            position: innerRef.current.position,
            quaternion: new THREE.Quaternion(), // Pedestrians don't typically rotate
            size: pedestrianSize,
            type: 'pedestrian',
            onCollide: (_other: PhysicsObject) => {
                // console.log(`Pedestrian collided with ${_other.type}`); // Removed debug log
            }
        };
        PhysicsSystem.registerObject(pedestrianPhysicsObject);

        // Cleanup: unregister on unmount
        return () => {
            PhysicsSystem.unregisterObject(physicsObjectId.current);
        };
    }, []); // Empty dependency array means this runs once on mount and once on unmount

    useFrame((state) => {
        if (!innerRef.current || totalDistance === 0) return;

        // Only move if active prop is true
        if (!active) {
            innerRef.current.position.copy(start); // Keep at start position if not active
            activationTime.current = null; // Reset activation time
            return;
        }

        // If just activated, record the current time
        if (activationTime.current === null) {
            activationTime.current = state.clock.getElapsedTime();
        }

        const now = state.clock.getElapsedTime();
        const elapsedTimeSinceActivation = now - activationTime.current;

        const distTraveled = elapsedTimeSinceActivation * speed;
        // If pedestrian goes past end, reset to start or stop
        const alpha = Math.min(1, distTraveled / totalDistance); // Clamp alpha at 1 to stop at endPos

        nextPos.lerpVectors(start, end, alpha);
        innerRef.current.position.copy(nextPos); // Directly update mesh position for smooth movement

        // Manually update the PhysicsSystem object's position
        const physicsObject = PhysicsSystem.getObject(physicsObjectId.current);
        if (physicsObject) {
            physicsObject.position.copy(innerRef.current.position);
        }
    });

    return (
        <group ref={innerRef} position={startPos} castShadow userData={{ type: 'pedestrian' }}> 
            {/* Pedestrian model is ~1.8m tall, so center is 0.9 */}
            <mesh position={[0, 1.0, 0]}>
                <boxGeometry args={[0.5, 1.8, 0.5]} /> {/* Pedestrian-like dimensions */}
                <meshStandardMaterial color={color} />
            </mesh>
        </group>
    );
}));