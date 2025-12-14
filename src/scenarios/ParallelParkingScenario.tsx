import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import { RigidBody } from '@react-three/rapier';

export const ParallelParkingScenario: React.FC = () => {
  const { setMessage, telemetry, failLevel, passLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    setMessage('Scenario: Parallel Parking. Park in the green box between the barriers.');
  }, [setMessage]);

  useFrame(() => {
    if (finished) return;
    const { position, speed } = telemetry;

    // Target Spot: x: -4, z: -10 (Left side of road)
    // Box size: 3x6
    // Bounds: x [-5.5, -2.5], z [-13, -7]
    
    if (speed < 0.1 && Date.now() - startTime.current > 3000) {
        // Checking if parked
        if (position.x > -5.5 && position.x < -2.5 && position.z > -13 && position.z < -7) {
            passLevel();
            setFinished(true);
        }
    }
  });

  return (
    <group>
       {/* Ground */}
      <RigidBody type="fixed" colliders="cuboid" friction={1} userData={{ type: 'grass' }}>
        <mesh position={[0, -0.6, -20]} receiveShadow>
            <boxGeometry args={[50, 1, 100]} />
            <meshStandardMaterial color="#90a4ae" />
        </mesh>
      </RigidBody>

      <StraightRoad position={[0, 0, 0]} length={20} />
      <StraightRoad position={[0, 0, -20]} length={20} />

      {/* Parking Spot Marker */}
      <mesh position={[-4, 0.02, -10]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[3, 6]} />
        <meshStandardMaterial color="green" transparent opacity={0.3} />
      </mesh>

      {/* Barriers (representing other cars) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-4, 0.5, -5]} castShadow>
            <boxGeometry args={[2, 1, 4]} />
            <meshStandardMaterial color="red" />
        </mesh>
        <mesh position={[-4, 0.5, -15]} castShadow>
            <boxGeometry args={[2, 1, 4]} />
            <meshStandardMaterial color="blue" />
        </mesh>
      </RigidBody>

      <Car position={[-2.5, 1, 5]} />
    </group>
  );
};
