import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';

import { useGameStore } from '../store/gameStore';
import { RigidBody } from '@react-three/rapier';

export const CyclistHazardScenario: React.FC = () => {
  const { setMessage, telemetry, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    setMessage('Scenario: Cyclist Ahead. Overtake safely (leave 1.5m gap).');
  }, [setMessage]);

  useFrame(() => {
    if (finished || finishedRef.current) return;

    const { position } = telemetry;
    const carZ = position.z;
    const carX = position.x;

    // Let's stick to a simpler rule for this MVP:
    // To pass this level, you must finish at Z < -80.
    // If you collide with the cyclist, you will likely fail due to crash (if we had crash detection) or just get stuck.
    // But we want to enforce the gap.
    
    // Enforce: When Z is between -30 and -70 (overtaking zone), X must be > 0.
    if (carZ < -30 && carZ > -70) { // Overtaking zone
        // If player is in the left lane (X < 0) within the overtaking zone
        if (carX < 0) {
            failLevel('You passed too close to the cyclist! Move to the other lane.');
            finishedRef.current = true;
            setFinished(true);
        }
    }

    if (position.z < -80) { // Pass condition
         passLevel();
         finishedRef.current = true;
         setFinished(true);
    }
  });

  return (
    <group>
      {/* Removed RigidBody from Grass */}
      <mesh position={[0, -0.6, -50]} receiveShadow>
            <boxGeometry args={[100, 1, 200]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Long Road - Centered at X=0, Road width 10 (X=-5 to X=5) */}
      <StraightRoad position={[0, 0, 0]} length={10} />
      <StraightRoad position={[0, 0, -10]} length={10} />
      <StraightRoad position={[0, 0, -20]} length={10} />
      <StraightRoad position={[0, 0, -30]} length={10} />
      <StraightRoad position={[0, 0, -40]} length={10} />
      <StraightRoad position={[0, 0, -50]} length={10} />
      <StraightRoad position={[0, 0, -60]} length={10} />
      <StraightRoad position={[0, 0, -70]} length={10} />
      <StraightRoad position={[0, 0, -80]} length={10} />
      <StraightRoad position={[0, 0, -90]} length={10} />
      <StraightRoad position={[0, 0, -100]} length={10} />



      {/* Player Car - Starts behind the cyclist in the left lane */}
      <Car position={[-2.5, 1, 0]} /> 
    </group>
  );
};