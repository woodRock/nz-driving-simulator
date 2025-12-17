import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { LargeIntersection } from '../components/world/LargeIntersection';
import { StopSign } from '../components/world/StopSign';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';

export const StopSignScenario: React.FC = () => {
  // 1. Only subscribe to stable actions. 
  // DO NOT subscribe to telemetry here.
  const setMessage = useGameStore((state) => state.setMessage);
  const failLevel = useGameStore((state) => state.failLevel);
  const passLevel = useGameStore((state) => state.passLevel);
  const setFlag = useGameStore((state) => state.setFlag);

  // We use a Ref to lock the logic immediately without waiting for a re-render
  const finishedRef = useRef(false); 

  // Unique ID for physics system registration for the grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(100, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -20); // Matches the mesh position

  useEffect(() => {
    setMessage('Scenario: Stop Sign. Come to a complete stop at the line before crossing.');
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
    // Logic gate: stop processing if level is done
    if (finishedRef.current) return;

    // 2. FIX: Access telemetry directly from the store state (Transient update)
    // This reads the value without forcing a component re-render.
    const telemetry = useGameStore.getState().telemetry;

    // Safety check in case telemetry isn't initialized yet
    if (!telemetry || !telemetry.position) return;

    const { position, speed } = telemetry;
    const z = position.z;

    // --- LOGIC ---

    // 1. Detect Stop in Zone (Approaching line)
    // Zone: -5 to -19 (Line is approx -16 to -20)
    if (z < -5 && z > -19) {
      // Speed check: threshold matches physics snap
      if (Math.abs(speed) < 1.1) {
        if (!useGameStore.getState().flags['stopSignStopped']) {
          setFlag('stopSignStopped', true);
          
          if (useGameStore.getState().message !== 'Stopped. Safe to proceed.') {
              setMessage('Stopped. Safe to proceed.');
          }
        }
      }
    }

    // 2. Validate at Exit (-30)
    if (z < -30) {
      finishedRef.current = true; // Lock the loop immediately

      if (useGameStore.getState().flags['stopSignStopped']) {
        passLevel();
      } else {
        failLevel('FAILED: You ran the Stop Sign!');
      }
    }
  });

  return (
    <group>
      {/* Ground */}
      <mesh position={grassPosition} receiveShadow>
        <boxGeometry args={[100, 1, 100]} />
        <meshStandardMaterial color="#4caf50" />
      </mesh>

      {/* Roads */}
      <StraightRoad position={[0, 0, 0]} length={20} />
      <StraightRoad position={[0, 0, -40]} length={20} />
      <StraightRoad position={[-20, 0, -20]} rotation={[0, Math.PI / 2, 0]} length={20} />
      <StraightRoad position={[20, 0, -20]} rotation={[0, Math.PI / 2, 0]} length={20} />

      {/* Intersection */}
      <LargeIntersection position={[0, 0, -20]} />

      {/* Stop Sign */}
      <StopSign position={[-5.5, 0, -14]} rotation={[0, Math.PI, 0]} />

      {/* Player Car */}
      <Car position={[-2.5, 1, 8]} />
    </group>
  );
};