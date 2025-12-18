import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

interface FlushMedianRoadProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  length?: number;
}

export const FlushMedianRoad: React.FC<FlushMedianRoadProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  length = 20
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const physicsObjectId = useRef(`flushMedian_${Math.random().toFixed(5)}`);
  
  // Total width: 14m (5m lane + 4m median + 5m lane)
  const width = 14; 
  const medianWidth = 4;

  useEffect(() => {
    if (!groupRef.current) return;
    const initialQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));

    const physicsObject: PhysicsObject = {
        id: physicsObjectId.current,
        position: groupRef.current.position,
        quaternion: initialQuaternion,
        size: new THREE.Vector3(width, 0.1, length),
        type: 'road',
        onCollide: () => {}
    };
    PhysicsSystem.registerObject(physicsObject);
    return () => {
        PhysicsSystem.unregisterObject(physicsObjectId.current);
    };
  }, [position, rotation, length]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Road Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* Median Base (slightly lighter or marked) */}
      {/* Actually just paint lines */}

      {/* Left Lane Boundary (White) */}
      <mesh position={[-medianWidth/2, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, length]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Right Lane Boundary (White) */}
      <mesh position={[medianWidth/2, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, length]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Diagonal Stripes in Median */}
      {Array.from({ length: Math.floor(length / 2) }).map((_, i) => (
         <mesh 
            key={i} 
            position={[0, 0.01, -length/2 + 1 + i*2]} 
            rotation={[-Math.PI / 2, 0, Math.PI / 4]} // 45 deg stripes
         >
            <planeGeometry args={[0.3, 3]} /> {/* Adjusted size */}
            <meshStandardMaterial color="white" />
         </mesh>
      ))}
    </group>
  );
};
