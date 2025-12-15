import React, { useState, useEffect } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

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

    useEffect(() => {
        const interval = setInterval(() => {
            setBlink((b) => !b);
        }, 400); // Blink every 400ms
        return () => clearInterval(interval);
    }, []);

    // Euler to Quaternion for initial rotation
    const euler = new THREE.Euler(...rotation);

    return (
        <RigidBody
            type="fixed" // Stationary AI cars are fixed
            position={position}
            rotation={[euler.x, euler.y, euler.z]}
            colliders={false}
            userData={userData}
        >
            <CuboidCollider args={[1, 0.5, 2]} position={[0, 0.5, 0]} />

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
        </RigidBody>
    );
};
