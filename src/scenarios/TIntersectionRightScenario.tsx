import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Car } from '../components/vehicle/Car';
import { AICar } from '../components/vehicle/AICar';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three'; // Import THREE for Vector3
import { StraightRoad } from '../components/world/StraightRoad';
import { Intersection } from '../components/world/Intersection';
import { GiveWaySign } from '../components/world/GiveWaySign';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';

export const TIntersectionRightScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [hasStopped, setHasStopped] = useState(false);
  
  const hasIndicatedRef = useRef(false);
  const finishedRef = useRef(false);

  const aiCarRef = useRef<THREE.Group>(null); // Ref for the AICar's THREE.Group

  // Unique ID for physics system registration for the grass
  const grassPhysicsObjectId = useRef(`grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(100, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -10); // Matches the mesh position


  useEffect(() => {
    setMessage('Scenario: T-Intersection (Right). Give Way to ALL traffic. Turn Right.');
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
  }, [failLevel]); // Depend on failLevel to ensure onCollide has latest ref

  useFrame(() => {
    if (finishedRef.current) return;

    const currentTelemetry = useGameStore.getState().telemetry;
    const { position, speed, indicators } = currentTelemetry;
    
    // --- 1. TRACK AI CAR ---
    let aiCarX = -50; // Default far away
    let distToHazard = 10; // Default safe
    let isAICarInIntersectionArea = false; // Dynamic check for AI car's hazard status

    if (aiCarRef.current) {
        aiCarX = aiCarRef.current.position.x; // Get position directly from THREE.Group
        const aiCarZ = aiCarRef.current.position.z;
        
        // Calculate raw distance between Player and AI Car
        distToHazard = Math.sqrt(
            Math.pow(position.x - aiCarX, 2) + 
            Math.pow(position.z - aiCarZ, 2)
        );

        // AI car moves from X = -15 to X = 15. Intersection area is roughly X = -5 to 5.
        // Consider AI car a hazard if it's within a wider zone around the intersection.
        if (aiCarX > -10 && aiCarX < 10) { 
            isAICarInIntersectionArea = true;
        }
    }
  
    // --- 2. PLAYER LOGIC ---
    // Indication Check
    if (indicators.right) hasIndicatedRef.current = true;
    
    if (position.z < 0) {
        if (!hasIndicatedRef.current && !indicators.right) {
            failLevel('You did not indicate right!');
            finishedRef.current = true;
            return;
        } 
    }

    // Stop Detection (Must happen before the intersection line)
    // Give Way Line is roughly Z = -5.5. We check a zone around it.
    if (position.z < 0 && position.z > -10 && Math.abs(speed) < 0.1) { // Expanded zone
        if (!hasStopped) {
            setHasStopped(true);
        }
    }
    
    // --- 3. INTERSECTION LOGIC ---
    // We only evaluate "Give Way" failures if the player enters the intersection (Z < -5.5)
    if (position.z < -5.5) { 
        // FAIL CONDITION A: Ignoring the Stop
        // If player hasn't stopped, and AI car is in intersection area, and it's within a reasonable distance
        if (!hasStopped && isAICarInIntersectionArea && distToHazard < 15) { // Adjusted threshold to 15
             failLevel('You entered the intersection without stopping for hazards!'); 
             finishedRef.current = true;
             return;
        }

        // FAIL CONDITION B: Dangerous Cut-off
        // You stopped, but you pulled out right in front of the car.
        // We allow you to enter if the distance is > 10 (Safe Gap).
        if (isAICarInIntersectionArea && distToHazard < 10) { // Adjusted threshold to 10
             failLevel('You pulled out in front of incoming traffic! (Crash Imminent)'); 
             finishedRef.current = true;
             return;
        }
    }

    // Success Condition
    if (position.x > 5) {
        passLevel();
        finishedRef.current = true;
    }

    // Out of bounds
    if (position.z < -30) {
        failLevel('You went straight/off-road!');
        finishedRef.current = true;
    }
    if (position.x < -15) {
        failLevel('You turned left! You were supposed to turn right.');
        finishedRef.current = true;
    }
  });

  return (
    <group>
      {/* Ground */}
      <mesh position={grassPosition} receiveShadow>
          <boxGeometry args={[100, 1, 100]} />
          <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Roads */}
      <StraightRoad position={[-10, 0, -10]} rotation={[0, Math.PI / 2, 0]} length={10} />
      <StraightRoad position={[10, 0, -10]} rotation={[0, Math.PI / 2, 0]} length={10} />
      <Intersection position={[0, 0, -10]} />
      <StraightRoad position={[0, 0, 0]} length={10} />
      <StraightRoad position={[0, 0, 10]} length={10} />

      {/* Signs */}
      <GiveWaySign position={[-5.5, 0, -5.5]} rotation={[0, 0, 0]} />

      {/* Moving AI */}
      <AICar 
        ref={aiCarRef} 
        startPos={[-15, 0.2, -12.5]} // Started further back to give you time
        endPos={[15, 0.2, -12.5]}   
        speed={12} 
        delay={0} 
        color="blue" 
        rotation={[0, 3 * Math.PI / 2, 0]} 
      />

      {/* Player Car */}
      <Car position={[-2.5, 1, 9]} />
    </group>
  );
};