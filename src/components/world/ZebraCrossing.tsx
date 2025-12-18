import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

interface ZebraCrossingProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const ZebraCrossing: React.FC<ZebraCrossingProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0] 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const physicsObjectId = useRef(`zebra_${Math.random().toFixed(5)}`);
  const length = 10; 

  useEffect(() => {
    if (!groupRef.current) return;
    const initialQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));

    const physicsObject: PhysicsObject = {
        id: physicsObjectId.current,
        position: groupRef.current.position,
        quaternion: initialQuaternion,
        size: new THREE.Vector3(10, 0.1, length),
        type: 'road',
        onCollide: () => {}
    };
    PhysicsSystem.registerObject(physicsObject);
    return () => {
        PhysicsSystem.unregisterObject(physicsObjectId.current);
    };
  }, [position, rotation]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Road Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, length]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* Stripes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh 
            key={i}
            position={[-3.5 + i, 0.02, 0]} 
            rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.6, 6]} /> {/* 6m wide crossing stripes */}
          <meshStandardMaterial color="white" />
        </mesh>
      ))}

      {/* Belisha Beacons (Orange poles) */}
      <mesh position={[-5.5, 2, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 4]} />
          <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[-5.5, 4, 0]}>
          <sphereGeometry args={[0.4]} />
          <meshStandardMaterial color="orange" emissive="orange" emissiveIntensity={0.5} />
      </mesh>

      <mesh position={[5.5, 2, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 4]} />
          <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[5.5, 4, 0]}>
          <sphereGeometry args={[0.4]} />
          <meshStandardMaterial color="orange" emissive="orange" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
};
