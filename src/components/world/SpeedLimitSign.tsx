import React from 'react';
import { Text } from '@react-three/drei';

interface SpeedLimitSignProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  limit?: number; // e.g. 30, 50, 80, 100
}

export const SpeedLimitSign: React.FC<SpeedLimitSignProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  limit = 50 
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Pole */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3]} />
        <meshStandardMaterial color="#888" />
      </mesh>

      {/* Sign Board */}
      <group position={[0, 2.5, 0.1]}>
        {/* White Circle */}
        <mesh rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.05, 32]} /> {/* Flat facing Z */}
            <meshStandardMaterial color="white" />
        </mesh>
        {/* Red Border */}
        <mesh position={[0, 0, -0.01]} rotation={[Math.PI/2, 0, 0]}> 
             <cylinderGeometry args={[0.45, 0.45, 0.04, 32]} />
             <meshStandardMaterial color="red" />
        </mesh>
        
        {/* Text */}
        <Text 
            position={[0, 0, 0.06]} 
            fontSize={0.4} 
            color="black" 
            anchorX="center" 
            anchorY="middle"
        >
            {limit.toString()}
        </Text>
      </group>
    </group>
  );
};
