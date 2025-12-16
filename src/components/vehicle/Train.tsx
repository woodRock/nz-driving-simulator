import React, { useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

interface TrainProps {
    startPos: [number, number, number];
    endPos: [number, number, number];
    speed?: number;
    delay?: number;
    color?: string;
    onCycleComplete?: () => void; // New prop: callback when train completes its path
}

export const Train = React.memo(forwardRef<THREE.Group, TrainProps>(({
    startPos,
    endPos,
    speed = 50, // Very high speed for a train
    delay = 0,
    color = '#424242', // Dark grey for train
    onCycleComplete // Destructure new prop
}, ref) => { // Accept ref as second argument
    const innerRef = useRef<THREE.Group>(null); // Ref for the visual group, changed to THREE.Group
    useImperativeHandle(ref, () => innerRef.current!); // Expose internal ref

    const nextPos = useMemo(() => new THREE.Vector3(), []);
    const hasCompletedCycle = useRef(false); // New ref to track completion of one path cycle

    const { start, end, totalDistance } = useMemo(() => {
        const s = new THREE.Vector3(...startPos);
        const e = new THREE.Vector3(...endPos);
        const dist = s.distanceTo(e);
        return { start: s, end: e, totalDistance: dist };
    }, [startPos[0], startPos[1], startPos[2], endPos[0], endPos[1], endPos[2]]);

    // Calculate initial rotation to face the direction of travel
    const initialRotation = useMemo(() => {
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const quaternion = new THREE.Quaternion();
        const forwardVector = new THREE.Vector3(0, 0, 1); 
        quaternion.setFromUnitVectors(forwardVector, direction);
        return quaternion;
    }, [start, end]);

    // Unique ID for physics system registration
    const physicsObjectId = useRef(`train_${Math.random().toFixed(5)}`);
    // Train dimensions for AABB collision
    const trainSize = new THREE.Vector3(3, 4, 20); // Longer and taller for a train

    useEffect(() => {
        console.log(`Train ${physicsObjectId.current} mounted. initial position:`, startPos);
        if (!innerRef.current) return;
        hasCompletedCycle.current = false; // Reset on prop change or remount if needed, though scenario will re-render

        // Register train with PhysicsSystem
        const trainPhysicsObject: PhysicsObject = {
            id: physicsObjectId.current,
            position: innerRef.current.position,
            quaternion: innerRef.current.quaternion, // Use actual mesh quaternion
            size: trainSize,
            type: 'train',
            onCollide: (other: PhysicsObject) => {
                if (other.type === 'playerCar') {
                    // This is handled by the scenario logic directly calling failLevel on player collision
                }
            }
        };
        PhysicsSystem.registerObject(trainPhysicsObject);

        // Cleanup: unregister on unmount
        return () => {
            PhysicsSystem.unregisterObject(physicsObjectId.current);
            console.log(`Train ${physicsObjectId.current} unmounted.`);
        };
    }, [startPos, endPos, speed, delay]); // Added dependencies to re-register if these props change

    useFrame((state) => {
        if (!innerRef.current || totalDistance === 0) return; // Basic checks

        if (hasCompletedCycle.current) { // If already completed, just stay at end position
            innerRef.current.position.copy(end); // Ensure it stays at the end
            // Manually update the PhysicsSystem object's position (important even if not moving)
            const physicsObject = PhysicsSystem.getObject(physicsObjectId.current);
            if (physicsObject) {
                physicsObject.position.copy(innerRef.current.position);
            }
            return;
        }

        const now = state.clock.getElapsedTime();

        if (now < delay) {
            innerRef.current.position.copy(start);
            // Manually update the PhysicsSystem object's position
            const physicsObject = PhysicsSystem.getObject(physicsObjectId.current);
            if (physicsObject) {
                physicsObject.position.copy(innerRef.current.position);
            }
            return;
        }

        const distTraveled = (now - delay) * speed;
        let alpha = distTraveled / totalDistance;

        if (alpha >= 1) { // Train has reached or passed the end point
            innerRef.current.position.copy(end); // Ensure it's exactly at the end
            if (!hasCompletedCycle.current) {
                hasCompletedCycle.current = true;
                console.log(`Train ${physicsObjectId.current} completed cycle. Calling onCycleComplete.`);
                onCycleComplete?.(); // Call the callback only once
            }
            // Manually update the PhysicsSystem object's position
            const physicsObject = PhysicsSystem.getObject(physicsObjectId.current);
            if (physicsObject) {
                physicsObject.position.copy(innerRef.current.position);
            }
            return; // Stop movement logic for this cycle
        }
        
        // Move to current position (if not completed yet)
        nextPos.lerpVectors(start, end, alpha); 
        innerRef.current.position.copy(nextPos);

        // Debugging Train position
        // if (state.clock.elapsedTime % 1 < state.clock.delta) { // Log approximately once per second
        //     console.log(`Train ${physicsObjectId.current} Pos: X=${innerRef.current.position.x.toFixed(2)}, Z=${innerRef.current.position.z.toFixed(2)}`);
        // }
        
        // Manually update the PhysicsSystem object's position and quaternion
        const physicsObject = PhysicsSystem.getObject(physicsObjectId.current);
        if (physicsObject) {
            physicsObject.position.copy(innerRef.current.position);
        }
    });

    return (
        <group ref={innerRef} position={startPos} quaternion={initialRotation} userData={{ type: 'train' }}>
            {/* Main body */}
            <mesh position={[0, 2, 0]}> 
                <boxGeometry args={[3, 4, 20]} /> 
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Cabin */}
            <mesh position={[0, 4.5, -8]}>
                <boxGeometry args={[2.5, 3, 4]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Wheels (simplified) */}
            <group> {/* Encapsulate all wheels in a group */}
                {Array.from({ length: 5 }).map((_, i) => (
                    <mesh key={i} position={[0, 0.5, -8 + i * 4]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[1, 1, 0.5, 8]} />
                        <meshStandardMaterial color="black" />
                    </mesh>
                ))}
            </group>
        </group>
    );
}));