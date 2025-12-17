import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';
import { Pedestrian } from '../components/vehicle/Pedestrian'; // Import the new Pedestrian component
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';

export const PedestrianScenario: React.FC = () => {
  const { setMessage, failLevel, passLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const failedRef = useRef(false);
  const [hasStopped, setHasStopped] = useState(false); // New state for stop detection
  const pedestrianCrossedRef = useRef(false); // Track if pedestrian has cleared
  const pedestrianRef = useRef<THREE.Group>(null); // Ref for the Pedestrian's GROUP
  const [pedestrianActive, setPedestrianActive] = useState(false); // New state to trigger pedestrian movement

  // Unique ID for physics system registration for the grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(50, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -20); // Matches the mesh position

  useEffect(() => {
    setMessage('Scenario: Pedestrian Crossing. Give way to the pedestrian!');
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
  }, [failLevel]); // Depend on failLevel to ensure onCollide has latest ref

  useFrame(() => {
    if (finished || failedRef.current) return;
    const telemetry = useGameStore.getState().telemetry; // Access telemetry directly
    if (!telemetry || !telemetry.position) return;

    const { position } = telemetry; // Only destructure position
    const speed = telemetry.speed; // Explicitly define speed
    const playerSpeed = speed;

    // Pedestrian crosses at z = -20, across X from -10 to 10
    const pedestrianCrossingZ = -20;
    const playerStopLineZ = -15; // Player needs to stop before this Z
    const roadWidth = 10; // Road is 10 units wide (X from -5 to 5)
    const pedestrianRoadEndX = roadWidth / 2;    // 5

    // Get Pedestrian's actual position if ref is available
    let currentPedestrianX = 0;
    let isPedestrianOnRoad = false; // Declare here
    if (pedestrianRef.current) {
        currentPedestrianX = pedestrianRef.current.position.x; // Now directly from THREE.Mesh
        // Check if pedestrian is actually on the road
        isPedestrianOnRoad = (currentPedestrianX > -pedestrianRoadEndX && currentPedestrianX < pedestrianRoadEndX); // Check if between -5 and 5
    }
    
    // Trigger pedestrian movement when player enters a zone
    if (!pedestrianActive && position.z < -5 && position.z > -15) { // Trigger zone before stop line
        setPedestrianActive(true);
        setMessage('Pedestrian ahead! Stop before the crossing.');
    }

    // Stop Detection: Player must stop before playerStopLineZ if pedestrian is present
    const playerAtStopLine = (position.z < playerStopLineZ + 5 && position.z > playerStopLineZ - 5); // Much wider window around the stop line
    if (pedestrianActive && !hasStopped && playerAtStopLine && playerSpeed < 1.5) { // Pedestrian needs to be active, even more lenient speed
        setHasStopped(true);
    }

    // Pedestrian crossed logic: Pedestrian has moved past the road boundaries
    if (pedestrianRef.current && !pedestrianCrossedRef.current) {
        if (currentPedestrianX >= pedestrianRoadEndX) { // Pedestrian has crossed the entire road (X >= 5)
            pedestrianCrossedRef.current = true;
            if (!isPedestrianOnRoad) {
                setMessage('Pedestrian has safely crossed. You may proceed.');
            }
        }
    }

    // Fail if player crosses stop line without stopping while pedestrian is active
    if (pedestrianActive && !hasStopped && position.z < playerStopLineZ - 2) { // Player passed stop line without stopping (Z < -17)
        failLevel('You did not stop for the pedestrian!');
        failedRef.current = true;
        setFinished(true);
        return;
    }
    
    // Pass condition: Player successfully passed the pedestrian crossing zone
    if (position.z < pedestrianCrossingZ - 10) { // Player is well past the crossing (Z < -30)
        if (pedestrianActive) { // Only evaluate these if the pedestrian was activated
            if (!hasStopped) { 
                failLevel('You did not stop for the pedestrian!');
                failedRef.current = true;
                setFinished(true);
                return;
            }
            if (!pedestrianCrossedRef.current) { 
                 failLevel('You drove before the pedestrian safely crossed!');
                 failedRef.current = true;
                 setFinished(true);
                 return;
            }
        }
        // If pedestrian was never active, or all conditions above are met for active pedestrian
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
      {React.createElement(Pedestrian as any, { 
        ref: pedestrianRef, 
        startPos: [-6, 0.2, -20], // Pedestrian starts just off the road
        endPos: [6, 0.2, -20], // Pedestrian crosses to just off the other side
        speed: 1.5, 
        active: pedestrianActive // Pass the active state
      })}
      
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