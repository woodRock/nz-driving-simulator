import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

interface SheepProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const Sheep: React.FC<SheepProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0] 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [physicsObjectId] = useState(() => `sheep_${Math.random().toFixed(5)}`);
  
  // Random small movement
  const [offset] = useState(() => Math.random() * 100);

  useEffect(() => {
    if (!groupRef.current) return;
    const initialQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));

    const physicsObject: PhysicsObject = {
        id: physicsObjectId,
        position: groupRef.current.position,
        quaternion: initialQuaternion,
        size: new THREE.Vector3(0.8, 0.8, 1.2), // Rough size
        type: 'pedestrian', // Treat as pedestrian for collision (instant fail)
        onCollide: () => {}
    };
    PhysicsSystem.registerObject(physicsObject);
    return () => {
        PhysicsSystem.unregisterObject(physicsObjectId);
    };
  }, [position, rotation]);

  useFrame((state) => {
      if (groupRef.current) {
          // Idle animation (grazing bob)
          const t = state.clock.getElapsedTime() + offset;
          const headGroup = groupRef.current.getObjectByName('head');
          if (headGroup) {
              headGroup.rotation.x = Math.sin(t * 2) * 0.2 + 0.2; // Nodding
          }
          
          // Sync physics
           const obj = PhysicsSystem.getObject(physicsObjectId);
            if (obj) {
                obj.position.copy(groupRef.current.position);
            }
      }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Body */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.6, 0.5, 0.9]} />
        <meshStandardMaterial color="#EEE" />
      </mesh>
      
      {/* Head */}
      <group name="head" position={[0, 0.7, 0.5]}>
         <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.4]} />
            <meshStandardMaterial color="#DDD" />
         </mesh>
         <mesh position={[0, 0, 0.2]}> {/* Nose */}
             <boxGeometry args={[0.15, 0.15, 0.1]} />
             <meshStandardMaterial color="#111" />
         </mesh>
      </group>

      {/* Legs */}
      <mesh position={[-0.2, 0.15, 0.35]}>
          <cylinderGeometry args={[0.05, 0.05, 0.3]} />
          <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.2, 0.15, 0.35]}>
          <cylinderGeometry args={[0.05, 0.05, 0.3]} />
          <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-0.2, 0.15, -0.35]}>
          <cylinderGeometry args={[0.05, 0.05, 0.3]} />
          <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.2, 0.15, -0.35]}>
          <cylinderGeometry args={[0.05, 0.05, 0.3]} />
          <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
};
