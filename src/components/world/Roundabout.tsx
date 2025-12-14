import React from 'react';
import { RigidBody } from '@react-three/rapier';

interface RoundaboutProps {
  position?: [number, number, number];
}

export const Roundabout: React.FC<RoundaboutProps> = ({ position = [0, 0, 0] }) => {
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="trimesh" friction={1}>
        {/* Road Surface Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[4, 10, 32]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
        
        {/* Center Island */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[4, 4, 0.4, 32]} />
          <meshStandardMaterial color="#4CAF50" />
        </mesh>
      </RigidBody>
    </group>
  );
};
