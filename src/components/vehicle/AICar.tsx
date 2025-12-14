import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';

interface AICarProps {
    startPos: [number, number, number];
    endPos: [number, number, number];
    speed?: number;
    delay?: number;
    color?: string;
}

export const AICar: React.FC<AICarProps> = ({ startPos, endPos, speed = 5, delay = 0, color = 'red' }) => {
    const rigidBody = useRef<RapierRigidBody>(null);
    const nextPos = useMemo(() => new THREE.Vector3(), []); // Scratch vector

    const { start, end, rotation, totalDistance } = useMemo(() => {
        const s = new THREE.Vector3(...startPos);
        const e = new THREE.Vector3(...endPos);
        const dir = e.clone().sub(s).normalize();
        const dist = s.distanceTo(e);
        const ang = Math.atan2(dir.x, dir.z);
        const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang + Math.PI);
        return { start: s, end: e, rotation: rot, totalDistance: dist };
    }, [startPos[0], startPos[1], startPos[2], endPos[0], endPos[1], endPos[2]]);

    useFrame((state) => {
        if (!rigidBody.current) return;
        
        const now = state.clock.getElapsedTime();
        
        if (now < delay) {
             rigidBody.current.setNextKinematicTranslation(start);
             rigidBody.current.setNextKinematicRotation(rotation);
             return;
        }

        // Linear Interpolation based on Time
        const distTraveled = (now - delay) * speed;
        const alpha = (distTraveled % totalDistance) / totalDistance;
        
        // Calculate position smoothly
        nextPos.lerpVectors(start, end, alpha);

        rigidBody.current.setNextKinematicTranslation(nextPos);
        rigidBody.current.setNextKinematicRotation(rotation);
    });

    return (
        <RigidBody 
            ref={rigidBody} 
            type="kinematicPosition" 
            position={startPos} 
            quaternion={rotation} 
            colliders="cuboid" 
            userData={{ type: 'car' }}
        >
            <group>
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

                {/* Lights (Generic) */}
                <mesh position={[-0.9, 0.5, -2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial color="yellow" />
                </mesh>
                <mesh position={[0.9, 0.5, -2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial color="yellow" />
                </mesh>
                <mesh position={[-0.9, 0.5, 2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial color="red" />
                </mesh>
                <mesh position={[0.9, 0.5, 2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial color="red" />
                </mesh>
            </group>
        </RigidBody>
    );
};
