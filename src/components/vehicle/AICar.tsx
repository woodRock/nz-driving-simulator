import React, { useRef, useMemo, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem'; // Import PhysicsSystem

interface AICarProps {
    startPos: [number, number, number];
    endPos: [number, number, number];
    speed?: number;
    delay?: number;
    color?: string;
    indicatingLeft?: boolean;
    indicatingRight?: boolean;
    rotation?: [number, number, number];
}

// Now AICar is purely a visual component, it manages its own movement and reports its position.
// It no longer directly interacts with a physics engine's RigidBody.
export const AICar = React.memo(forwardRef<THREE.Group, AICarProps>(({
    startPos,
    endPos,
    speed = 5,
    delay = 0,
    color = 'red',
    indicatingLeft = false,
    indicatingRight = false,
    rotation: initialRotation = [0, 0, 0]
}, ref) => {
    // The innerRef now refers to the main THREE.Group of the visual car model.
    const innerRef = useRef<THREE.Group>(null);
    useImperativeHandle(ref, () => innerRef.current!);

    const [blink, setBlink] = useState(false);
    
    const timeElapsed = useRef(0);
    const isDelaying = useRef(true);
    const delayTimer = useRef(0);

    const { startVec, endVec, totalTime, rotationQuaternion } = useMemo(() => {
        const s = new THREE.Vector3(...startPos);
        const e = new THREE.Vector3(...endPos);
        const dist = s.distanceTo(e);
        
        const calculatedTotalTime = dist / speed;

        const rotQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...initialRotation));
        
        return { startVec: s, endVec: e, totalTime: calculatedTotalTime, rotationQuaternion: rotQuat };
    }, [startPos[0], startPos[1], startPos[2], endPos[0], endPos[1], endPos[2], speed, initialRotation[0]]);

    useEffect(() => {
        const interval = setInterval(() => setBlink((b) => !b), 400); 
        return () => clearInterval(interval);
    }, []);

    // Unique ID for physics system registration
    const physicsObjectId = useRef(`aiCar_${Math.random().toFixed(5)}`);
    // Car dimensions for AABB collision
    const carSize = new THREE.Vector3(2, 1, 4); // Based on main car body boxGeometry args

    useEffect(() => {
        if (!innerRef.current) return;

        // Register AI car with PhysicsSystem
        const aiCarPhysicsObject: PhysicsObject = {
            id: physicsObjectId.current,
            position: innerRef.current.position,
            quaternion: innerRef.current.quaternion,
            size: carSize,
            type: 'aiCar',
            onCollide: (other: PhysicsObject) => {
                // AI cars don't typically fail the scenario, but we can log collisions
                // console.log(`AICar collided with ${other.type}`);
            }
        };
        PhysicsSystem.registerObject(aiCarPhysicsObject);

        // Cleanup: unregister on unmount
        return () => {
            PhysicsSystem.unregisterObject(physicsObjectId.current);
        };
    }, []); // Empty dependency array means this runs once on mount and once on unmount

    useFrame((_, delta) => {
        if (!innerRef.current) return;

        // --- HANDLE DELAY ---
        if (isDelaying.current) {
            delayTimer.current += delta;
            if (delayTimer.current >= delay) {
                isDelaying.current = false;
            }
            // Hold at start position
            innerRef.current.position.copy(startVec);
            innerRef.current.quaternion.copy(rotationQuaternion);
            return;
        }

        timeElapsed.current += delta;
        let alpha = Math.min(1, timeElapsed.current / totalTime);

        // --- HANDLE LOOP ---
        if (alpha >= 1) {
            timeElapsed.current = 0; // Reset for loop
            alpha = 0; // Reset alpha to start
        }

        // --- MOVE ---
        const nextPosition = new THREE.Vector3().lerpVectors(startVec, endVec, alpha);
        
        // Manually update visual model's position and rotation
        innerRef.current.position.copy(nextPosition);
        innerRef.current.quaternion.copy(rotationQuaternion);

        // Manually update the PhysicsSystem object's position and quaternion
        const physicsObject = PhysicsSystem.getObject(physicsObjectId.current);
        if (physicsObject) {
            physicsObject.position.copy(innerRef.current.position);
            physicsObject.quaternion.copy(innerRef.current.quaternion);
        }
    });

    return (
        <group 
            ref={innerRef}
            position={[startVec.x, startVec.y, startVec.z]} 
            rotation={initialRotation}
            userData={{ type: 'aiCar' }} // Custom user data for identification
        >
            {/* The visual model of the car */}
            <mesh position={[0, 0.5, 0]} castShadow>
                <boxGeometry args={[2, 1, 4]} />
                <meshStandardMaterial color={color} />
            </mesh>

            <group>
                <mesh position={[-1.1, 0.25, 1.2]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                <mesh position={[1.1, 0.25, 1.2]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                <mesh position={[-1.1, 0.25, -1.2]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                <mesh position={[1.1, 0.25, -1.2]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                    <meshStandardMaterial color="black" />
                </mesh>
            </group>

            <mesh position={[0, 0.9, -0.5]}>
                <boxGeometry args={[1.8, 0.6, 1.5]} />
                <meshStandardMaterial color="#87CEEB" transparent opacity={0.7} />
            </mesh>

            <group>
                <mesh position={[-0.9, 0.5, -2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial
                        color={indicatingLeft && blink ? "#FFAA00" : "#333"}
                        emissive={indicatingLeft && blink ? "#FFAA00" : "#000"}
                        emissiveIntensity={2}
                    />
                </mesh>
                <mesh position={[-0.9, 0.5, 2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial
                        color={indicatingLeft && blink ? "#FFAA00" : "#333"}
                        emissive={indicatingLeft && blink ? "#FFAA00" : "#000"}
                        emissiveIntensity={2}
                    />
                </mesh>
                <mesh position={[0.9, 0.5, -2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial
                        color={indicatingRight && blink ? "#FFAA00" : "#333"}
                        emissive={indicatingRight && blink ? "#FFAA00" : "#000"}
                        emissiveIntensity={2}
                    />
                </mesh>
                <mesh position={[0.9, 0.5, 2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial
                        color={indicatingRight && blink ? "#FFAA00" : "#333"}
                        emissive={indicatingRight && blink ? "#FFAA00" : "#000"}
                        emissiveIntensity={2}
                    />
                </mesh>
            </group>
        </group>
    );
}));