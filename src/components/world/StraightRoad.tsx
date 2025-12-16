import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

interface StraightRoadProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  length?: number;
}

export const StraightRoad: React.FC<StraightRoadProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  length = 10 
}) => {
  const roadRef = useRef<THREE.Group>(null);

  // Unique ID for physics system registration
  const physicsObjectId = useRef(`straightRoad_${Math.random().toFixed(5)}`);
  // Size for AABB collision: based on planeGeometry args (10 width, length depth)
  const roadSize = new THREE.Vector3(10, 0.1, length); // Assuming a small thickness for Y-axis

  useEffect(() => {
    if (!roadRef.current) return;

    const initialQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));

    // Register road with PhysicsSystem
    const roadPhysicsObject: PhysicsObject = {
        id: physicsObjectId.current,
        position: roadRef.current.position, // Use visual group's position
        quaternion: initialQuaternion, // Use initial quaternion
        size: roadSize,
        type: 'road',
        onCollide: (_other: PhysicsObject) => {
            // Can be used to detect if a car drives off the road
            // console.log(`StraightRoad collided with ${_other.type}`);
        }
    };
    PhysicsSystem.registerObject(roadPhysicsObject);

    // Cleanup: unregister on unmount
    return () => {
        PhysicsSystem.unregisterObject(physicsObjectId.current);
    };
  }, [position, rotation, length]); // Depend on props for re-registration if they change

  return (
    <group ref={roadRef} position={position} rotation={rotation} userData={{ type: 'road' }}>
      {/* Road Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, length]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* Center Line (Dashed) */}
      {Array.from({ length: Math.floor(length / 2) }).map((_, i) => (
        <mesh 
          key={i} 
          position={[0, 0.01, -length / 2 + 1 + i * 2]} 
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.1, 1]} />
          <meshStandardMaterial color="white" />
        </mesh>
      ))}

      {/* Left Edge Line */}
      <mesh position={[-4.8, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, length]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Right Edge Line */}
      <mesh position={[4.8, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, length]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
};