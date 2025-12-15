import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { LargeIntersection } from '../components/world/LargeIntersection';
import { StopSign } from '../components/world/StopSign';
import { Car } from '../components/vehicle/Car';
import { AICar } from '../components/vehicle/AICar'; // Import AICar
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';

export const StopSignCrossTrafficScenario: React.FC = () => {
  const setMessage = useGameStore((state) => state.setMessage);
  const failLevel = useGameStore((state) => state.failLevel);
  const passLevel = useGameStore((state) => state.passLevel);

  const stoppedRef = useRef(false);
  const finishedRef = useRef(false); 

  const aiCarRef = useRef<THREE.Group>(null); // Ref for the moving AICar

  // Unique ID for physics system registration for the grass
  const grassPhysicsObjectId = useRef(`grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(100, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -20); // Matches the mesh position

  useEffect(() => {
    setMessage('Scenario: Stop Sign with Cross Traffic. Come to a complete stop and give way to cross traffic before proceeding.');
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
    if (finishedRef.current) return;

    const telemetry = useGameStore.getState().telemetry;
    if (!telemetry || !telemetry.position) return;
    const { position, speed } = telemetry;
    const z = position.z;
    const x = position.x;

    // --- 1. TRACK AI CAR ---
    let aiCarX = 100; // Default far away
    let aiCarZ = -20; // Default intersection Z
    let distToHazard = 100; // Default safe
    let isAICarInIntersectionArea = false; 

    if (aiCarRef.current) {
        aiCarX = aiCarRef.current.position.x; 
        aiCarZ = aiCarRef.current.position.z;
        
        distToHazard = Math.sqrt(
            Math.pow(x - aiCarX, 2) + 
            Math.pow(z - aiCarZ, 2)
        );

        // AI car moves from X = -30 to X = 30 across the intersection
        if (aiCarX < 20 && aiCarX > -20) { 
            isAICarInIntersectionArea = true;
        }
    }

    // --- LOGIC ---

    // 1. Detect Stop in Zone (Approaching line)
    // Stop Line is around Z = -14
    if (z < -5 && z > -15) { // Wider zone for stop detection
      if (speed < 0.2) { // More lenient speed threshold
        if (!stoppedRef.current) {
          stoppedRef.current = true;
          setMessage('Stopped. Wait for cross traffic.');
        }
      }
    }

    // 2. Intersection Logic (Player entering intersection past stop line)
    if (z < -16) { // Player has crossed the stop line
        // FAIL CONDITION A: Ran Stop Sign
        if (!stoppedRef.current) {
            failLevel('FAILED: You ran the Stop Sign!');
            finishedRef.current = true;
            return;
        }

        // FAIL CONDITION B: Dangerous Pull Out (didn't give way)
        if (isAICarInIntersectionArea && distToHazard < 15) { // Threshold adjusted
             failLevel('FAILED: You pulled out in front of cross traffic!'); 
             finishedRef.current = true;
             return;
        }
    }

    // 3. Success Condition (Player safely crossed intersection)
    if (z < -30) {
      finishedRef.current = true; 
      if (stoppedRef.current) {
        passLevel();
      } else {
        failLevel('FAILED: Did not stop at Stop Sign or drove off road!');
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

      {/* Moving AI Traffic (from left to right) */}
      <AICar 
        ref={aiCarRef} 
        startPos={[-30, 0.2, -22.5]} // Starts left of intersection
        endPos={[30, 0.2, -22.5]}   // Ends right of intersection
        speed={15} 
        delay={0} 
        color="red" 
        rotation={[0, 3 * Math.PI / 2, 0]} // Faces +X, moving right
      />

      {/* Player Car */}
      <Car position={[-2.5, 1, 8]} />
    </group>
  );
};