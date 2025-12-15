import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Car } from '../components/vehicle/Car';
import { StationaryAICar } from '../components/vehicle/StationaryAICar';
import { useGameStore } from '../store/gameStore';
import { RigidBody } from '@react-three/rapier';
import { StraightRoad } from '../components/world/StraightRoad';
import { Intersection } from '../components/world/Intersection';
import { GiveWaySign } from '../components/world/GiveWaySign';

// Define AICar paths relative to the road layout
// Road is 10 units wide. Center is X=0 for vertical, Z=-10 for horizontal.
// Lanes are approx. 2.5 units from center. So:
// Horizontal road (Z=-10): lanes at Z=-7.5 and Z=-12.5
// Vertical road (X=0): lanes at X=-2.5 and X=2.5

// Removed AI_CAR_1_START, AI_CAR_1_END, AI_CAR_2_START, AI_CAR_2_END

export const TIntersectionRightScenario: React.FC = () => {
  const { setMessage, telemetry, passLevel, failLevel } = useGameStore();
  const [hasStopped, setHasStopped] = useState(false);
  
  const hasIndicatedRef = useRef(false);
  const finishedRef = useRef(false);

  // Add a ref to track if the AI car has "passed" (player gave way)
  const aiCarPassedRef = useRef(false);

  useEffect(() => {
    setMessage('Scenario: T-Intersection (Right). Give Way to ALL traffic. Turn Right. Watch for oncoming traffic and other turning vehicles!');
  }, [setMessage]);

  useFrame(() => {
    if (finishedRef.current) return;

    // Get the latest telemetry directly from the store within useFrame
    const currentTelemetry = useGameStore.getState().telemetry;
    const { position, speed, indicators } = currentTelemetry;
    const playerSpeed = speed; // This is now guaranteed to be the absolute latest speed



    // Check Player's indicator for right turn
    if (indicators.right) {
        hasIndicatedRef.current = true;
    }

    // Check Intersection Entry (Line Crossing at z = -8)
    if (position.z < -8) {
        // Player should have indicated right before crossing z=-8
        const isIndicating = hasIndicatedRef.current || indicators.right;
        if (!isIndicating && !finishedRef.current) {
            failLevel('You did not indicate right!');
            finishedRef.current = true;
            return;
        } 
    }

    // Simplified Check Stop at Give Way Line for debugging
    // If player slows down significantly after approaching the intersection, consider it a stop.
    if (position.z < 5 && playerSpeed < 0.1 && !hasStopped) { // Very low speed threshold, and after crossing z=5 (intersection approach)
        console.log("STOP DETECTED! Setting hasStopped to true.");
        setHasStopped(true);
    }
    
    // Logic for AI car: it "passes" if player stops
    if (hasStopped && !aiCarPassedRef.current) { 
        aiCarPassedRef.current = true;
    }


    // Check completion (Right Turn)
    if (position.x > 10) {
        // Player must have stopped AND indicated
        if (!hasStopped) {
            failLevel('You did not stop at the give way line!');
            finishedRef.current = true;
            return;
        }
        // If there's an AI car that requires giving way, check aiCarPassedRef
        // In this scenario, the orange car (from player's right, turning across) requires giving way.
        if (!aiCarPassedRef.current) { 
             failLevel('You did not give way to cross traffic!'); // Changed message for clarity
             finishedRef.current = true;
             return;
        }
        passLevel();
        finishedRef.current = true;
    }

    // Check Failures
    if (position.z < -30) {
        failLevel('You went straight/off-road!');
        finishedRef.current = true;
    }
    if (position.x < -15) {
        failLevel('You turned left! You were supposed to turn right.');
        finishedRef.current = true;
    }
  });

  return (
    <group>
      {/* Ground (Grass) */}
      {/* Removed RigidBody from Grass */}
      <mesh position={[0, -0.6, -10]} receiveShadow>
          <boxGeometry args={[100, 1, 100]} />
          <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Roads */}
      <StraightRoad position={[-10, 0, -10]} rotation={[0, Math.PI / 2, 0]} length={10} />
      <StraightRoad position={[10, 0, -10]} rotation={[0, Math.PI / 2, 0]} length={10} />
      <Intersection position={[0, 0, -10]} />
      <StraightRoad position={[0, 0, 0]} length={10} />
      <StraightRoad position={[0, 0, 10]} length={10} />

      {/* Signs - Moved to correct z location */}
      <GiveWaySign position={[-5.5, 0, -5.5]} rotation={[0, 0, 0]} />

      {/* Stationary AI Car: Approaching from top-left, indicating left turn (does not cross the player's path) */}
      <StationaryAICar 
        position={[7.5, 0.2, -7.5]} // Corrected Y-position to 1 for placement on the ground
        rotation={[0, Math.PI / 2, 0]} // Faces +X, towards the intersection
        color="orange" 
        indicatingLeft={true} // Explicitly set to not indicate left
        indicatingRight={false} // Explicitly set to indicate right
      />

      {/* Player Car */}
      <Car position={[-2.5, 1, 9]} />
    </group>
  );
};