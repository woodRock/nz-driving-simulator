import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';
import { Pedestrian } from '../components/vehicle/Pedestrian'; // Import the new Pedestrian component
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';

export const PedestrianIslandScenario: React.FC = () => {
  const { setMessage, failLevel, passLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const failedRef = useRef(false);
  const [hasStopped, setHasStopped] = useState(false); // New state for stop detection
  const pedestrianCrossedRef = useRef(false); // Track if pedestrian has cleared the first half
  const pedestrianRef = useRef<THREE.Group>(null); // Ref for the Pedestrian's GROUP
  const [pedestrianActive, setPedestrianActive] = useState(false); // New state to trigger pedestrian movement

  // Unique ID for physics system registration for the grass
  const grassPhysicsObjectId = useRef(`grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(50, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -20); // Matches the mesh position

  // Traffic Island properties
  const islandWidth = 2; // Width of each island part (along X)
  const islandLength = 4; // Length of each island part (along Z)
  const islandSpacing = 6; // Gap along Z between crossing and island
  const crossingZ = -20; // Z-position of the pedestrian crossing

  // Positions for the two island parts, flanking the crossing along the Z-axis
  const islandFrontVisualPosition = new THREE.Vector3(0, 0.2, crossingZ + islandLength / 2 + islandSpacing / 2); // In front of crossing
  const islandBackVisualPosition = new THREE.Vector3(0, 0.2, crossingZ - islandLength / 2 - islandSpacing / 2); // Behind crossing
  
  useEffect(() => {
    setMessage('Scenario: Pedestrian Crossing (Island). Stop until pedestrian reaches the island, then proceed.');
  }, [setMessage]);

  useEffect(() => {
    // Register grass with PhysicsSystem
    const grassPhysicsObject: PhysicsObject = {
        id: grassPhysicsObjectId.current,
        position: grassPosition,
        quaternion: new THREE.Quaternion(), // Fixed object, identity quaternion
        size: grassSize,
        type: 'grass',
        onCollide: (_other: PhysicsObject) => { // Use _other to avoid TS6133
            if (_other.type === 'playerCar') {
                failLevel('You drove off the road!');
            }
        }
    };
    PhysicsSystem.registerObject(grassPhysicsObject);

    // Register Front Island part with PhysicsSystem
    const islandFrontPhysicsObject: PhysicsObject = {
      id: `trafficIslandFront_${Math.random().toFixed(5)}`,
      position: islandFrontVisualPosition,
      quaternion: new THREE.Quaternion(),
      size: new THREE.Vector3(islandWidth, 1, islandLength),
      type: 'roadBoundary', // Treat as a boundary
      onCollide: (_other: PhysicsObject) => { // Use _other to avoid TS6133
          if (_other.type === 'playerCar') {
              failLevel('You drove onto the traffic island!');
          }
      }
    };
    PhysicsSystem.registerObject(islandFrontPhysicsObject);

    // Register Back Island part with PhysicsSystem
    const islandBackPhysicsObject: PhysicsObject = {
      id: `trafficIslandBack_${Math.random().toFixed(5)}`,
      position: islandBackVisualPosition,
      quaternion: new THREE.Quaternion(),
      size: new THREE.Vector3(islandWidth, 1, islandLength),
      type: 'roadBoundary', // Treat as a boundary
      onCollide: (_other: PhysicsObject) => { // Use _other to avoid TS6133
          if (_other.type === 'playerCar') {
              failLevel('You drove onto the traffic island!');
          }
      }
    };
    PhysicsSystem.registerObject(islandBackPhysicsObject);


    // Cleanup: unregister on unmount
    return () => {
        PhysicsSystem.unregisterObject(grassPhysicsObjectId.current);
        PhysicsSystem.unregisterObject(islandFrontPhysicsObject.id);
        PhysicsSystem.unregisterObject(islandBackPhysicsObject.id);
    };
  }, [failLevel, islandFrontVisualPosition, islandBackVisualPosition, islandWidth, islandLength]); // Depend on relevant props/state

  useFrame(() => {
    if (finished || failedRef.current) return;
    const telemetry = useGameStore.getState().telemetry; // Access telemetry directly
    if (!telemetry || !telemetry.position) return;

    const { position } = telemetry; // Only destructure position
    const speed = telemetry.speed; // Explicitly define speed
    const playerSpeed = speed;

    // Pedestrian crosses at z = -20, across X from -10 to 10
    const pedestrianCrossingZ = -20;
    const playerStopLineZ = -5; // Player needs to stop before this Z, moved further back
    
    const pedestrianHalfwayX = 0; // Pedestrian reaches safety of island gap at X=0 (middle of the road)

    // Get Pedestrian's actual position if ref is available
    let currentPedestrianX = 0;
    if (pedestrianRef.current) {
        currentPedestrianX = pedestrianRef.current.position.x;
    }
    
    // Trigger pedestrian movement when player enters a zone
    if (!pedestrianActive && position.z < 5 && position.z > -15) { // Trigger zone before stop line
        setPedestrianActive(true);
        setMessage('Pedestrian ahead! Stop before the crossing.');
    }

    // Stop Detection: Player must stop before playerStopLineZ if pedestrian is present
    const playerAtStopLine = (position.z < playerStopLineZ + 5 && position.z > playerStopLineZ - 5); // Much wider window around the stop line
    if (pedestrianActive && !hasStopped && playerAtStopLine && playerSpeed < 1.5) { // Pedestrian needs to be active, even more lenient speed
        setHasStopped(true);
        setMessage('STOP DETECTED!'); // Confirm stop
    }

    // Pedestrian reaches island logic
    if (pedestrianRef.current && !pedestrianCrossedRef.current) { // Using pedestrianCrossedRef to signify "reached island gap"
        if (currentPedestrianX >= pedestrianHalfwayX) { // Pedestrian has crossed first half (reached island gap)
            pedestrianCrossedRef.current = true; // Renamed for clarity in this scenario
            setMessage('Pedestrian on island. Proceed when safe for you.');
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
            if (!pedestrianCrossedRef.current) { // If pedestrian did not reach island before player passed
                 failLevel('You drove before the pedestrian reached the safety of the island!');
                 failedRef.current = true;
                 setFinished(true);
                 return;
            }
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

      {/* Traffic Island (two parts) */}
      <mesh position={islandFrontVisualPosition} castShadow>
          <boxGeometry args={[islandWidth, 0.5, islandLength]} />
          <meshStandardMaterial color="gray" />
      </mesh>
      <mesh position={islandBackVisualPosition} castShadow>
          <boxGeometry args={[islandWidth, 0.5, islandLength]} />
          <meshStandardMaterial color="gray" />
      </mesh>

      {/* Pedestrian crossing the road to the island */}
      {React.createElement(Pedestrian as any, { 
        ref: pedestrianRef, 
        startPos: [-6, 0.2, crossingZ], // Pedestrian starts just off the road
        endPos: [0, 0.2, crossingZ], // Crosses to the middle of the gap
        speed: 1.5, 
        active: pedestrianActive // Pass the active state
      })}
      
      {/* Crossing Markings (Zebra Crossing) */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh 
            key={i} 
            position={[-4.5 + i, 0.02, crossingZ]} 
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
