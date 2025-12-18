import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Intersection } from '../components/world/Intersection';
import { Car } from '../components/vehicle/Car';
import { AICar } from '../components/vehicle/AICar';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const UnmarkedIntersectionScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const aiCarRef = useRef<THREE.Group>(null);

  // Grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  
  useEffect(() => {
    setMessage('Scenario: Unmarked Intersection. There are no signs. Give way to traffic from your RIGHT.');
  }, [setMessage]);

  useEffect(() => {
    const grassPhysicsObject: PhysicsObject = {
        id: grassPhysicsObjectId,
        position: new THREE.Vector3(0, -0.6, 0),
        quaternion: new THREE.Quaternion(),
        size: new THREE.Vector3(200, 1, 200),
        type: 'grass',
        onCollide: () => {}
    };
    PhysicsSystem.registerObject(grassPhysicsObject);
    return () => {
        PhysicsSystem.unregisterObject(grassPhysicsObjectId);
    };
  }, []);

  useFrame(() => {
    if (finished || finishedRef.current) return;

    const telemetry = useGameStore.getState().telemetry;
    if (!telemetry || !telemetry.position) return;

    const { position } = telemetry;
    const playerZ = position.z;

    let aiX = 1000;
    if (aiCarRef.current) {
        aiX = aiCarRef.current.position.x;
    }

    // Fail Condition: Crossing path of AI Car (collision or near miss)
    // AI Car travels along X axis (at Z approx -2.5 relative to center? No, center of intersection is 0,0).
    // Road width 10. AI Car is in its left lane (Right side of road).
    // If AI moving Right to Left (-X direction): It's in the Upper lane (Z < 0) or Lower lane (Z > 0)?
    // In NZ (left side drive):
    // Traffic from Right comes on the NEAR side lane (Z > 0) relative to them?
    // Let's visualize:
    // Player approaches from +Z. 
    // Right road is +X.
    // Car on +X road driving towards 0.
    // It should be in the lane with Z < 0 (its left).
    // Player crosses Z=0.
    
    // Fail logic:
    // If Player enters intersection (Z < 8)
    // AND AI Car hasn't cleared it yet (AI X > -8).
    // AI starts at 40.
    
    if (playerZ < 8 && playerZ > -8) { // In intersection zone
        if (aiX > -8 && aiX < 40) { // AI is approaching or in intersection
             failLevel('You failed to give way to the right!');
             finishedRef.current = true;
             setFinished(true);
             return;
        }
    }

    // Success
    if (playerZ < -20) {
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    }
  });

  return (
    <group>
      {/* Grass */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
            <boxGeometry args={[200, 1, 200]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Intersection */}
      <Intersection position={[0, 0, 0]} />

      {/* Roads */}
      <StraightRoad position={[0, 0, 15]} length={20} /> {/* Player approach */}
      <StraightRoad position={[0, 0, -15]} length={20} />
      <StraightRoad position={[15, 0, 0]} rotation={[0, Math.PI / 2, 0]} length={20} /> {/* Right */}
      <StraightRoad position={[-15, 0, 0]} rotation={[0, Math.PI / 2, 0]} length={20} /> {/* Left */}

      {/* AI Car from Right */}
      {/* Starts at X=40, Z=-2.5 (Left lane for them). Moves -X. */}
      {/* Wait, if it moves -X, it goes from 40 to -40. */}
      {/* Rotation: -PI/2 (Face -X)? No, standard is Face -Z. */}
      {/* If I rotate AI Car -PI/2 (Face Right), it moves +X. */}
      {/* To Face Left (-X), rotation is PI/2. */}
      <AICar 
        ref={aiCarRef}
        startPos={[40, 0.2, -2.5]} 
        endPos={[-40, 0.2, -2.5]} 
        speed={15} 
        delay={0} 
        color="red" 
        rotation={[0, Math.PI / 2, 0]} 
      />

      {/* Player Car */}
      <Car position={[-2.5, 1, 23]} />
    </group>
  );
};
