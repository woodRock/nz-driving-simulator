import React, { useEffect, useRef } from 'react';
import { Roads } from '../components/Roads';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';
import { latLonToMeters } from '../utils/geoUtils'; // Import latLonToMeters

export const WellingtonScenario: React.FC = () => {
  const { setMessage, setScore, failLevel } = useGameStore(); // Added failLevel

  // Define spawn and center coordinates
  const spawnLat = -41.34052619898928;
  const spawnLon = 174.77126271642854;
  // Approximate center of Wellington for relative conversion
  const centerLat = -40.761484882856685; 
  const centerLon = 175.828480866816477;

  // Convert spawn Lat/Lon to Meters
  const { x: spawnX, z: spawnZ } = latLonToMeters(spawnLat, spawnLon, centerLat, centerLon);

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
        <meshStandardMaterial color="#558b2f" roughness={0.8} />
      </mesh>

      {/* Roads Visuals */}
      <Roads />

      {/* Player Car */}
      <Car position={[spawnX, 1, spawnZ]} /> {/* Car spawned at calculated Lat/Lon */}
    </group>
  );
};