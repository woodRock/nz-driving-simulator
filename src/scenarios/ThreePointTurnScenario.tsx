import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const ThreePointTurnScenario: React.FC = () => {
  const { setMessage, passLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const [reachedEnd, setReachedEnd] = useState(false); // Track if they approached the turn area

  // Grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  
  useEffect(() => {
    setMessage('Scenario: Three-Point Turn. The road is too narrow for a U-turn. Drive to the end, turn around, and return.');
  }, [setMessage]);

  useEffect(() => {
    const grassPhysicsObject: PhysicsObject = {
        id: grassPhysicsObjectId,
        position: new THREE.Vector3(0, -0.6, 0),
        quaternion: new THREE.Quaternion(),
        size: new THREE.Vector3(100, 1, 100),
        type: 'grass',
        onCollide: () => {}
    };
    PhysicsSystem.registerObject(grassPhysicsObject);
    return () => {
        PhysicsSystem.unregisterObject(grassPhysicsObjectId);
    };
  }, []);

  // Kerbs (Physics Objects)
  // Road width 7m (-3.5 to 3.5).
  // Kerb objects at +/- 4.0.
  useEffect(() => {
      const createKerb = (id: string, pos: [number, number, number], size: [number, number, number]) => {
          const obj: PhysicsObject = {
              id,
              position: new THREE.Vector3(...pos),
              quaternion: new THREE.Quaternion(),
              size: new THREE.Vector3(...size),
              type: 'roadBoundary', // Fail on collision
              onCollide: () => {}
          };
          PhysicsSystem.registerObject(obj);
          return obj;
      };

      createKerb('kerb_left', [-5, 0.2, 0], [1, 0.5, 40]);
      createKerb('kerb_right', [5, 0.2, 0], [1, 0.5, 40]);
      createKerb('wall_end', [0, 1, -20], [11, 2, 1]); // Dead end

      return () => {
          PhysicsSystem.unregisterObject('kerb_left');
          PhysicsSystem.unregisterObject('kerb_right');
          PhysicsSystem.unregisterObject('wall_end');
      };
  }, []);

  useFrame(() => {
    if (finished || finishedRef.current) return;

    const telemetry = useGameStore.getState().telemetry;
    if (!telemetry || !telemetry.position) return;

    const { position } = telemetry;

    // 1. Must drive towards the dead end (z < -10)
    if (position.z < -10 && !reachedEnd) {
        setReachedEnd(true);
    }
    
    // 2. Success: Returned to start area (z > 5) AFTER reaching the end
    if (reachedEnd && position.z > 5) {
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    }
  });

  return (
    <group>
      {/* Grass */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
            <boxGeometry args={[100, 1, 100]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Road (Standard is 10m wide, we visuals overlay) */}
      <StraightRoad position={[0, 0, 0]} length={40} />
      
      {/* Visual Kerbs (Narrowing the road to 9m - was 7m) */}
      <mesh position={[-5, 0.1, 0]}>
          <boxGeometry args={[1, 0.2, 40]} />
          <meshStandardMaterial color="#888" />
      </mesh>
      <mesh position={[5, 0.1, 0]}>
          <boxGeometry args={[1, 0.2, 40]} />
          <meshStandardMaterial color="#888" />
      </mesh>
      
      {/* Dead End Barrier */}
      <mesh position={[0, 1, -20]}>
          <boxGeometry args={[11, 2, 0.5]} />
          <meshStandardMaterial color="red" />
      </mesh>

      {/* Player Car */}
      <Car position={[-2.5, 1, 5]} />
    </group>
  );
};
