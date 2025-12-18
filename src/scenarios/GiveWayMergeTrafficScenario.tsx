import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Intersection } from '../components/world/Intersection';
import { GiveWaySign } from '../components/world/GiveWaySign';
import { Car } from '../components/vehicle/Car';
import { AICar } from '../components/vehicle/AICar'; // Import AICar

import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const GiveWayMergeTrafficScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  // Refs for multiple AI cars
  const aiCar1Ref = useRef<THREE.Group>(null);
  const aiCar2Ref = useRef<THREE.Group>(null);
  const aiCar3Ref = useRef<THREE.Group>(null); // More AI cars for continuous flow

  // Unique ID for physics system registration for the grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(100, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -10); // Matches the mesh position

  useEffect(() => {
    setMessage('Scenario: Give Way (Merge). Give way to continuous traffic flow from your right. Merge safely onto the main road and proceed.');
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
  }, [failLevel]);

  useFrame(() => {
    if (finished || finishedRef.current) return;

    const telemetry = useGameStore.getState().telemetry;
    if (!telemetry || !telemetry.position) return; // Ensure telemetry is valid before destructuring

    const { position } = telemetry;
    const x = position.x;
    const z = position.z;

    // --- 1. TRACK AI CARS ---
    const aiCars = [aiCar1Ref, aiCar2Ref, aiCar3Ref]; // Array of AI car refs
    let isAnyAICarInIntersectionArea = false;
    let closestDistToHazard = Infinity;

    aiCars.forEach(aiCarRef => {
        if (aiCarRef.current) {
            const aiCarX = aiCarRef.current.position.x; 
            const aiCarZ = aiCarRef.current.position.z;
            
            const dist = Math.sqrt(
                Math.pow(x - aiCarX, 2) + 
                Math.pow(z - aiCarZ, 2)
            );
            closestDistToHazard = Math.min(closestDistToHazard, dist);

            // AI car is a hazard if it's within a wider zone around the intersection/merge point
            if (aiCarX < 15 && aiCarX > -15) { // Main road X range
                isAnyAICarInIntersectionArea = true;
            }
        }
    });

    // --- LOGIC ---

    // Fail if not indicating left when entering/in the intersection to merge
    // Player is entering main road when z < -5. Must indicate left.
    if (z < -5 && x > -10 && !telemetry.indicators.left) {
         failLevel('You failed to indicate left before turning!');
         finishedRef.current = true;
         setFinished(true);
         return;
    }

    // Fail if player enters intersection too close to any AI car
    // Player is entering main road when z < -5 (crossing the give way line)
    if (z < -5) {
        if (isAnyAICarInIntersectionArea && closestDistToHazard < 10) { // Adjusted threshold
             failLevel('You merged unsafely into traffic!'); 
             finishedRef.current = true;
             setFinished(true);
             return;
        }
    }

    // Success Condition: Player successfully merged and is driving down the main road
    if (x < -10 && z < -5) { // Player has merged left onto the main road and gone a bit further
         passLevel();
         finishedRef.current = true;
         setFinished(true);
         return; // Prevent further fail checks in this frame
    }
    // Fail condition: Drove off road
    if (!finishedRef.current && (z < -30 || x > 15 || x < -25)) { // Check if not already finished before failing
        failLevel('You drove off the road or went the wrong way!');
        finishedRef.current = true;
        setFinished(true);
    }
  });

  return (
    <group>
      {/* Grass */}
      <mesh position={grassPosition} receiveShadow>
            <boxGeometry args={[100, 1, 100]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Crossroad (adapting for merge) */}
      <Intersection position={[0, 0, -10]} />

      {/* Roads */}
      <StraightRoad position={[0, 0, 0]} length={10} />       {/* Player's approach */}
      <StraightRoad position={[-10, 0, -10]} rotation={[0, Math.PI / 2, 0]} length={10} /> {/* Left main road */}
      <StraightRoad position={[10, 0, -10]} rotation={[0, Math.PI / 2, 0]} length={10} />  {/* Right main road (AI comes from here) */}
      <StraightRoad position={[-20, 0, -10]} rotation={[0, Math.PI / 2, 0]} length={10} /> {/* Extension of main road */}


      {/* Signs */}
      <GiveWaySign position={[-5.5, 0, -1]} rotation={[0, 0, 0]} />

      {/* Moving AI Traffic (from right to left, continuous flow with a gap) */}
      <AICar 
        ref={aiCar1Ref} 
        startPos={[20, 0.2, -7.5]} // Starts right, on the main road
        endPos={[-20, 0.2, -7.5]}   // Ends left
        speed={10} 
        delay={0} 
        color="red" 
        rotation={[0, -Math.PI / 2, 0]} // Faces -X, moving left
      />
      <AICar 
        ref={aiCar2Ref} 
        startPos={[100, 1, -7.5]} // Starts further back to create a gap
        endPos={[60, 1, -7.5]}   // Adjusted end pos
        speed={10} 
        delay={12} // Increased delay for a larger gap
        color="purple" 
        rotation={[0, -Math.PI / 2, 0]} 
      />
      {/* Removed aiCar3Ref for initial simplification */}

      {/* Player Car */}
      <Car position={[-2.5, 1, 4]} />
    </group>
  );
};