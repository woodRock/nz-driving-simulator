import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';

interface CyclistProps {
    startPos: [number, number, number];
    endPos: [number, number, number];
    speed?: number;
    delay?: number;
}

export const Cyclist: React.FC<CyclistProps> = ({ startPos, endPos, speed = 3, delay = 0 }) => {
    const rigidBody = useRef<RapierRigidBody>(null);
    const nextPos = useMemo(() => new THREE.Vector3(), []);

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

        const distTraveled = (now - delay) * speed;
        const alpha = (distTraveled % totalDistance) / totalDistance;
        
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
            userData={{ type: 'cyclist' }}
        >
            <group>
                {/* Bike Frame */}
                <mesh position={[0, 0.5, 0]} castShadow>
                    <boxGeometry args={[0.2, 0.5, 1.5]} />
                    <meshStandardMaterial color="yellow" />
                </mesh>
                {/* Rider */}
                <mesh position={[0, 1.2, 0]} castShadow>
                    <sphereGeometry args={[0.3]} />
                    <meshStandardMaterial color="blue" />
                </mesh>
            </group>
        </RigidBody>
    );
};
