import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Intersection } from '../components/world/Intersection';
import { StopSign } from '../components/world/StopSign';
import { Car } from '../components/vehicle/Car';
import { AICar } from '../components/vehicle/AICar';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const GiveWayRightVsLeftScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const aiCarRef = useRef<THREE.Group>(null);

  // Grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  
  useEffect(() => {
    setMessage('Scenario: Turning Right vs Left. You are turning RIGHT. Oncoming traffic is turning LEFT. Who gives way? (Hint: You do).');
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
    const { position } = telemetry;

    // AI logic: AI starts North, turns Left to East.
    // Player starts South, turns Right to East.
    // Conflict point: East road entry.
    
    // Fail: Collision (Physics).
    // Also Fail: Entering intersection while AI is turning?
    // AI path: N -> E.
    // Player path: S -> E.
    
    // Check if player enters intersection (Z < 8) while AI is in it.
    let aiZ = -100;
    let aiX = -100;
    if (aiCarRef.current) {
        aiZ = aiCarRef.current.position.z;
        aiX = aiCarRef.current.position.x;
    }
    
    // AI starts at -40. Enters around -10. Exits East.
    // If AI is between Z -15 and Z 5 (intersection area)
    // And Player enters Z < 8.
    
    // Fix: AI is only a threat if it hasn't cleared the intersection (X < 10).
    // Once AI is X > 10, it's on the East road and player can follow.
    
    if (playerEnteringIntersection(position.z)) {
        // Check if player is indicating right
        if (!telemetry.indicators.right) {
             failLevel('You failed to indicate right before turning!');
             finishedRef.current = true;
             setFinished(true);
             return;
        }

        if (aiInIntersection(aiZ) && aiX < 10) {
             failLevel('You must give way to the left-turning vehicle!');
             finishedRef.current = true;
             setFinished(true);
        }
    }

    // Success: Player is on East road (X > 20)
    if (position.x > 20) {
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    }
  });
  
  const playerEnteringIntersection = (z: number) => z < 4 && z > -10;
  const aiInIntersection = (z: number) => z > -20 && z < 10;

  return (
    <group>
      <mesh position={[0, -0.6, 0]} receiveShadow>
            <boxGeometry args={[200, 1, 200]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      <Intersection position={[0, 0, 0]} />
      <StraightRoad position={[0, 0, 15]} length={20} /> {/* South */}
      <StraightRoad position={[0, 0, -15]} length={20} /> {/* North */}
      <StraightRoad position={[15, 0, 0]} rotation={[0, Math.PI / 2, 0]} length={20} /> {/* East */}
      
      {/* Signs */}
      <StopSign position={[-5, 0, 5]} rotation={[0, 0, 0]} /> {/* For Player */}
      <StopSign position={[5, 0, -5]} rotation={[0, Math.PI, 0]} /> {/* For AI */}

      {/* AI Car (Turning Left) */}
      <AICar 
        ref={aiCarRef}
        pathPoints={[
            new THREE.Vector3(2.5, 0.2, -40), // Start Left Lane (North road, driving South)
            new THREE.Vector3(2.5, 0.2, -10),
            new THREE.Vector3(10, 0.2, -2.5), // Curve
            new THREE.Vector3(40, 0.2, -2.5)  // Exit East (Left lane)
        ]} 
        speed={10} 
        delay={1} // Slight delay so player sees them
        color="red"
        indicatingLeft={true}
      />

      {/* Player Car */}
      <Car position={[-2.5, 1, 30]} />
    </group>
  );
};
