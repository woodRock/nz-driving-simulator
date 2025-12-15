import React, { useRef, useMemo, useState, useEffect, forwardRef, useImperativeHandle } from 'react'; // Import forwardRef and useImperativeHandle
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

interface AICarProps {
    startPos: [number, number, number];
    endPos: [number, number, number];
    speed?: number;
    delay?: number;
    color?: string;
    indicatingLeft?: boolean;
    indicatingRight?: boolean;
    rotation?: [number, number, number]; // New prop for fixed rotation
}

// Wrap the component with forwardRef
export const AICar = forwardRef<RapierRigidBody, AICarProps>(({ // Specify types for forwardRef
    startPos,
    endPos,
    speed = 5,
    delay = 0,
    color = 'red',
    indicatingLeft = false,
    indicatingRight = false,
    rotation: initialRotation = [0, 0, 0] // New prop, default to [0,0,0]
}, ref) => { // 'ref' is now passed as the second argument
    const rigidBody = useRef<RapierRigidBody>(null);
    const meshGroup = useRef<THREE.Group>(null); // Ref for the visual mesh group
    const nextPos = useMemo(() => new THREE.Vector3(), []);

    // Expose the internal rigidBody ref via the forwarded ref
    useImperativeHandle(ref, () => rigidBody.current!);

    // Indicator blinking state
    const [blink, setBlink] = useState(false);
    useEffect(() => {
        const interval = setInterval(() => {
            setBlink((b) => !b);
        }, 400); // Blink every 400ms
        return () => clearInterval(interval);
    }, []);

    const { start, end, rotationQuaternion, totalDistance } = useMemo(() => { // Renamed for clarity
        const s = new THREE.Vector3(...startPos);
        const e = new THREE.Vector3(...endPos);
        const dist = s.distanceTo(e);
        
        // Convert initialRotation (Euler) to Quaternion
        const rotQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...initialRotation));

        return { start: s, end: e, rotationQuaternion: rotQuat, totalDistance: dist };
    }, [startPos[0], startPos[1], startPos[2], endPos[0], endPos[1], endPos[2], initialRotation[0], initialRotation[1], initialRotation[2]]);

    useFrame((state) => {
        if (!rigidBody.current || !meshGroup.current || totalDistance === 0) return;

        const now = state.clock.getElapsedTime();

        if (now < delay) {
            rigidBody.current.setNextKinematicTranslation(start);
            rigidBody.current.setNextKinematicRotation(rotationQuaternion); // Set initial rotation
            meshGroup.current.position.copy(start); // Directly update mesh position during delay
            meshGroup.current.quaternion.copy(rotationQuaternion); // Directly update mesh rotation during delay
            return;
        }

        const distTraveled = (now - delay) * speed;
        // Using modulo to make it loop back and forth
        const alpha = (distTraveled % totalDistance) / totalDistance;

        nextPos.lerpVectors(start, end, alpha);
        
        rigidBody.current.setNextKinematicTranslation(nextPos);
        rigidBody.current.setNextKinematicRotation(rotationQuaternion); // Maintain overall fixed rotation

        meshGroup.current.position.copy(nextPos); // Directly update mesh position for smooth movement
        meshGroup.current.quaternion.copy(rotationQuaternion); // Keep mesh group in sync

        // --- DEBUGGING OUTPUT ---
        console.log(`
            AICar Debug:
            start: (${start.x.toFixed(2)}, ${start.y.toFixed(2)}, ${start.z.toFixed(2)})
            end: (${end.x.toFixed(2)}, ${end.y.toFixed(2)}, ${end.z.toFixed(2)})
            nextPos: (${nextPos.x.toFixed(2)}, ${nextPos.y.toFixed(2)}, ${nextPos.z.toFixed(2)})
            rigidBody.translation: (${rigidBody.current.translation().x.toFixed(2)}, ${rigidBody.current.translation().y.toFixed(2)}, ${rigidBody.current.translation().z.toFixed(2)})
            meshGroup.position: (${meshGroup.current.position.x.toFixed(2)}, ${meshGroup.current.position.y.toFixed(2)}, ${meshGroup.current.position.z.toFixed(2)})
        `);
        // --- END DEBUGGING OUTPUT ---
    });

    return (
        <RigidBody
            ref={rigidBody}
            type="kinematicPosition"
            position={start.toArray()} // RE-ADDED: Initial position for the RigidBody
            quaternion={rotationQuaternion} // Initial rotation for the RigidBody
            colliders={false} // Use CuboidCollider for precise collision
            userData={{ type: 'car' }} // For collision detection
        >
            <CuboidCollider args={[1, 0.5, 2]} position={[0, 0.5, 0]} />

            <group ref={meshGroup}>
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
        </RigidBody>
    );
});
