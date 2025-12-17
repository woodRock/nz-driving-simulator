import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';
import { Cyclist } from '../components/vehicle/Cyclist'; // Import Cyclist component

import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';


export const CyclistHazardScenario: React.FC = () => {
  const setMessage = useGameStore((state) => state.setMessage);
  const passLevel = useGameStore((state) => state.passLevel);
  const failLevel = useGameStore((state) => state.failLevel);

  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  const cyclistRef = useRef<THREE.Group>(null); // Ref for the Cyclist's THREE.Group

  // Unique ID for physics system registration for the grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(100, 1, 200); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -50); // Matches the mesh position

  useEffect(() => {
    setMessage('Scenario: Cyclist Ahead. Overtake safely (leave 1.5m gap).');
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
    if (finished || finishedRef.current) return;

    const { position } = useGameStore.getState().telemetry;
    const carZ = position.z;
    const carX = position.x;

    // --- TRACK CYCLIST ---
    let cyclistZ = -30; // Default far away

    if (cyclistRef.current) {
        cyclistZ = cyclistRef.current.position.z;
    }
    
    // Fail if player passes too close to the cyclist
    // Player is in the overtaking zone (carZ < -30 && carZ > -70)
    // Cyclist is present (cyclistZ is also in this zone)
    // Player X is in the same lane as cyclist (e.g., carX < 0 for left lane)
    // Distance to cyclist is too small
    if (carZ < -20 && carZ > -70) { // Overtaking detection zone (player must be in this zone)
        if (cyclistRef.current) { // Ensure cyclist is active in the scene
            if (Math.abs(carZ - cyclistZ) < 5) { // If player is roughly alongside cyclist (Z difference < 5 units)
                if (carX < 0.5) { // If player is in cyclist's lane (cyclist is at X=-3.5, so X < 0.5 is left lane)
                    failLevel('You passed too close to the cyclist! Maintain safe distance.');
                    finishedRef.current = true;
                    setFinished(true);
                    return;
                }
            }
        }
    }

    // Pass condition: Player successfully overtook cyclist and is well ahead
    // Player is past the cyclist (carZ < cyclistZ), and well past the overtaking zone (carZ < -80)
    if (carZ < -80 && cyclistZ > -90) { // Player is far past the cyclist AND cyclist is also past the initial zone
         passLevel();
         finishedRef.current = true;
         setFinished(true);
    }
    
    // Out of bounds / drove off road
    if (carX < -5.5 || carX > 5.5) { // Standard road width check (e.g., 10 units wide road, -5 to 5)
        failLevel('You drove off the road!');
        finishedRef.current = true;
        setFinished(true);
    }
  });

  return (
    <group>
      {/* Removed RigidBody from Grass */}
      <mesh position={[0, -0.6, -50]} receiveShadow>
            <boxGeometry args={[100, 1, 200]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Long Road - Centered at X=0, Road width 10 (X=-5 to X=5) */}
      <StraightRoad position={[0, 0, 0]} length={10} />
      <StraightRoad position={[0, 0, -10]} length={10} />
      <StraightRoad position={[0, 0, -20]} length={10} />
      <StraightRoad position={[0, 0, -30]} length={10} />
      <StraightRoad position={[0, 0, -40]} length={10} />
      <StraightRoad position={[0, 0, -50]} length={10} />
      <StraightRoad position={[0, 0, -60]} length={10} />
      <StraightRoad position={[0, 0, -70]} length={10} />
      <StraightRoad position={[0, 0, -80]} length={10} />
      <StraightRoad position={[0, 0, -90]} length={10} />
      <StraightRoad position={[0, 0, -100]} length={10} />

      {/* Cyclist */}
      <Cyclist 
        ref={cyclistRef}
        startPos={[-3.5, 0.2, -10]} // Starts in the left lane, closer to player
        endPos={[-3.5, 0.2, -90]} // Moves straight down the road
        speed={3} 
        delay={0} 
      />

      {/* Player Car - Starts behind the cyclist in the left lane */}
      <Car position={[-2.5, 1, 0]} /> 
    </group>
  );
};