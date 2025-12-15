import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

interface IntersectionProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const Intersection: React.FC<IntersectionProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0] 
}) => {
  const intersectionRef = useRef<THREE.Group>(null);

  // Unique ID for physics system registration
  const physicsObjectId = useRef(`intersection_${Math.random().toFixed(5)}`);
  // Size for AABB collision, based on planeGeometry args
  const intersectionSize = new THREE.Vector3(10.2, 0.1, 10.2); // Assuming a small thickness for Y-axis

  useEffect(() => {
    if (!intersectionRef.current) return;

    const initialQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));

    // Register intersection with PhysicsSystem
    const intersectionPhysicsObject: PhysicsObject = {
        id: physicsObjectId.current,
        position: intersectionRef.current.position, // Use visual group's position
        quaternion: initialQuaternion, // Use initial quaternion
        size: intersectionSize,
        type: 'intersection',
        onCollide: (other: PhysicsObject) => {
            // console.log(`Intersection collided with ${other.type}`);
        }
    };
    PhysicsSystem.registerObject(intersectionPhysicsObject);

    // Cleanup: unregister on unmount
    return () => {
        PhysicsSystem.unregisterObject(physicsObjectId.current);
    };
  }, [position, rotation]); // Depend on position and rotation for re-registration if they change

  return (
    <group ref={intersectionRef} position={position} rotation={rotation} userData={{ type: 'intersection' }}>
      {/* Intersection Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10.2, 10.2]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* Markings can be added here, for now keeping it simple */}
      {/* Example: Stop lines or Give Way lines could be added based on props */}
    </group>
  );
};