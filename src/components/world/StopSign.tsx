import React from 'react';
import { RigidBody } from '@react-three/rapier';

export const StopSign: React.FC<{ position: [number, number, number], rotation?: [number, number, number] }> = ({ position, rotation = [0, 0, 0] }) => {
  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders="hull">
        {/* Pole */}
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 2]} />
          <meshStandardMaterial color="gray" />
        </mesh>
        
        {/* Sign (Octagon) */}
        <mesh position={[0, 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.05, 8]} />
            <meshStandardMaterial color="#b71c1c" />
        </mesh>
        <mesh position={[0, 2, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
             {/* Inner text placeholder (white ring for now) */}
            <cylinderGeometry args={[0.35, 0.35, 0.05, 8]} />
            <meshStandardMaterial color="#b71c1c" />
        </mesh>
      </RigidBody>
    </group>
  );
};
