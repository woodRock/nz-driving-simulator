import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

interface StationaryAICarProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    color?: string;
    indicatingLeft?: boolean;
    indicatingRight?: boolean;
    userData?: any; // To pass custom data for collision detection if needed
}

export const StationaryAICar: React.FC<StationaryAICarProps> = ({
    position = [0, 1, 0],
    rotation = [0, 0, 0],
    color = '#2196F3', // Default blue, same as player car
    indicatingLeft = false,
    indicatingRight = false,
    userData = { type: 'car' }
}) => {
    // Indicator blinking state
    const [blink, setBlink] = useState(false);

    // Unique ID for physics system registration
    const physicsObjectId = useRef(`stationaryAICar_${Math.random().toFixed(5)}`);
    // Car dimensions for AABB collision
    const carSize = new THREE.Vector3(2, 1, 4); // Based on main car body boxGeometry args
    
    // Convert initialRotation to a Quaternion once
    const initialQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));

    // Ref for the visual group to get its position for physics registration
    const visualGroupRef = useRef<THREE.Group>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setBlink((b) => !b);
        }, 400); // Blink every 400ms
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!visualGroupRef.current) return;

        // Register stationary AI car with PhysicsSystem
        const stationaryAICarPhysicsObject: PhysicsObject = {
            id: physicsObjectId.current,
            position: visualGroupRef.current.position, // Use visual group's position
            quaternion: initialQuaternion, // Use initial quaternion
            size: carSize,
            type: userData.type, // Use provided userData type, default to 'car'
            // onCollide: (other: PhysicsObject) => {
            //     console.log(`StationaryAICar collided with ${other.type}`);
            // }
        };
        PhysicsSystem.registerObject(stationaryAICarPhysicsObject);

        // Cleanup: unregister on unmount
        return () => {
            PhysicsSystem.unregisterObject(physicsObjectId.current);
        };
    }, [initialQuaternion, userData.type]); // Depend on initialQuaternion and userData.type

    return (
        <group
            ref={visualGroupRef}
            position={position}
            quaternion={initialQuaternion}
            userData={userData}
        >
            {/* Car Body */}
            <mesh position={[0, 0.5, 0]} castShadow>
                <boxGeometry args={[2, 1, 4]} />
                <meshStandardMaterial color={color} />
            </mesh>

            {/* Wheels */}
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

            {/* Windshield */}
            <mesh position={[0, 0.9, -0.5]}>
                <boxGeometry args={[1.8, 0.6, 1.5]} />
                <meshStandardMaterial color="#87CEEB" transparent opacity={0.7} />
            </mesh>

            {/* Indicators */}
            {/* Front Left */}
            <mesh position={[-0.9, 0.5, -2.05]}>
                <boxGeometry args={[0.4, 0.2, 0.1]} />
                <meshStandardMaterial
                    color={indicatingLeft && blink ? "#FFAA00" : "#333"}
                    emissive={indicatingLeft && blink ? "#FFAA00" : "#000"}
                    emissiveIntensity={2}
                />
            </mesh>
            {/* Rear Left */}
            <mesh position={[-0.9, 0.5, 2.05]}>
                <boxGeometry args={[0.4, 0.2, 0.1]} />
                <meshStandardMaterial
                    color={indicatingLeft && blink ? "#FFAA00" : "#333"}
                    emissive={indicatingLeft && blink ? "#FFAA00" : "#000"}
                    emissiveIntensity={2}
                />
            </mesh>

            {/* Front Right */}
            <mesh position={[0.9, 0.5, -2.05]}>
                <boxGeometry args={[0.4, 0.2, 0.1]} />
                <meshStandardMaterial
                    color={indicatingRight && blink ? "#FFAA00" : "#333"}
                    emissive={indicatingRight && blink ? "#FFAA00" : "#000"}
                    emissiveIntensity={2}
                />
            </mesh>
            {/* Rear Right */}
            <mesh position={[0.9, 0.5, 2.05]}>
                <boxGeometry args={[0.4, 0.2, 0.1]} />
                <meshStandardMaterial
                    color={indicatingRight && blink ? "#FFAA00" : "#333"}
                    emissive={indicatingRight && blink ? "#FFAA00" : "#000"}
                    emissiveIntensity={2}
                />
            </mesh>
        </group>
    );
};