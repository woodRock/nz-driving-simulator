import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Intersection } from '../components/world/Intersection';
import { Cyclist } from '../components/vehicle/Cyclist';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const GiveWayCyclistScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  // Grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  
  useEffect(() => {
    setMessage('Scenario: Turning Left. Give way to the cyclist on your left going straight.');
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

    // Fail: Collision with cyclist (Physics handles this)
    
    // Success: Completed turn (X < -20)
    if (position.x < -20) {
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    }
    
    // Fail: Missed turn
    if (position.z < -20 && position.x > -5) {
        failLevel('You missed the turn!');
        finishedRef.current = true;
        setFinished(true);
    }
  });

  return (
    <group>
      <mesh position={[0, -0.6, 0]} receiveShadow>
            <boxGeometry args={[200, 1, 200]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      <Intersection position={[0, 0, 0]} />
      <StraightRoad position={[0, 0, 15]} length={20} />
      <StraightRoad position={[0, 0, -15]} length={20} /> {/* North Road */}
      <StraightRoad position={[-15, 0, 0]} rotation={[0, Math.PI / 2, 0]} length={20} />
      
      {/* Cycle Lane Visuals */}
      <mesh position={[-6, 0.02, 15]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[1.5, 20]} />
          <meshStandardMaterial color="#1a4d1a" /> {/* Dark green lane */}
      </mesh>
      <mesh position={[-6, 0.02, -15]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[1.5, 20]} />
          <meshStandardMaterial color="#1a4d1a" />
      </mesh>
      
      {/* Cyclist */}
      {/* Starts parallel/behind, moves straight through */}
      <Cyclist 
        startPos={[-6, 0.5, 30]} 
        endPos={[-6, 0.5, -30]} 
        speed={15} // Fast cyclist
        delay={0}
      />

      {/* Player Car */}
      <Car position={[-2.5, 1, 30]} />
    </group>
  );
};
