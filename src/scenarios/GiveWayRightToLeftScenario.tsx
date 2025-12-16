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

export const GiveWayRightToLeftScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  const aiCarRef = useRef<THREE.Group>(null); // Ref for the moving AICar

  // Unique ID for physics system registration for the grass
  const grassPhysicsObjectId = useRef(`grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(100, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -10); // Matches the mesh position

  useEffect(() => {
    setMessage('Scenario: Give Way (Right-to-Left). You are at the intersection. Give way to the car approaching from your right before proceeding right.');
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

      useFrame(() => {
      if (finished || finishedRef.current) return;
  
      const telemetry = useGameStore.getState().telemetry;
  
      if (!telemetry || !telemetry.position) return;
  
      const { position } = telemetry;
      const z = position.z;
      const x = position.x;
  
          // --- 1. TRACK AI CAR ---
          let aiCarX = -50; // Default far away
          let aiCarZ = -10; // Default intersection Z
          let distToHazard = 10; // Default safe
          let isAICarInIntersectionArea = false; // Dynamic check for AI car's hazard status
      
          if (aiCarRef.current) {
              aiCarX = aiCarRef.current.position.x; 
              aiCarZ = aiCarRef.current.position.z;
              
              distToHazard = Math.sqrt(
                  Math.pow(x - aiCarX, 2) + 
                  Math.pow(z - aiCarZ, 2)
              );
      
              // AI car moves from X = 15 to X = -15 across the intersection (main road)
              // Consider AI car a hazard if it's within a wider zone around the intersection.
              if (aiCarX < 10 && aiCarX > -10) { 
                  isAICarInIntersectionArea = true;
              }
          }
          // console.log('--- GiveWayRightToLeft DEBUG ---'); // Removed debug log
          // console.log('Player Position Z:', z.toFixed(2), 'X:', x.toFixed(2)); // Removed debug log
          // console.log('AI Car X:', aiCarX.toFixed(2), 'isAICarInIntersectionArea:', isAICarInIntersectionArea); // Removed debug log
          // console.log('distToHazard:', distToHazard.toFixed(2)); // Removed debug log
      
          // --- 2. PLAYER LOGIC ---
          // Player starts near the give way line, primary task is to wait for AI car
      
          // --- 3. INTERSECTION LOGIC ---
          // We only evaluate "Give Way" failures if the player enters the intersection (Z < -1)
          if (z < -1) { 
              // FAIL CONDITION A: Dangerous Cut-off
              // If player moves into intersection when AI car is a hazard
              if (isAICarInIntersectionArea && distToHazard < 8) { // Adjusted threshold for even more leeway
                   failLevel('You entered the intersection without giving way to cross traffic!'); 
                   finishedRef.current = true;
                   setFinished(true);
                   return;
              }
          }    // Success Condition: Player successfully went straight after AI car has passed (or is safely far away)
    if (z < -10 && x < 5 && x > -5) { // Went straight
        // Ensure AI car is far enough away if it was ever a hazard
        console.log('--- Success Check DEBUG ---');
        console.log('isAICarInIntersectionArea:', isAICarInIntersectionArea, 'distToHazard:', distToHazard.toFixed(2));
        if (!isAICarInIntersectionArea || distToHazard > 8) { // Use distToHazard directly
            passLevel();
            finishedRef.current = true;
            setFinished(true);
        }
    } 
    // Fail Condition: Turned Left or Right, or Drove off road
    if (x < -10 && z < -5) { // Turned left
        failLevel('You turned left! You were supposed to go straight.');
        finishedRef.current = true;
        setFinished(true);
    }
    if (x > 10 && z < -5) { // Turned right
        failLevel('You turned right! You were supposed to go straight.');
        finishedRef.current = true;
        setFinished(true);
    }
    if (z < -30 || x < -15 || x > 15) { // Drove off road
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

      {/* Moving AI Traffic (from right to left) */}
      <AICar 
        ref={aiCarRef} 
        startPos={[15, 0.2, -7.5]} // Starts right of intersection
        endPos={[-15, 0.2, -7.5]}   // Ends left of intersection
        speed={8} // Reduced speed to create a larger window
        delay={0} 
        color="blue" 
        rotation={[0, Math.PI / 2, 0]} // Faces -X, moving left
      />

      {/* Player Car */}
      <Car position={[-2.5, 1, -0.5]} /> {/* Player starts at give-way line */}
    </group>
  );
};