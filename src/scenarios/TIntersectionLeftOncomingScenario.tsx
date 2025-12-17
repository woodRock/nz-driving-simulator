import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Intersection } from '../components/world/Intersection';
import { GiveWaySign } from '../components/world/GiveWaySign';
import { Car } from '../components/vehicle/Car';
import { AICar } from '../components/vehicle/AICar'; // Import AICar
import { useGameStore } from '../store/gameStore';

import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';

export const TIntersectionLeftOncomingScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const hasIndicatedRef = useRef(false);
  const [finished, setFinished] = useState(false);
  
  const finishedRef = useRef(false);

  const aiCarOncomingRef = useRef<THREE.Group>(null); // Ref for the oncoming AICar (orange)
  const aiCarCrossTrafficRef = useRef<THREE.Group>(null); // Ref for the cross traffic AICar (red)

  // Unique ID for physics system registration for the grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(100, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -10); // Matches the mesh position

  useEffect(() => {
    setMessage('Scenario: T-Intersection (Left Turn, Oncoming). Prepare to turn left. Give way to oncoming traffic.');
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

    if (!telemetry || !telemetry.position) return;

    const { position, indicators } = telemetry;
    const z = position.z;
    const x = position.x;

    // --- 1. TRACK AI CARS ---
    let distToHazardOncoming = 100; // Default safe
    let isAICarOncomingInIntersectionArea = false; 

    if (aiCarOncomingRef.current) {
        const aiCarX = aiCarOncomingRef.current.position.x; 
        const aiCarZ = aiCarOncomingRef.current.position.z;
        
        distToHazardOncoming = Math.sqrt(
            Math.pow(x - aiCarX, 2) + 
            Math.pow(z - aiCarZ, 2)
        );

        if (aiCarX < 10 && aiCarX > -10) { // Check AI's X position within intersection bounds
            isAICarOncomingInIntersectionArea = true;
        }
    }

    let distToHazardCrossTraffic = 100; // Default safe
    let isAICarCrossTrafficInIntersectionArea = false; 

    if (aiCarCrossTrafficRef.current) {
        const aiCarX = aiCarCrossTrafficRef.current.position.x; 
        const aiCarZ = aiCarCrossTrafficRef.current.position.z;
        
        distToHazardCrossTraffic = Math.sqrt(
            Math.pow(x - aiCarX, 2) + 
            Math.pow(z - aiCarZ, 2)
        );

        // This car is on the opposite side of the road for the player
        if (aiCarX < 10 && aiCarX > -10) { 
            isAICarCrossTrafficInIntersectionArea = true;
        }
    }


    // --- 2. PLAYER LOGIC ---
    // Check indicators continuously while approaching
    if (z > -8) {
         if (indicators.left) {
            hasIndicatedRef.current = true;
        }
    }

    // Intersection Logic (Player entering intersection past Z = -8)
    if (z < -8) { 
        // FAIL CONDITION A: Did not indicate left
        if (!hasIndicatedRef.current) {
            failLevel('You did not indicate left!');
            finishedRef.current = true;
            setFinished(true);
            return;
        }

        // FAIL CONDITION B: Turned in front of oncoming traffic
        if (isAICarOncomingInIntersectionArea && distToHazardOncoming < 15) { // Threshold for dangerous turn
             failLevel('You turned left in front of oncoming traffic!'); 
             finishedRef.current = true;
             setFinished(true);
             return;
        }
        // FAIL CONDITION C: Hit cross-traffic (red car)
        // This car is on the far lane. If the player hits it, it's a definite fail.
        if (isAICarCrossTrafficInIntersectionArea && distToHazardCrossTraffic < 5) { // Closer threshold as it's not traffic to yield to
            failLevel('You hit cross-traffic!');
            finishedRef.current = true;
            setFinished(true);
            return;
        }
    }

    // Pass condition: Player successfully turned left and is past the intersection
    if (x < -15 && z < -5) { // Turned left and past the intersection
        // Ensure no ongoing hazards before passing
        if (isAICarOncomingInIntersectionArea && distToHazardOncoming < 20) { // Ensure oncoming is far enough away
            failLevel('You cleared the intersection too close to oncoming traffic!');
            finishedRef.current = true;
            setFinished(true);
            return;
        }
        if (isAICarCrossTrafficInIntersectionArea && distToHazardCrossTraffic < 10) { // Ensure cross-traffic is also far enough away
             failLevel('You cleared the intersection too close to cross traffic!');
             finishedRef.current = true;
             setFinished(true);
             return;
        }
         passLevel();
         finishedRef.current = true;
         setFinished(true);
    }

    // Fail conditions: Went straight or turned right
    if (z < -30 && x < 5 && x > -5) { // Went straight
        failLevel('You went straight! You were supposed to turn left.');
        finishedRef.current = true;
        setFinished(true);
    }
    if (x > 15 && z < -5) { // Turned right
        failLevel('You turned right! You were supposed to turn left.');
        finishedRef.current = true;
        setFinished(true);
    }
    // Fail if player goes off road
    if (z < -30 || x < -20 || x > 20) {
        failLevel('You drove off the road!');
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

      {/* Moving AI Traffic (oncoming, orange car, goes right-to-left) */}
      <AICar 
        ref={aiCarOncomingRef} // Assigned specific ref
        startPos={[20, 0.2, -7.5]} // Starts right of intersection on oncoming lane
        endPos={[-20, 0.2, -7.5]}   // Drives straight past intersection
        speed={10} 
        delay={0} 
        color="orange" 
        rotation={[0, Math.PI / 2, 0]} // Faces -X, moving left across player's path
      />

      {/* Moving AI Traffic (cross-traffic, red car, goes left-to-right on opposite lane) */}
      <AICar 
        ref={aiCarCrossTrafficRef} // Assigned specific ref
        startPos={[-20, 0.2, -12.5]} // Starts left of intersection on opposite side of road
        endPos={[20, 0.2, -12.5]}   // Drives straight past intersection
        speed={10} 
        delay={0} 
        color="red" 
        rotation={[0, 3 * Math.PI / 2, 0]} // Faces +X, moving right across player's path
      />

      {/* Player Car */}
      <Car position={[-2.5, 1, 9]} />
    </group>
  );
};