import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

interface OneLaneBridgeProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  length?: number;
}

export const OneLaneBridge: React.FC<OneLaneBridgeProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  length = 20
}) => {
  const bridgeRef = useRef<THREE.Group>(null);
  const physicsObjectId = useRef(`bridge_${Math.random().toFixed(5)}`);
  
  // Bridge width is narrower than normal road (which is 10). Let's say 4.5.
  const bridgeWidth = 4.5;
  const bridgeSize = new THREE.Vector3(bridgeWidth, 0.5, length); 

  useEffect(() => {
    if (!bridgeRef.current) return;
    const initialQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));

    const bridgePhysicsObject: PhysicsObject = {
        id: physicsObjectId.current,
        position: bridgeRef.current.position,
        quaternion: initialQuaternion,
        size: bridgeSize,
        type: 'road', // Treat as road for physics so we don't fall through
        onCollide: () => {}
    };
    PhysicsSystem.registerObject(bridgePhysicsObject);

    return () => {
        PhysicsSystem.unregisterObject(physicsObjectId.current);
    };
  }, [position, rotation, length]);

  return (
    <group ref={bridgeRef} position={position} rotation={rotation}>
      {/* Bridge Deck */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[bridgeWidth, 0.5, length]} />
        <meshStandardMaterial color="#555555" /> 
      </mesh>

      {/* Railings */}
      <mesh position={[-bridgeWidth/2 + 0.1, 0.75, 0]}>
         <boxGeometry args={[0.2, 1, length]} />
         <meshStandardMaterial color="#888888" />
      </mesh>
      <mesh position={[bridgeWidth/2 - 0.1, 0.75, 0]}>
         <boxGeometry args={[0.2, 1, length]} />
         <meshStandardMaterial color="#888888" />
      </mesh>

      {/* Supports (Visual only) */}
      <mesh position={[0, -2, -length/2 + 2]}>
          <cylinderGeometry args={[0.5, 0.5, 4]} />
          <meshStandardMaterial color="#444" />
      </mesh>
      <mesh position={[0, -2, length/2 - 2]}>
          <cylinderGeometry args={[0.5, 0.5, 4]} />
          <meshStandardMaterial color="#444" />
      </mesh>
    </group>
  );
};
