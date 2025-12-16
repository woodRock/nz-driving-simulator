import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

export const GiveWaySign: React.FC<{ position: [number, number, number], rotation?: [number, number, number] }> = ({ position, rotation = [0, 0, 0] }) => {
  const signRef = useRef<THREE.Group>(null);

  // Unique ID for physics system registration
  const physicsObjectId = useRef(`giveWaySign_${Math.random().toFixed(5)}`);
  // Approximate size for AABB collision: pole height + sign diameter
  const signSize = new THREE.Vector3(0.8, 2.5, 0.05); // Approximated: 0.8 width, 2.5 height, 0.05 depth

  useEffect(() => {
    if (!signRef.current) return;

    const initialQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));

    // Register sign with PhysicsSystem
    const signPhysicsObject: PhysicsObject = {
        id: physicsObjectId.current,
        position: signRef.current.position, // Use visual group's position
        quaternion: initialQuaternion, // Use initial quaternion
        size: signSize,
        type: 'sign',
        onCollide: (_other: PhysicsObject) => {
            // console.log(`GiveWaySign collided with ${_other.type}`);
        }
    };
    PhysicsSystem.registerObject(signPhysicsObject);

    // Cleanup: unregister on unmount
    return () => {
        PhysicsSystem.unregisterObject(physicsObjectId.current);
    };
  }, [position, rotation]); // Depend on position and rotation for re-registration if they change

  return (
    <group ref={signRef} position={position} rotation={rotation} userData={{ type: 'sign' }}>
        {/* Pole */}
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 2]} />
          <meshStandardMaterial color="gray" />
        </mesh>
        
        {/* Sign */}
        <mesh position={[0, 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.05, 3]} />
            <meshStandardMaterial color="white" />
        </mesh>
         <mesh position={[0, 2, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 3]} />
            <meshStandardMaterial color="red" />
        </mesh>
         <mesh position={[0, 2, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 3]} />
            <meshStandardMaterial color="white" />
        </mesh>
    </group>
  );
};