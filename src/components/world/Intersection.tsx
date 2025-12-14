import React from 'react';
import { RigidBody } from '@react-three/rapier';

interface IntersectionProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const Intersection: React.FC<IntersectionProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0] 
}) => {
  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" friction={1}>
        {/* Intersection Base */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[10.2, 10.2]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      </RigidBody>

      {/* Markings can be added here, for now keeping it simple */}
      {/* Example: Stop lines or Give Way lines could be added based on props */}
    </group>
  );
};
