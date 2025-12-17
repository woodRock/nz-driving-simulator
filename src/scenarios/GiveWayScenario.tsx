import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Intersection } from '../components/world/Intersection';
import { GiveWaySign } from '../components/world/GiveWaySign';
import { Car } from '../components/vehicle/Car';
import { StationaryAICar } from '../components/vehicle/StationaryAICar';

import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

// Define AICar paths relative to the road layout
// Road is 10 units wide. Center is X=0 for vertical, Z=-10 for horizontal.
// Lanes are approx. 2.5 units from center. So:
// Horizontal road (Z=-10): lanes at Z=-7.5 and Z=-12.5
// Vertical road (X=0): lanes at X=-2.5 and X=2.5

export const GiveWayScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  // Unique ID for physics system registration for the grass
  const [physicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(100, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -10); // Matches the mesh position

  useEffect(() => {
    setMessage('Scenario: Crossroads. Go Straight. Give Way to crossing traffic.');
  }, [setMessage]);

  useEffect(() => {
    // Register grass with PhysicsSystem
    const grassPhysicsObject: PhysicsObject = {
        id: physicsObjectId,
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
        PhysicsSystem.unregisterObject(physicsObjectId);
    };
  }, [failLevel]); // Depend on failLevel to ensure onCollide has latest ref

  useFrame(() => {
    if (finished || finishedRef.current) return;

    const telemetry = useGameStore.getState().telemetry;
    const { position } = telemetry;
    
    // Check completion (Crossed to the other side)
    if (position.z < -20) {
         passLevel();
         finishedRef.current = true;
         setFinished(true);
    }

    // Check Failures (Turning or crashing)
    // If they turn left or right significantly
    if (position.x < -15 || position.x > 15) {
        failLevel('You turned! You were supposed to go straight.');
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

      {/* Crossroad */}
      <Intersection position={[0, 0, -10]} />

      {/* Roads */}
      <StraightRoad position={[0, 0, 0]} length={10} />       {/* Start */}
      <StraightRoad position={[0, 0, -20]} length={10} />     {/* End */}
      <StraightRoad position={[-10, 0, -10]} rotation={[0, Math.PI / 2, 0]} length={10} /> {/* Left */}
      <StraightRoad position={[10, 0, -10]} rotation={[0, Math.PI / 2, 0]} length={10} />  {/* Right */}

      {/* Signs */}
      <GiveWaySign position={[-5.5, 0, -1]} rotation={[0, 0, 0]} />


      {/* Stationary AI Car: Approaching from right, indicating left turn (does not cross the player's path) */}
      <StationaryAICar 
        position={[7.5, 0.2, -7.5]} // Corrected Y-position to 1 for placement on the ground
        rotation={[0, Math.PI / 2, 0]} // Faces +X, towards the intersection
        color="orange" 
        indicatingLeft={true} // Explicitly set to not indicate left
        indicatingRight={false} // Explicitly set to not indicate right
      />

      {/* Stationary AI Car: Approaching from right, indicating left turn (does not cross the player's path) */}
      <StationaryAICar 
        position={[-7.5, 0.2, -12.5]} // Corrected Y-position to 1 for placement on the ground
        rotation={[0, 3 *Math.PI / 2, 0]} // Faces +X, towards the intersection
        color="red" 
        indicatingLeft={true} // Explicitly set to not indicate left
        indicatingRight={false} // Explicitly set to not indicate right
      />

      {/* Player Car */}
      <Car position={[-2.5, 1, 4]} />
    </group>
  );
};