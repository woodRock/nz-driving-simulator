import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

interface RoadConeProps {
  position?: [number, number, number];
}

export const RoadCone: React.FC<RoadConeProps> = ({ 
  position = [0, 0, 0] 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [physicsObjectId] = useState(() => `cone_${Math.random().toFixed(5)}`);

  useEffect(() => {
    if (!groupRef.current) return;

    const physicsObject: PhysicsObject = {
        id: physicsObjectId,
        position: groupRef.current.position,
        quaternion: new THREE.Quaternion(),
        size: new THREE.Vector3(0.5, 0.8, 0.5),
        type: 'roadBoundary', // Treat as boundary so hitting it is bad? Or just physical object?
        // Let's make it a 'cone' type so we can decide if hitting it is a fail or just a bump.
        // For now, let's treat it as 'roadBoundary' (fail if hit hard) or 'obstacle'.
        // To be safe, let's register it but maybe not fail immediately unless logic says so.
        // Actually, hitting cones usually means you failed the lane discipline.
        onCollide: () => {}
    };
    PhysicsSystem.registerObject(physicsObject);
    return () => {
        PhysicsSystem.unregisterObject(physicsObjectId);
    };
  }, []);

  return (
    <group ref={groupRef} position={position}>
      {/* Base */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.5, 0.1, 0.5]} />
        <meshStandardMaterial color="orange" />
      </mesh>
      {/* Cone Body */}
      <mesh position={[0, 0.45, 0]}>
         <cylinderGeometry args={[0.05, 0.35, 0.8, 16]} />
         <meshStandardMaterial color="orange" />
      </mesh>
      {/* Reflective Strip 1 */}
      <mesh position={[0, 0.35, 0]}>
         <cylinderGeometry args={[0.18, 0.22, 0.15, 16]} />
         <meshStandardMaterial color="white" />
      </mesh>
       {/* Reflective Strip 2 */}
       <mesh position={[0, 0.6, 0]}>
         <cylinderGeometry args={[0.08, 0.11, 0.1, 16]} />
         <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
};
