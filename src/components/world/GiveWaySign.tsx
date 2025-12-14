import React from 'react';
import { RigidBody } from '@react-three/rapier';

export const GiveWaySign: React.FC<{ position: [number, number, number], rotation?: [number, number, number] }> = ({ position, rotation = [0, 0, 0] }) => {
  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders="hull">
        {/* Pole */}
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 2]} />
          <meshStandardMaterial color="gray" />
        </mesh>
        
        {/* Sign */}
        <mesh position={[0, 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.05, 3]} />
            <meshStandardMaterial color="white" />
        </mesh>
         <mesh position={[0, 2, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 3]} />
            <meshStandardMaterial color="red" />
        </mesh>
         <mesh position={[0, 2, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 3]} />
            <meshStandardMaterial color="white" />
        </mesh>
      </RigidBody>
    </group>
  );
};
