import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';
import { Pedestrian } from '../components/vehicle/Pedestrian'; // Import the new Pedestrian component
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';

export const PedestrianScenario: React.FC = () => {
  const { setMessage, telemetry, failLevel, passLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const failedRef = useRef(false);
  const [hasStopped, setHasStopped] = useState(false); // New state for stop detection
  const pedestrianCrossedRef = useRef(false); // Track if pedestrian has cleared
  const pedestrianRef = useRef<THREE.Mesh>(null); // Ref for the Pedestrian's mesh

  // Unique ID for physics system registration for the grass
  const grassPhysicsObjectId = useRef(`grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(50, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -20); // Matches the mesh position

  useEffect(() => {
    setMessage('Scenario: Pedestrian Crossing. Give way to the pedestrian!');
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
    if (finished || failedRef.current) return;
    const { position, speed } = telemetry;
    const playerSpeed = speed;

    // Pedestrian crosses at z = -20, across X from -10 to 10
    const pedestrianCrossingZ = -20;
    const playerStopLineZ = -15; // Player needs to stop before this Z
    const roadWidth = 10; // Road is 10 units wide (X from -5 to 5)
    const pedestrianRoadStartX = -roadWidth / 2; // -5
    const pedestrianRoadEndX = roadWidth / 2;    // 5

    // Get Pedestrian's actual position if ref is available
    let currentPedestrianX = 0;
    let isPedestrianOnRoad = false;
    if (pedestrianRef.current) {
        currentPedestrianX = pedestrianRef.current.position.x; // Now directly from THREE.Mesh
        // Check if pedestrian is actually on the road
        isPedestrianOnRoad = (currentPedestrianX > pedestrianRoadStartX && currentPedestrianX < pedestrianRoadEndX);
    }
    
    // We now have `isPedestrianOnRoad` which is more accurate.
    const pedestrianPresent = isPedestrianOnRoad; 

    // console.log(`Pedestrian X: ${currentPedestrianX.toFixed(2)}, On Road: ${isPedestrianOnRoad}, Player Z: ${position.z.toFixed(2)}, Player Speed: ${playerSpeed.toFixed(2)}, hasStopped: ${hasStopped}`);


    // Stop Detection: Player must stop before playerStopLineZ if pedestrian is present
    const playerAtStopLine = (position.z < playerStopLineZ + 2 && position.z > playerStopLineZ - 2); // A small window around the stop line
    if (pedestrianPresent && !hasStopped && playerAtStopLine && playerSpeed < 0.5) {
        console.log("STOP DETECTED for Pedestrian! Player Z:", position.z.toFixed(2), "Speed:", playerSpeed.toFixed(2));
        setHasStopped(true);
    }

    // Pedestrian crossed logic: Pedestrian has moved past the road boundaries
    if (pedestrianRef.current && !pedestrianCrossedRef.current) {
        if (currentPedestrianX >= pedestrianRoadEndX) { // Pedestrian has crossed the entire road
            pedestrianCrossedRef.current = true;
            console.log("PEDESTRIAN CROSSED!");
        }
    }

    // Fail if player crosses stop line without stopping while pedestrian is present
    if (pedestrianPresent && !hasStopped && position.z < playerStopLineZ - 2) { // Player passed stop line without stopping
        failLevel('You did not stop for the pedestrian!');
        failedRef.current = true;
        setFinished(true);
        return;
    }
    
    // Pass condition: Player successfully passed the pedestrian crossing zone
    if (position.z < pedestrianCrossingZ - 10) { // Player is well past the crossing
        if (pedestrianPresent && !hasStopped) { // If pedestrian was present and player didn't stop
            failLevel('You did not stop for the pedestrian!');
            failedRef.current = true;
            setFinished(true);
            return;
        }
        if (!pedestrianCrossedRef.current && pedestrianPresent) { // If pedestrian was present and didn't cross
             failLevel('You drove before the pedestrian safely crossed!');
             failedRef.current = true;
             setFinished(true);
             return;
        }

        passLevel();
        setFinished(true);
    }
  });

  return (
    <group>
       {/* Ground */}
      <mesh position={grassPosition} receiveShadow>
            <boxGeometry args={[50, 1, 100]} />
            <meshStandardMaterial color="#81c784" />
      </mesh>

      <StraightRoad position={[0, 0, 0]} length={20} />
      <StraightRoad position={[0, 0, -20]} length={20} />
      <StraightRoad position={[0, 0, -40]} length={20} />

      {/* Pedestrian crossing the road */}
      {React.createElement(Pedestrian as any, { ref: pedestrianRef, startPos: [-12.5, 0.2, -20], endPos: [12.5, 0.2, -20], speed: 1.5, delay: 1 })}
      
      {/* Crossing Markings (Zebra Crossing) */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh 
            key={i} 
            position={[-4.5 + i, 0.02, -20]} 
            rotation={[-Math.PI/2, 0, 0]}
        >
            <planeGeometry args={[0.6, 4]} />
            <meshStandardMaterial color="white" />
        </mesh>
      ))}

      <Car position={[-2.5, 1, 10]} />
    </group>
  );
};