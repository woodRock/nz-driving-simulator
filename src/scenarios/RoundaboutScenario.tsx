import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Roundabout } from '../components/world/Roundabout';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';

import { useGameStore } from '../store/gameStore';
import { StationaryAICar } from '../components/vehicle/StationaryAICar';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';

export const RoundaboutScenario: React.FC = () => {
   const { setMessage, telemetry, passLevel, failLevel } = useGameStore();
   const [entered, setEntered] = useState(false);
   const [finished, setFinished] = useState(false);
   const finishedRef = useRef(false);

  // Unique ID for physics system registration for the grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(200, 1, 200); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -20); // Matches the mesh position

    useEffect(() => {
      setMessage('Scenario: Roundabout. Turn Right (3rd Exit). Indicate correctly!');
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
                    }        };
        PhysicsSystem.registerObject(grassPhysicsObject);

        // Cleanup: unregister on unmount
        return () => {
            PhysicsSystem.unregisterObject(grassPhysicsObjectId);
        };
    }, [failLevel]); // Depend on failLevel to ensure onCollide has latest ref


    useFrame(() => {
        if (finished || finishedRef.current) return;
        const { position, indicators } = telemetry;

        // Check entry (approaching roundabout center at 0,0,-20)
        // Entry point is roughly Z = -10.
        if (position.z < -10 && !entered) {
            setEntered(true);
            if (!indicators.right) {
                 // Technically you indicate right before entering if turning right.
                 // We could fail here, or be lenient.
                 // failLevel('Failed to indicate right before entering!');
                 // finishedRef.current = true;
                 // setFinished(true);
            }
        }

        if (entered) {
            // Check Exits
            // Target: East Exit (X > 15, Z around -20)
            if (position.x > 15) {
                if (indicators.left) {
                    passLevel();
                } else {
                    failLevel('You failed to indicate left before exiting!');
                }
                finishedRef.current = true;
                setFinished(true);
            }
            
            // Wrong Exits
            // West (Left turn)
            if (position.x < -15) {
                failLevel('Wrong exit! You turned left.');
                finishedRef.current = true;
                setFinished(true);
            }
            // North (Straight)
            if (position.z < -35) {
                failLevel('Wrong exit! You went straight.');
                finishedRef.current = true;
                setFinished(true);
            }
        }
    });

  return (
    <group>
      {/* Ground Plane */}
      <mesh position={grassPosition} receiveShadow>
            <boxGeometry args={[200, 1, 200]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Center Roundabout */}
      <Roundabout position={[0, 0, -20]} />

      {/* South Road (Player Start) */}
      <StraightRoad position={[0, 0, 0]} length={20} />

      {/* North Road */}
      <StraightRoad position={[0, 0, -40]} length={20} />

      {/* East Road */}
      <StraightRoad position={[20, 0, -20]} rotation={[0, Math.PI / 2, 0]} length={20} />

      {/* West Road */}
      <StraightRoad position={[-20, 0, -20]} rotation={[0, Math.PI / 2, 0]} length={20} />

      {/* Stationary AI Car: Approaching from top-left, indicating left turn (does not cross the player's path) */}
      <StationaryAICar 
        position={[-12.5, 0.2, -21.5]} // Corrected Y-position to 1 for placement on the ground
        rotation={[0, 3 * Math.PI / 2, 0]} // Faces +X, towards the intersection
        color="orange" 
        indicatingLeft={true} // Explicitly set to not indicate left
        indicatingRight={false} // Explicitly set to indicate right
      />
      
      {/* Player Car */}
      <Car position={[-2.5, 1, 9]} />
    </group>
  );
};