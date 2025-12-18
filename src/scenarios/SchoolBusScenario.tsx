import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { SchoolBus } from '../components/vehicle/SchoolBus';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const SchoolBusScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  // Grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  
  useEffect(() => {
    setMessage('Scenario: School Bus. The speed limit is 20km/h when passing a stationary school bus.');
  }, [setMessage]);

  useEffect(() => {
    const grassPhysicsObject: PhysicsObject = {
        id: grassPhysicsObjectId,
        position: new THREE.Vector3(0, -0.6, 0),
        quaternion: new THREE.Quaternion(),
        size: new THREE.Vector3(100, 1, 300),
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

    const { position, speed } = telemetry;
    const z = position.z;

    // Logic: Bus is at z=0. 
    // Passing zone: z from 30 (approach) to -30 (departure).
    // Speed limit: 20 km/h ~= 5.55 m/s.
    // Let's allow slightly over 5.55, say 6.0 (~21.6 km/h) before failing.
    
    if (z < 30 && z > -30) {
        if (Math.abs(speed) > 20.0) {
            failLevel(`Speeding! You passed a school bus at ${(Math.abs(speed) * 3.6).toFixed(1)} km/h. Limit is 20km/h.`);
            finishedRef.current = true;
            setFinished(true);
            return;
        }
    }

    // Success: Passed the zone safely
    if (z < -60) {
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    }
  });

  return (
    <group>
      {/* Grass */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
            <boxGeometry args={[100, 1, 300]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Roads */}
      <StraightRoad position={[0, 0, 50]} length={100} />
      <StraightRoad position={[0, 0, -50]} length={100} />

            {/* School Bus (Stopped on left) */}

            <SchoolBus position={[-3.5, 0, 0]} rotation={[0, Math.PI, 0]} />

      

            {/* Player Car */}

            <Car position={[-2.5, 1, 80]} />

          </group>

        );

      };
