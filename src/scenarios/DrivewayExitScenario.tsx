import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Cyclist } from '../components/vehicle/Cyclist';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const DrivewayExitScenario: React.FC = () => {
  const { setMessage, passLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  // Grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  
  useEffect(() => {
    setMessage('Scenario: Driveway Exit. Give way to the cyclist on the footpath BEFORE entering the road. Vision is obstructed.');
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

    // Fail: Hit cyclist (Physics).
    
    // Success: Entered road (Z < -2)
    if (position.z < -2) {
        passLevel();
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

      {/* Main Road */}
      <StraightRoad position={[0, 0, -5]} rotation={[0, Math.PI / 2, 0]} length={60} />
      
      {/* Driveway */}
      <mesh position={[0, 0.02, 15]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[4, 20]} />
          <meshStandardMaterial color="#555" />
      </mesh>
      
      {/* Footpath */}
      <mesh position={[0, 0.03, 5]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[60, 2]} />
          <meshStandardMaterial color="#ccc" />
      </mesh>
      
      {/* Fences (Obstructing view) */}
      <mesh position={[-4, 1, 15]}>
          <boxGeometry args={[1, 2, 20]} />
          <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[4, 1, 15]}>
          <boxGeometry args={[1, 2, 20]} />
          <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Cyclist on Footpath */}
      <Cyclist 
        startPos={[-30, 0.5, 5]} 
        endPos={[30, 0.5, 5]} 
        speed={8} 
        delay={0}
      />

      {/* Player Car */}
      <Car position={[0, 1, 20]} />
    </group>
  );
};
