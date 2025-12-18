import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { OneLaneBridge } from '../components/world/OneLaneBridge';
import { GiveWaySign } from '../components/world/GiveWaySign';
import { Car } from '../components/vehicle/Car';
import { AICar } from '../components/vehicle/AICar';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const OneLaneBridgeScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const aiCarRef = useRef<THREE.Group>(null);

  // Grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  
  useEffect(() => {
    setMessage('Scenario: One-Lane Bridge. Give way to oncoming traffic. Wait for the bridge to clear.');
  }, [setMessage]);

  useEffect(() => {
    const grassPhysicsObject: PhysicsObject = {
        id: grassPhysicsObjectId,
        position: new THREE.Vector3(0, -0.6, 0),
        quaternion: new THREE.Quaternion(),
        size: new THREE.Vector3(100, 1, 200),
        type: 'grass',
        onCollide: () => {}
    };
    PhysicsSystem.registerObject(grassPhysicsObject);
    return () => {
        PhysicsSystem.unregisterObject(grassPhysicsObjectId);
    };
  }, []);

  useFrame(() => {
    if (finished || finishedRef.current) return;

    const telemetry = useGameStore.getState().telemetry;
    if (!telemetry || !telemetry.position) return;

    const { position } = telemetry;
    const z = position.z;

    // AI Car Logic
    let aiZ = -999;
    if (aiCarRef.current) {
        aiZ = aiCarRef.current.position.z;
    }

    // Fail Condition: Entering bridge while occupied
    // Bridge extends z: -15 to 15.
    // Player approach from +z (starts at 40).
    // Give way line approx z=18.
    // AI approaches from -z (starts at -50), moving to +z.
    
    // If player crosses z=16 (entering bridge area)
    if (z < 16 && z > -15) {
        // Check if AI is still a threat.
        // AI is a threat if it hasn't cleared the bridge (z < 25).
        // And if it has started approaching (z > -60).
        if (aiZ < 25 && aiZ > -60) {
            failLevel('You failed to give way on the one-lane bridge!');
            finishedRef.current = true;
            setFinished(true);
            return;
        }
    }

    // Fail: Drove off the bridge (x check)
    if (z < 15 && z > -15) {
        if (Math.abs(position.x) > 2.2) { // Bridge width is 4.5 -> half is 2.25
             failLevel('You drove off the bridge!');
             finishedRef.current = true;
             setFinished(true);
             return;
        }
    }

    // Success: Cross the bridge safely
    if (z < -30) {
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    }
  });

  return (
    <group>
      {/* Grass */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
            <boxGeometry args={[100, 1, 200]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Bridge (Center) */}
      <OneLaneBridge position={[0, 0, 0]} length={30} />

      {/* Roads leading to/from bridge */}
      <StraightRoad position={[0, 0, 40]} length={50} /> {/* Player Side */}
      <StraightRoad position={[0, 0, -40]} length={50} /> {/* Far Side */}

      {/* Sign */}
      <GiveWaySign position={[3, 0, 18]} rotation={[0, 0, 0]} />

      {/* Oncoming AI Car */}
      {/* Starts far side (-50), moves to player side (+50) */}
      <AICar 
        ref={aiCarRef}
        startPos={[0, 0.2, -50]} 
        endPos={[0, 0.2, 60]} 
        speed={12} 
        delay={0} 
        color="red" 
        rotation={[0, Math.PI, 0]} // Face +z
      />

      {/* Player Car */}
      <Car position={[-3, 1, 40]} />
    </group>
  );
};
