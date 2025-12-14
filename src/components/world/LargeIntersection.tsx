import React from 'react';
import { RigidBody } from '@react-three/rapier';

interface IntersectionProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const LargeIntersection: React.FC<IntersectionProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0] 
}) => {
  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" friction={1} colliders="cuboid">
        {/* Intersection Base */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      </RigidBody>
    </group>
  );
};
