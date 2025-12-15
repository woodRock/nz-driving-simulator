import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Intersection } from '../components/world/Intersection';
import { GiveWaySign } from '../components/world/GiveWaySign';
import { Car } from '../components/vehicle/Car';

import { useGameStore } from '../store/gameStore';

import { RigidBody } from '@react-three/rapier';
import { StationaryAICar } from '../components/vehicle/StationaryAICar';

export const TIntersectionScenario: React.FC = () => {
  const { setMessage, telemetry, passLevel, failLevel } = useGameStore();
  const [hasStopped, setHasStopped] = useState(false);
  const hasIndicatedRef = useRef(false);
  const [finished, setFinished] = useState(false);
  
  // Ref to prevent double triggering
  const finishedRef = useRef(false);

  useEffect(() => {
    setMessage('Scenario: T-Intersection. You are approaching a Give Way. Turn Left. Watch for traffic!');
  }, [setMessage]);

  useFrame(() => {
    if (finished || finishedRef.current) return;

    const { position, speed, indicators } = telemetry;

    // Check for stopping/giving way near the line (z between -2 and -5)
    if (position.z < 0 && position.z > -6) {
        if (speed < 0.5) {
            setHasStopped(true);
        }
    }
    
    // Check indicators continuously while approaching
    if (position.z > -8) {
         if (indicators.left) {
            hasIndicatedRef.current = true;
        }
    }

    // Check if entered intersection (crossed z = -8)
    if (position.z < -8) {
        // Check failure to indicate upon entry
        if (!hasIndicatedRef.current && !finishedRef.current) {
            failLevel('You did not indicate left!');
            finishedRef.current = true;
            setFinished(true);
            return;
        } 
    }

    // Check completion (Left Turn)
    if (position.x < -15) {
         passLevel();
         finishedRef.current = true;
         setFinished(true);
    }

    // Check Wrong Way (Straight or Right)
    if (position.z < -30) {
        failLevel('You went straight! You were supposed to turn left.');
        finishedRef.current = true;
        setFinished(true);
    }
    if (position.x > 15) {
        failLevel('You turned right! You were supposed to turn left.');
        finishedRef.current = true;
        setFinished(true);
    }
  });

  return (
    <group>
      {/* Ground (Grass) */}
      <RigidBody type="fixed" colliders="cuboid" friction={1} userData={{ type: 'grass' }}>
        <mesh position={[0, -0.6, -10]} receiveShadow>
            <boxGeometry args={[100, 1, 100]} />
            <meshStandardMaterial color="#558b2f" />
        </mesh>
      </RigidBody>

      {/* The "Top" of the T (The Priority Road) */}
      <StraightRoad position={[-10, 0, -10]} rotation={[0, Math.PI / 2, 0]} length={10} />
      <StraightRoad position={[10, 0, -10]} rotation={[0, Math.PI / 2, 0]} length={10} />
      
      {/* The Intersection */}
      <Intersection position={[0, 0, -10]} />
      
      {/* The "Stem" of the T (Where Player Starts) */}
      <StraightRoad position={[0, 0, 0]} length={10} />
      <StraightRoad position={[0, 0, 10]} length={10} />

      {/* Signs */}
      <GiveWaySign position={[-5.5, 0, -1]} rotation={[0, 0, 0]} />

      {/* Traffic */}

      {/* Stationary AI Car: Approaching from top-left, indicating right turn (crosses player's path) */}
      <StationaryAICar 
        position={[-7.5, 0.2, -12.5]} // Y-position set to 1 for correct placement on the ground
        rotation={[0, 3 * Math.PI / 2, 0]} // Faces +X, towards the intersection
        color="orange" 
        indicatingLeft={false} // Explicitly set to not indicate left (for clarity/safety)
        indicatingRight={true} // Explicitly set to indicate right
      />


      {/* Player Car */}
      <Car position={[-2.5, 1, 9]} />
    </group>
  );
};
