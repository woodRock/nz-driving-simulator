import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';
// Removed: import { Train } from '../components/vehicle/Train'; // Train component removed

import { useGameStore } from '../store/gameStore';

import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';

export const TrainCrossingScenario: React.FC = () => {
  const setMessage = useGameStore((state) => state.setMessage);
  const passLevel = useGameStore((state) => state.passLevel);
  const failLevel = useGameStore((state) => state.failLevel);
  const setFlag = useGameStore((state) => state.setFlag);
  
  // Use persistent flag
//   const hasStopped = useGameStore((state) => state.flags['trainCrossingStopped']);

  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  // Unique ID for physics system registration for the grass
  const grassPhysicsObjectId = useRef(`grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(100, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -20); // Matches the mesh position

  useEffect(() => {
    setMessage('Scenario: Train Crossing. Stop at the tracks before crossing.');
  }, [setMessage]);

  useEffect(() => {
    // Register grass with PhysicsSystem
    const grassPhysicsObject: PhysicsObject = {
        id: grassPhysicsObjectId.current,
        position: grassPosition,
        quaternion: new THREE.Quaternion(), // Fixed object, identity quaternion
        size: grassSize,
        type: 'grass',
        onCollide: (other: PhysicsObject) => {
            if (other.type === 'playerCar') {
                failLevel('You drove off the road!');
            }
        }
    };
    PhysicsSystem.registerObject(grassPhysicsObject);

    // Cleanup: unregister on unmount
    return () => {
        PhysicsSystem.unregisterObject(grassPhysicsObjectId.current);
    };
  }, [failLevel]);

  useFrame((_state, _delta) => { // Added state as first argument
    if (finished || finishedRef.current) return;

    const telemetry = useGameStore.getState().telemetry;

    if (!telemetry || !telemetry.position) return;

    const { position, speed } = telemetry;
    const z = position.z;
    const x = position.x;

    // --- LOGIC ---

    // Stop Detection: Player must stop before the tracks (Z = -15 approx)
    const playerStopLineZ = -15;
    const playerAtStopLine = (z < playerStopLineZ + 5 && z > playerStopLineZ - 5); // Much wider zone

    if (playerAtStopLine && Math.abs(speed) < 1.1) { // Require stop regardless of train presence, more lenient speed
        if (!useGameStore.getState().flags['trainCrossingStopped']) {
            setFlag('trainCrossingStopped', true);
        }
        if (useGameStore.getState().message !== 'Stopped. Proceed when safe.') {
            setMessage('Stopped. Proceed when safe.');
        }
    }

    // Fail if player crosses tracks without stopping
    if (z < -20) { // Player crosses tracks (Z = -20)
        // FAIL CONDITION A: Ran stop line
        if (!useGameStore.getState().flags['trainCrossingStopped']) {
            failLevel('FAILED: You did not stop at the tracks!');
            finishedRef.current = true;
            setFinished(true);
            return;
        }
    }

    // Fail if player goes too far off track after crossing (e.g., drives off road)
    if (z < -30 || x < -10 || x > 10) { // Z < -30 is the furthest point of the road
        failLevel('FAILED: You drove off the road!');
        finishedRef.current = true;
        setFinished(true);
        return;
    }

    // Success Condition: Player stopped and crossed safely
    if (z < -25) { // Player is well past the tracks, but before the "off road" boundary
        if (useGameStore.getState().flags['trainCrossingStopped']) { // Only requires that the player has stopped
            passLevel();
            finishedRef.current = true;
            setFinished(true);
            return;
        }
    }
  });

  // Removed: const handleTrainCycleComplete = () => { ... };

  return (
    <group>
      {/* Ground (Grass) */}
      <mesh position={grassPosition} receiveShadow>
            <boxGeometry args={[100, 1, 100]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Roads */}
      <StraightRoad position={[0, 0, -10]} length={20} />       {/* Player's approach (0 to -20) */}
      <StraightRoad position={[0, 0, -30]} length={20} />     {/* Player's exit (-20 to -40) */}

      {/* Train Tracks (Visual only, simple representation) */}
      <group position={[0, 0.05, -20]}> {/* Position at Z of crossing */}
        {/* Sleepers */}
        {Array.from({ length: 20 }).map((_, i) => (
            <mesh key={i} position={[-20 + i*2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[0.2, 0.1, 3]} />
                <meshStandardMaterial color="#614B3A" />
            </mesh>
        ))}
        {/* Rails */}
        <mesh position={[0, 0.1, -1]} >
            <boxGeometry args={[40, 0.1, 0.1]} />
            <meshStandardMaterial color="#A9A9A9" />
        </mesh>
        <mesh position={[0, 0.1, 1]} >
            <boxGeometry args={[40, 0.1, 0.1]} />
            <meshStandardMaterial color="#A9A9A9" />
        </mesh>
      </group>

      {/* Removed: Train component */}
      {/* Removed: <Train ... /> */}

      {/* Player Car */}
      <Car position={[-2.5, 1, 5]} /> {/* Player starts approaching tracks, closer to stop line */}
    </group>
  );
};