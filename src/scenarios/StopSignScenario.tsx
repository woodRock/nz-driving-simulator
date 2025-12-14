import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { LargeIntersection } from '../components/world/LargeIntersection';
import { StopSign } from '../components/world/StopSign';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import { RigidBody } from '@react-three/rapier';

export const StopSignScenario: React.FC = () => {
  // 1. Only subscribe to stable actions. 
  // DO NOT subscribe to telemetry here.
  const setMessage = useGameStore((state) => state.setMessage);
  const failLevel = useGameStore((state) => state.failLevel);
  const passLevel = useGameStore((state) => state.passLevel);

  const stoppedRef = useRef(false);
  // We use a Ref to lock the logic immediately without waiting for a re-render
  const finishedRef = useRef(false); 

  useEffect(() => {
    setMessage('Scenario: Stop Sign. Come to a complete stop at the line before crossing.');
  }, [setMessage]);

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
      // Speed check: slightly higher tolerance helps with floating point jitter
      if (speed < 0.1) {
        if (!stoppedRef.current) {
          stoppedRef.current = true;
          // We can call actions here because they are bound functions
          setMessage('Stopped. Safe to proceed.');
        }
      }
    }

    // 2. Validate at Exit (-30)
    if (z < -30) {
      finishedRef.current = true; // Lock the loop immediately

      if (stoppedRef.current) {
        passLevel();
      } else {
        failLevel('FAILED: You ran the Stop Sign!');
      }
    }
  });

  return (
    <group>
      {/* Ground */}
      <RigidBody type="fixed" colliders="cuboid" friction={1} userData={{ type: 'grass' }}>
        <mesh position={[0, -0.6, -20]} receiveShadow>
          <boxGeometry args={[100, 1, 100]} />
          <meshStandardMaterial color="#4caf50" />
        </mesh>
      </RigidBody>

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