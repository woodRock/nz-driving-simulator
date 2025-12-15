import React, { useEffect, useRef } from 'react';
import { Roads } from '../components/Roads';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';

export const WellingtonScenario: React.FC = () => {
  const { setMessage, setScore, failLevel } = useGameStore(); // Added failLevel

  // Unique ID for physics system registration for the grass
  const grassPhysicsObjectId = useRef(`grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(100000, 1, 100000); // Based on boxGeometry args
  const grassPosition = new THREE.Vector3(0, -0.6, 0); // Matches the mesh position

  useEffect(() => {
    setMessage('Welcome to Wellington! Drive around. (Roads are visual guides only)');
    setScore(0);
  }, [setMessage, setScore]);

  useEffect(() => {
    // Register grass with PhysicsSystem
    const grassPhysicsObject: PhysicsObject = {
        id: grassPhysicsObjectId.current,
        position: grassPosition,
        quaternion: new THREE.Quaternion(), // Fixed object, identity quaternion
        size: grassSize,
        type: 'grass',
        onCollide: (other: PhysicsObject) => {
            if (other.type === 'playerCar') {
                // In Wellington, maybe just log or decrement score, not fail
                console.log('Player drove off road in Wellington!');
                // failLevel('You drove off the road!'); // Optionally fail
            }
        }
    };
    PhysicsSystem.registerObject(grassPhysicsObject);

    // Cleanup: unregister on unmount
    return () => {
        PhysicsSystem.unregisterObject(grassPhysicsObjectId.current);
    };
  }, [failLevel]); // Depend on failLevel to ensure onCollide has latest ref


  return (
    <group>
      {/* Ground Plane */}
      <mesh position={grassPosition} receiveShadow>
        <boxGeometry args={[100000, 1, 100000]} />
        <meshStandardMaterial color="#222222" roughness={0.8} />
      </mesh>

      {/* Roads Visuals */}
      <Roads />

      {/* Player Car */}
      <Car />
    </group>
  );
};