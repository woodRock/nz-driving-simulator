import React, { useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';

export const ParallelParkingScenario: React.FC = () => {
  const setMessage = useGameStore((state) => state.setMessage);
  const failLevel = useGameStore((state) => state.failLevel);
  const passLevel = useGameStore((state) => state.passLevel);
  
  const [finished, setFinished] = useState(false);
  const [startTime] = useState(() => Date.now());

  // Unique IDs for physics system registration
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  const [barrier1PhysicsObjectId] = useState(() => `barrier1_${Math.random().toFixed(5)}`);
  const [barrier2PhysicsObjectId] = useState(() => `barrier2_${Math.random().toFixed(5)}`);

  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(50, 1, 100); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, -20); // Matches the mesh position

  // Barrier dimensions for AABB collision
  const barrierSize = new THREE.Vector3(2, 1, 4); // Based on boxGeometry args
  const barrier1Position = new THREE.Vector3(-4, 0.5, -5);
  const barrier2Position = new THREE.Vector3(-4, 0.5, -19); // Increased separation: -5 to -19 is 14 units center-to-center

  useEffect(() => {
    setMessage('Scenario: Parallel Parking. Park in the green box between the barriers.');
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

    // Register Barrier 1 with PhysicsSystem
    const barrier1PhysicsObject: PhysicsObject = {
        id: barrier1PhysicsObjectId,
        position: barrier1Position,
        quaternion: new THREE.Quaternion(),
        size: barrierSize,
        type: 'barrier',
        onCollide: (other: PhysicsObject) => {
            if (other.type === 'playerCar') {
                failLevel('You hit a barrier!');
            }
        }
    };
    PhysicsSystem.registerObject(barrier1PhysicsObject);

    // Register Barrier 2 with PhysicsSystem
    const barrier2PhysicsObject: PhysicsObject = {
        id: barrier2PhysicsObjectId,
        position: barrier2Position,
        quaternion: new THREE.Quaternion(),
        size: barrierSize,
        type: 'barrier',
        onCollide: (other: PhysicsObject) => {
            if (other.type === 'playerCar') {
                failLevel('You hit a barrier!');
            }
        }
    };
    PhysicsSystem.registerObject(barrier2PhysicsObject);


    // Cleanup: unregister on unmount
    return () => {
        PhysicsSystem.unregisterObject(grassPhysicsObjectId);
        PhysicsSystem.unregisterObject(barrier1PhysicsObjectId);
        PhysicsSystem.unregisterObject(barrier2PhysicsObjectId);
    };
  }, [failLevel]); // Depend on failLevel to ensure onCollide has latest ref

  useFrame(() => {
    if (finished) return;
    const telemetry = useGameStore.getState().telemetry;
    const { position, speed } = telemetry;

    // Target Spot: x: -4, z: -12 (Left side of road)
    // Box size: 3x8
    // Bounds: x [-5.5, -2.5], z [-16, -8]
    // Car Size: 2x4 (Half: 1, 2)
    // Required Center Position to be fully inside:
    // X: [-5.5 + 1, -2.5 - 1] = [-4.5, -3.5]
    // Z: [-16 + 2, -8 - 2] = [-14, -10]
    
    if (Math.abs(speed) < 0.1 && Date.now() - startTime > 3000) {
        // Checking if parked strictly within lines
        if (position.x >= -4.5 && position.x <= -3.5 && position.z >= -14 && position.z <= -10) {
            passLevel();
            setFinished(true);
        }
    }
  });

  return (
    <group>
       {/* Ground */}
      <mesh position={grassPosition} receiveShadow>
            <boxGeometry args={[50, 1, 100]} />
            <meshStandardMaterial color="#90a4ae" />
      </mesh>

      <StraightRoad position={[0, 0, 0]} length={20} />
      <StraightRoad position={[0, 0, -20]} length={20} />

      {/* Parking Spot Marker */}
      <mesh position={[-4, 0.02, -12]} rotation={[-Math.PI/2, 0, 0]}> {/* Updated Z position for centering */}
        <planeGeometry args={[3, 8]} /> {/* Increased length */}
        <meshStandardMaterial color="green" transparent opacity={0.3} />
      </mesh>

      {/* Barriers (representing other cars) */}
      <group> {/* Wrap in a group for visual grouping */}
        <mesh position={barrier1Position} castShadow>
            <boxGeometry args={[2, 1, 4]} />
            <meshStandardMaterial color="red" />
        </mesh>
        <mesh position={barrier2Position} castShadow>
            <boxGeometry args={[2, 1, 4]} />
            <meshStandardMaterial color="blue" />
        </mesh>
      </group>

      <Car position={[-2.5, 1, 5]} />
    </group>
  );
};