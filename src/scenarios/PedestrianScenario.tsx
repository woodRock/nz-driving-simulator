import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import { RigidBody } from '@react-three/rapier';
import { Cyclist } from '../components/vehicle/Cyclist'; // Reusing Cyclist logic for Pedestrian

export const PedestrianScenario: React.FC = () => {
  const { setMessage, telemetry, failLevel, passLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const failedRef = useRef(false);

  useEffect(() => {
    setMessage('Scenario: Pedestrian Crossing. Give way to the pedestrian!');
  }, [setMessage]);

  useFrame(() => {
    if (finished || failedRef.current) return;
    const { position } = telemetry;

    // Pedestrian crosses at z = -20
    // If player passes z = -20 while pedestrian is on road...
    // We need to know pedestrian state. 
    // For now, let's just use a timer or collision check.
    // Simpler: If player passes z=-15 quickly (before 5 seconds), fail.
    
    if (position.z < -25) {
        passLevel();
        setFinished(true);
    }
  });

  return (
    <group>
       {/* Ground */}
      <RigidBody type="fixed" colliders="cuboid" friction={1} userData={{ type: 'grass' }}>
        <mesh position={[0, -0.6, -20]} receiveShadow>
            <boxGeometry args={[50, 1, 100]} />
            <meshStandardMaterial color="#81c784" />
        </mesh>
      </RigidBody>

      <StraightRoad position={[0, 0, 0]} length={20} />
      <StraightRoad position={[0, 0, -20]} length={20} />
      <StraightRoad position={[0, 0, -40]} length={20} />

      {/* Pedestrian (Reusing Cyclist component for movement) */}
      <Cyclist startPos={[-10, 0.5, -20]} endPos={[10, 0.5, -20]} speed={2} delay={1} />
      
      {/* Crossing Markings (Zebra Crossing) */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh 
            key={i} 
            position={[-4.5 + i, 0.02, -20]} 
            rotation={[-Math.PI/2, 0, 0]}
        >
            <planeGeometry args={[0.6, 4]} />
            <meshStandardMaterial color="white" />
        </mesh>
      ))}

      <Car position={[-2.5, 1, 10]} />
    </group>
  );
};
