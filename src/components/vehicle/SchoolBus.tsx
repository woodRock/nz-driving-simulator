import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

interface SchoolBusProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const SchoolBus: React.FC<SchoolBusProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0] 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [physicsObjectId] = useState(() => `bus_${Math.random().toFixed(5)}`);
  
  // Dimensions
  const width = 2.6;
  const height = 3.0;
  const length = 10.0;
  const busSize = new THREE.Vector3(width, height, length);

  useEffect(() => {
    if (!groupRef.current) return;
    const initialQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));

    const physicsObject: PhysicsObject = {
        id: physicsObjectId,
        position: groupRef.current.position,
        quaternion: initialQuaternion,
        size: busSize,
        type: 'aiCar', // Treat as aiCar for collision logic (fail if hit)
        onCollide: () => {}
    };
    PhysicsSystem.registerObject(physicsObject);

    return () => {
        PhysicsSystem.unregisterObject(physicsObjectId);
    };
  }, [position, rotation]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Body */}
      <mesh position={[0, height/2, 0]} castShadow>
        <boxGeometry args={[width, height, length]} />
        <meshStandardMaterial color="#FFD700" />
      </mesh>

      {/* Windows Strip */}
      <mesh position={[0, height * 0.6, 0]}>
        <boxGeometry args={[width + 0.05, height * 0.3, length * 0.9]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* SCHOOL BUS text (Visual blocks) */}
      <mesh position={[0, height * 0.85, 0]}>
         <boxGeometry args={[width + 0.02, 0.4, 4]} />
         <meshStandardMaterial color="#FFD700" />
      </mesh>

      {/* Wheels */}
      <mesh position={[-1.2, 0.5, 3]} rotation={[0, 0, Math.PI/2]}>
         <cylinderGeometry args={[0.5, 0.5, 0.5, 16]} />
         <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[1.2, 0.5, 3]} rotation={[0, 0, Math.PI/2]}>
         <cylinderGeometry args={[0.5, 0.5, 0.5, 16]} />
         <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[-1.2, 0.5, -3]} rotation={[0, 0, Math.PI/2]}>
         <cylinderGeometry args={[0.5, 0.5, 0.5, 16]} />
         <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[1.2, 0.5, -3]} rotation={[0, 0, Math.PI/2]}>
         <cylinderGeometry args={[0.5, 0.5, 0.5, 16]} />
         <meshStandardMaterial color="black" />
      </mesh>

      {/* Flashing Lights (Static for now, but bright) */}
      <mesh position={[-1, height + 0.1, -length/2 + 0.5]}>
          <boxGeometry args={[0.3, 0.2, 0.3]} />
          <meshStandardMaterial color="orange" emissive="orange" emissiveIntensity={2} />
      </mesh>
      <mesh position={[1, height + 0.1, -length/2 + 0.5]}>
          <boxGeometry args={[0.3, 0.2, 0.3]} />
          <meshStandardMaterial color="orange" emissive="orange" emissiveIntensity={2} />
      </mesh>
    </group>
  );
};
