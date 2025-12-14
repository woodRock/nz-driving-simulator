
import React, { useEffect } from 'react';
import { RigidBody } from '@react-three/rapier';
import { Roads } from '../components/Roads';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';

export const WellingtonScenario: React.FC = () => {
  const { setMessage, setScore } = useGameStore();

  useEffect(() => {
    setMessage('Welcome to Wellington! Drive around. (Roads are visual guides only)');
    setScore(0);
  }, [setMessage, setScore]);

  return (
    <group>
      {/* Ground Plane */}
      <RigidBody type="fixed" colliders="cuboid" userData={{ type: 'grass' }}>
        <mesh position={[0, -0.6, 0]} receiveShadow>
          <boxGeometry args={[100000, 1, 100000]} />
          <meshStandardMaterial color="#222222" roughness={0.8} />
        </mesh>
      </RigidBody>

      {/* Roads Visuals */}
      <Roads />

      {/* Player Car */}
      <Car />
    </group>
  );
};
