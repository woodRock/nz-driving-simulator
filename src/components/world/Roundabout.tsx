import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

interface RoundaboutProps {
  position?: [number, number, number];
}

export const Roundabout: React.FC<RoundaboutProps> = ({ position = [0, 0, 0] }) => {
  const roundaboutRef = useRef<THREE.Group>(null);

  // Unique ID for physics system registration
  const physicsObjectId = useRef(`roundabout_${Math.random().toFixed(5)}`);
  // Approximate size for AABB collision: based on ring geometry args (outer radius 10)
  const roundaboutSize = new THREE.Vector3(20, 0.5, 20); // Width/Depth 2*10, Height ~0.5 for roads/island

  useEffect(() => {
    if (!roundaboutRef.current) return;

    // Register roundabout with PhysicsSystem
    const roundaboutPhysicsObject: PhysicsObject = {
        id: physicsObjectId.current,
        position: roundaboutRef.current.position, // Use visual group's position
        quaternion: new THREE.Quaternion(), // Static object, identity quaternion
        size: roundaboutSize,
        type: 'roundabout',
        onCollide: (other: PhysicsObject) => {
            // console.log(`Roundabout collided with ${other.type}`);
        }
    };
    PhysicsSystem.registerObject(roundaboutPhysicsObject);

    // Cleanup: unregister on unmount
    return () => {
        PhysicsSystem.unregisterObject(physicsObjectId.current);
    };
  }, [position]); // Depend on position for re-registration if it changes

  return (
    <group ref={roundaboutRef} position={position} userData={{ type: 'roundabout' }}>
      {/* Road Surface Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[4, 10, 32]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      {/* Center Island */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[4, 4, 0.4, 32]} />
        <meshStandardMaterial color="#4CAF50" />
      </mesh>
    </group>
  );
};