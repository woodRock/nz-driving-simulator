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

export const FourWayGiveWayScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const [hasStopped, setHasStopped] = useState(false); // Player needs to stop at Give Way line

  const aiCarRef = useRef<THREE.Group>(null); // Ref for the moving AICar

  // Unique ID for physics system registration for the grass
  const grassPhysicsObjectId = useRef(`grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(100, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -10); // Matches the mesh position

  useEffect(() => {
    setMessage('Scenario: Four-Way Give Way. Give way to traffic from your right. Go Straight.');
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

    const { position, speed } = telemetry;
    const z = position.z;
    const x = position.x;

    // --- 1. TRACK AI CAR ---
    let aiCarX = 100; // Default far away
    let aiCarZ = -10; // Default intersection Z
    let distToHazard = 100; // Default safe
    let isAICarInIntersectionArea = false; // Dynamic check for AI car's hazard status

    if (aiCarRef.current) {
        aiCarX = aiCarRef.current.position.x; 
        aiCarZ = aiCarRef.current.position.z;
        
        distToHazard = Math.sqrt(
            Math.pow(x - aiCarX, 2) + 
            Math.pow(z - aiCarZ, 2)
        );

        // AI car moves from Z = -15 to Z = 5 (across the player's path)
        // Consider AI car a hazard if it's within a wider zone around the intersection.
        if (aiCarZ < 0 && aiCarZ > -20) { 
            isAICarInIntersectionArea = true;
        }
    }

    // --- LOGIC ---
    console.log('--- FourWayGiveWay DEBUG ---');
    console.log('Player Z:', z.toFixed(2), 'X:', x.toFixed(2), 'Speed:', speed.toFixed(2));
    console.log('AI Car Z:', aiCarZ.toFixed(2), 'isAICarInIntersectionArea:', isAICarInIntersectionArea, 'distToHazard:', distToHazard.toFixed(2));
    console.log('hasStopped:', hasStopped);


    // Stop Detection: Player must stop at give way line (Z = 0 approx)
    const playerGiveWayLineZ = 0; // Aligned with actual Give Way sign
    const playerAtStopLine = (z < playerGiveWayLineZ + 1 && z > playerGiveWayLineZ - 3); // Wider zone for stopping around the line

    if (!hasStopped && playerAtStopLine && speed < 0.5) { // Lenient speed
        setHasStopped(true);
        setMessage('Stopped. Wait for cross traffic from your right.');
        console.log('STOP DETECTED!');
    }

    // Intersection Logic (Player entering intersection past give way line)
    if (z < playerGiveWayLineZ - 2) { // Player has crossed the give way line (Z < -2)
        // FAIL CONDITION A: Dangerous Pull Out (didn't give way)
        if (isAICarInIntersectionArea && distToHazard < 8) { // Adjusted threshold for more leeway
             failLevel('You entered the intersection without giving way to cross traffic!'); 
             finishedRef.current = true;
             setFinished(true);
             return;
        }
        // FAIL CONDITION B: Did not stop (if AI was present) - ONLY IF AI WAS PRESENT!
        if (isAICarInIntersectionArea && !hasStopped) { // Only fail for not stopping if there was actually traffic to stop for
            failLevel('You ran the Give Way sign without stopping for traffic!');
            finishedRef.current = true;
            setFinished(true);
            return;
        }
    }

    // Success Condition: Player successfully went straight after AI car has passed (or is safely far away)
    if (z < -20 && x < 5 && x > -5) { // Went straight, well past intersection
        // Ensure AI car is far enough away if it was ever a hazard
        if (isAICarInIntersectionArea && distToHazard < 10) { // If AI is *still* a hazard, fail (shouldn't happen if logic above is fine)
            failLevel('You pulled out too close to cross traffic!');
            finishedRef.current = true;
            setFinished(true);
            return;
        }
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    } 
    // Fail Condition: Turned Left or Right, or Drove off road
    if (x < -10 || x > 10 || z > 10 || (z < -30 && (x < -5 || x > 5))) { // Added (z < -30 && (x < -5 || x > 5)) to fail if off exit road
        failLevel('You turned or drove off the road!');
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

      {/* Roads creating a crossroad */}
      <StraightRoad position={[0, 0, 0]} length={10} />       {/* Player's approach */}
      <StraightRoad position={[0, 0, -20]} length={10} />     {/* Player's exit */}
      <StraightRoad position={[-10, 0, -10]} rotation={[0, Math.PI / 2, 0]} length={10} /> {/* Crossroad Left */}
      <StraightRoad position={[10, 0, -10]} rotation={[0, Math.PI / 2, 0]} length={10} />  {/* Crossroad Right */}
      
      {/* The Intersection */}
      <Intersection position={[0, 0, -10]} />
      
      {/* Signs */}
      <GiveWaySign position={[-5.5, 0, 0]} rotation={[0, 0, 0]} /> {/* Give Way for player, moved back */}

      {/* Moving AI Traffic (from right, turning left across player's path) */}
      <AICar 
        ref={aiCarRef} 
        startPos={[15, 0.2, -7.5]} // Starts right of intersection, on main road
        endPos={[ -2, 0.2, -22.5]} // Ends left after turning across player's path
        speed={8} 
        delay={0} 
        color="red" 
        pathPoints={[
          new THREE.Vector3(15, 0.2, -7.5),
          new THREE.Vector3(7, 0.2, -7.5), // Approaching turn, before intersection
          new THREE.Vector3(2, 0.2, -10), // Point at intersection entry
          new THREE.Vector3(-2, 0.2, -15), // Mid-turn point
          new THREE.Vector3(-2, 0.2, -20), // Mid-turn point
          new THREE.Vector3(-2, 0.2, -22.5), // Mid-turn point
          // new THREE.Vector3(-7.5, 0.2, -17), // Exiting intersection, completing turn
          // new THREE.Vector3(-15, 0.2, -17), // Straightening out
        ]}
        indicatingRight={true} // Indicate right before turn
        indicatingLeft={false}
      />

      {/* Player Car */}
      <Car position={[-2.5, 1, 5]} /> {/* Player starts approaching Give Way */}
    </group>
  );
};