import React from 'react';
import { RigidBody } from '@react-three/rapier';

interface StraightRoadProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  length?: number;
}

export const StraightRoad: React.FC<StraightRoadProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  length = 10 
}) => {
  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" friction={1}>
        {/* Road Base */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[10, length]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      </RigidBody>

      {/* Center Line (Dashed) */}
      {Array.from({ length: Math.floor(length / 2) }).map((_, i) => (
        <mesh 
          key={i} 
          position={[0, 0.01, -length / 2 + 1 + i * 2]} 
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.1, 1]} />
          <meshStandardMaterial color="white" />
        </mesh>
      ))}

      {/* Left Edge Line */}
      <mesh position={[-4.8, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, length]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Right Edge Line */}
      <mesh position={[4.8, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, length]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
};
