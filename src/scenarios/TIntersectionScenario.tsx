import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Intersection } from '../components/world/Intersection';
import { GiveWaySign } from '../components/world/GiveWaySign';
import { Car } from '../components/vehicle/Car';

import { useGameStore } from '../store/gameStore';

import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';
import { StationaryAICar } from '../components/vehicle/StationaryAICar';

export const TIntersectionScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const stoppedRef = useRef(false); // Declared stoppedRef
  const hasIndicatedRef = useRef(false);
  const [finished, setFinished] = useState(false);
  
  // Ref to prevent double triggering
  const finishedRef = useRef(false);

  // Unique ID for physics system registration for the grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(100, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -10); // Matches the mesh position

  useEffect(() => {
    setMessage('Scenario: T-Intersection. You are approaching a Give Way. Turn Left. Watch for traffic!');
  }, [setMessage]);

  useEffect(() => {
    // Register grass with PhysicsSystem
    const grassPhysicsObject: PhysicsObject = {
        id: grassPhysicsObjectId,
        position: grassPosition,
        quaternion: new THREE.Quaternion(), // Fixed object, identity quaternion
        size: grassSize,
        type: 'grass',
        onCollide: (_other: PhysicsObject) => {
            // No longer failing on grass collision directly; handled by Car.tsx
        }
    };
    PhysicsSystem.registerObject(grassPhysicsObject);

    // Cleanup: unregister on unmount
    return () => {
        PhysicsSystem.unregisterObject(grassPhysicsObjectId);
    };
  }, [failLevel]); // Depend on failLevel to ensure onCollide has latest ref

  useFrame(() => {
    if (finished || finishedRef.current) return;

    // 2. FIX: Access telemetry directly from the store state (Transient update)
    // This reads the value without forcing a component re-render.
    const telemetry = useGameStore.getState().telemetry;

    // Safety check in case telemetry isn't initialized yet
    if (!telemetry || !telemetry.position) return;

    const { position, speed, indicators } = telemetry;
    const z = position.z;

    // --- LOGIC ---

    // 1. Detect Stop in Zone (Approaching line)
    // Zone: -5 to -19 (Line is approx -16 to -20)
    if (z < 0 && z > -10) { // Expanded zone for stop detection
      // Speed check: slightly higher tolerance helps with floating point jitter
      if (speed < 0.1) {
        if (!stoppedRef.current) {
          stoppedRef.current = true;
          setMessage('Stopped. Safe to proceed.');
        }
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
      <mesh position={grassPosition} receiveShadow>
            <boxGeometry args={[100, 1, 100]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

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