import React, { useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react'; // Added forwardRef, useImperativeHandle
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

interface CyclistProps {
    startPos: [number, number, number];
    endPos: [number, number, number];
    speed?: number;
    delay?: number;
    color?: string;
}

export const Cyclist = React.memo(forwardRef<THREE.Group, CyclistProps>(({ // Wrapped with forwardRef
    startPos,
    endPos,
    speed = 4, // Moderate speed for cyclist
    delay = 0,
    color = '#0000FF' // Blue color for cyclist
}, ref) => { // Accept ref as second argument
    const innerRef = useRef<THREE.Group>(null); // Changed to THREE.Group
    useImperativeHandle(ref, () => innerRef.current!); // Expose internal ref

    const nextPos = useMemo(() => new THREE.Vector3(), []);

    const { start, end, totalDistance } = useMemo(() => {
        const s = new THREE.Vector3(...startPos);
        const e = new THREE.Vector3(...endPos);
        const dist = s.distanceTo(e);
        return { start: s, end: e, totalDistance: dist };
    }, [startPos[0], startPos[1], startPos[2], endPos[0], endPos[1], endPos[2]]);

    // Unique ID for physics system registration
    const physicsObjectId = useRef(`cyclist_${Math.random().toFixed(5)}`);
    // Cyclist dimensions for AABB collision
    const cyclistSize = new THREE.Vector3(0.5, 1.5, 1.5); // Slimmer and slightly shorter than pedestrian

    useEffect(() => {
        if (!innerRef.current) return;

        // Register cyclist with PhysicsSystem
        const cyclistPhysicsObject: PhysicsObject = {
            id: physicsObjectId.current,
            position: innerRef.current.position,
            quaternion: new THREE.Quaternion(), // Cyclists don't typically rotate much visually along their path
            size: cyclistSize,
            type: 'cyclist',
            onCollide: (_other: PhysicsObject) => { // Changed to _other
                // This is handled by the scenario logic directly calling failLevel on player collision
            }
        };
        PhysicsSystem.registerObject(cyclistPhysicsObject);

        // Cleanup: unregister on unmount
        return () => {
            PhysicsSystem.unregisterObject(physicsObjectId.current);
        };
    }, []); // Empty dependency array means this runs once on mount and once on unmount

    useFrame((state) => {
        if (!innerRef.current || totalDistance === 0) return;

        const now = state.clock.getElapsedTime();

        if (now < delay) {
            innerRef.current.position.copy(start); // Directly update mesh position during delay
            return;
        }

        const distTraveled = (now - delay) * speed;
        const alpha = (distTraveled % totalDistance) / totalDistance; // Loop movement

        nextPos.lerpVectors(start, end, alpha);
        innerRef.current.position.copy(nextPos); // Directly update mesh position for smooth movement

        // Manually update the PhysicsSystem object's position
        const physicsObject = PhysicsSystem.getObject(physicsObjectId.current);
        if (physicsObject) {
            physicsObject.position.copy(innerRef.current.position);
        }
    });

    return (
        <group ref={innerRef} position={startPos} userData={{ type: 'cyclist' }}>
            {/* Simple representation: "Rider" box */}
            <mesh position={[0, 1.0, 0]}>
                <boxGeometry args={[0.3, 1.2, 0.5]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* "Bike" body */}
            <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={[0.1, 0.5, 1.5]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Wheels */}
            <mesh position={[0, 0.5, 0.75]}>
                <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
                <meshStandardMaterial color="black" />
            </mesh>
            <mesh position={[0, 0.5, -0.75]}>
                <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
                <meshStandardMaterial color="black" />
            </mesh>
        </group>
    );
}));