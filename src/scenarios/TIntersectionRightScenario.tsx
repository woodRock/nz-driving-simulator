import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Car } from '../components/vehicle/Car';
import { AICar } from '../components/vehicle/AICar';
import { useGameStore } from '../store/gameStore';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { StraightRoad } from '../components/world/StraightRoad';
import { Intersection } from '../components/world/Intersection';
import { GiveWaySign } from '../components/world/GiveWaySign';
import { StationaryAICar } from '../components/vehicle/StationaryAICar';

// Define AICar paths relative to the road layout
// Road is 10 units wide. Center is X=0 for vertical, Z=-10 for horizontal.
// Lanes are approx. 2.5 units from center. So:
// Horizontal road (Z=-10): lanes at Z=-7.5 and Z=-12.5
// Vertical road (X=0): lanes at X=-2.5 and X=2.5

export const TIntersectionRightScenario: React.FC = () => {
  const { setMessage, telemetry, passLevel, failLevel } = useGameStore();
  const [hasStopped, setHasStopped] = useState(false);
  
  const hasIndicatedRef = useRef(false);
  const finishedRef = useRef(false);

  const aiCarPassedRef = useRef(false);
  const aiCarRef = useRef<RapierRigidBody>(null);

  useEffect(() => {
    setMessage('Scenario: T-Intersection (Right). Give Way to ALL traffic. Turn Right. Watch for oncoming traffic and other turning vehicles!');
  }, [setMessage]);

  useFrame(() => {
    if (finishedRef.current) return;

    const currentTelemetry = useGameStore.getState().telemetry;
    const { position, speed, indicators } = currentTelemetry;
    const playerSpeed = speed;

    // --- AI Car Logic ---
    let currentAICarX = 0;
    let currentAICarZ = 0;
    let isAICarPresentInIntersection = false;
    let isAICarCrossedIntersection = false;

    if (aiCarRef.current) {
        const aiCarTranslation = aiCarRef.current.translation();
        currentAICarX = aiCarTranslation.x;
        currentAICarZ = aiCarTranslation.z;

        // Intersection bounds (approx): X from -5 to 5, Z from -15 to -5
        isAICarPresentInIntersection = (currentAICarX > -5 && currentAICarX < 5 && currentAICarZ < -5 && currentAICarZ > -15);
        isAICarCrossedIntersection = (currentAICarX > 7.5); // AI car has moved past the intersection to the player's right
    }

    const aiCarIsAHazard = isAICarPresentInIntersection;

    if (indicators.right) {
        hasIndicatedRef.current = true;
    }

    if (position.z < -8) {
        const isIndicating = hasIndicatedRef.current || indicators.right;
        if (!isIndicating && !finishedRef.current) {
            failLevel('You did not indicate right!');
            finishedRef.current = true;
            return;
        } 
    }

    if (aiCarIsAHazard && position.z < 5 && playerSpeed < 0.1 && !hasStopped) {
        console.log("STOP DETECTED! Setting hasStopped to true.");
        setHasStopped(true);
    }
    
    if (hasStopped && aiCarIsAHazard && isAICarCrossedIntersection && !aiCarPassedRef.current) { 
        aiCarPassedRef.current = true;
    }

    if (position.x > 10) {
        if (!hasStopped && aiCarIsAHazard) {
            failLevel('You did not stop at the give way line!');
            finishedRef.current = true;
            return;
        }
        if (aiCarIsAHazard && !aiCarPassedRef.current) { 
             failLevel('You did not give way to cross traffic!'); 
             finishedRef.current = true;
             return;
        }
        passLevel();
        finishedRef.current = true;
    }

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
      
      {/* Player Car */}
      <Car position={[-2.5, 1, 9]} />
    </group>
  );
};