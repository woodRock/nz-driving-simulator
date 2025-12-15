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
import { StationaryAICar } from '../components/vehicle/StationaryAICar';

export const TIntersectionGiveWayScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const stoppedRef = useRef(false); 
  const hasIndicatedRef = useRef(false);
  const [finished, setFinished] = useState(false);
  
  const finishedRef = useRef(false);

  const aiCarRef = useRef<THREE.Group>(null); // Ref for the moving AICar

  // Unique ID for physics system registration for the grass
  const grassPhysicsObjectId = useRef(`grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(100, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -10); // Matches the mesh position

  useEffect(() => {
    setMessage('Scenario: T-Intersection Give Way. Give Way to traffic from your right. Go Straight or Turn Left.');
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

    const { position, speed, indicators } = telemetry;
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

    // --- 2. PLAYER LOGIC ---
    // Detect Stop in Zone (Approaching line)
    // Give Way Line is roughly Z = -1. We check a zone around it.
    if (z < 1 && z > -5) { 
      if (Math.abs(speed) < 0.1) {
        if (!stoppedRef.current) {
          stoppedRef.current = true;
          setMessage('Stopped. Safe to proceed (when clear).');
        }
      }
    }
    
    // Check indicators - player can go straight (no indicator) or turn left (left indicator)
    if (z < 0) { // Once past the initial section
        if (indicators.left) {
            hasIndicatedRef.current = true; // Player indicated left
        } else if (indicators.right) { // Player indicated right - wrong
            failLevel('You indicated right, but you can only go straight or left!');
            finishedRef.current = true;
            setFinished(true);
            return;
        }
    }


    // --- 3. INTERSECTION LOGIC ---
    // We only evaluate "Give Way" failures if the player enters the intersection (Z < -1)
    if (z < -1) { 
        // FAIL CONDITION A: Ignoring the Stop / Not giving way to hazard
        if (!stoppedRef.current && isAICarInIntersectionArea && distToHazard < 15) { 
             failLevel('You entered the intersection without stopping for hazards!'); 
             finishedRef.current = true;
             setFinished(true);
             return;
        }

        // FAIL CONDITION B: Dangerous Cut-off
        if (isAICarInIntersectionArea && distToHazard < 10) { 
             failLevel('You pulled out in front of incoming traffic! (Crash Imminent)'); 
             finishedRef.current = true;
             setFinished(true);
             return;
        }
    }

    // Success Condition: Player either went straight or turned left, and is past the intersection
    if (z < -10 && x < 5 && x > -5) { // Went straight
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    } else if (x < -10 && z < -5) { // Turned left
        if (!hasIndicatedRef.current) {
            failLevel('You turned left but did not indicate!');
            finishedRef.current = true;
            setFinished(true);
            return;
        }
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    }

    // Fail Condition: Turned Right
    if (x > 10 && z < -5) {
        failLevel('You turned right! You were supposed to go straight or turn left.');
        finishedRef.current = true;
        setFinished(true);
    }
    // Fail condition: Drove off road (beyond valid X range after intersection)
    if (z < -10 && (x > 15 || x < -15)) {
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
        speed={12} 
        delay={0} 
        color="blue" 
        rotation={[0, Math.PI / 2, 0]} // Faces -X, moving left
      />

      {/* Player Car */}
      <Car position={[-2.5, 1, 9]} />
    </group>
  );
};