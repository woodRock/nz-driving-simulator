import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';

interface AmbulanceProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  speed?: number; // Movement speed
}

export const Ambulance = forwardRef<THREE.Group, AmbulanceProps>(({
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  speed = 0 
}, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  useImperativeHandle(ref, () => groupRef.current!);

  const [physicsObjectId] = useState(() => `ambulance_${Math.random().toFixed(5)}`);
  const [lightState, setLightState] = useState(0); // 0: off, 1: red, 2: blue

  // Dimensions
  const width = 2.4;
  const height = 2.8;
  const length = 6.0;
  const size = new THREE.Vector3(width, height, length);

  useEffect(() => {
    // Flashing lights interval
    const interval = setInterval(() => {
        setLightState(prev => (prev + 1) % 2); // Toggle 0/1
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!groupRef.current) return;
    const initialQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));

    const physicsObject: PhysicsObject = {
        id: physicsObjectId,
        position: groupRef.current.position,
        quaternion: initialQuaternion,
        size: size,
        type: 'aiCar', // Treat as aiCar
        onCollide: () => {}
    };
    PhysicsSystem.registerObject(physicsObject);

    return () => {
        PhysicsSystem.unregisterObject(physicsObjectId);
    };
  }, [position, rotation]);

  useFrame((_, delta) => {
      if (speed > 0 && groupRef.current) {
          // Simple movement forward in local Z (or whatever direction it faces)
          // Assuming facing -Z like other cars?
          // Let's assume standard car orientation: Forward is -Z.
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(groupRef.current.quaternion);
          groupRef.current.position.add(forward.multiplyScalar(speed * delta));
          
          // Sync physics
          const obj = PhysicsSystem.getObject(physicsObjectId);
          if (obj) {
              obj.position.copy(groupRef.current.position);
          }
      }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Body */}
      <mesh position={[0, height/2, 0]} castShadow>
        <boxGeometry args={[width, height, length]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>

      {/* Red Stripe */}
      <mesh position={[0, height * 0.6, 0]}>
        <boxGeometry args={[width + 0.05, 0.4, length]} />
        <meshStandardMaterial color="#FF0000" />
      </mesh>

      {/* Windows */}
      <mesh position={[0, height * 0.8, -length/2 + 0.5]}>
         <boxGeometry args={[width - 0.2, 0.6, 1.5]} />
         <meshStandardMaterial color="#333" />
      </mesh>

      {/* Wheels */}
      <mesh position={[-1.1, 0.5, 2]} rotation={[0, 0, Math.PI/2]}>
         <cylinderGeometry args={[0.5, 0.5, 0.5, 16]} />
         <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[1.1, 0.5, 2]} rotation={[0, 0, Math.PI/2]}>
         <cylinderGeometry args={[0.5, 0.5, 0.5, 16]} />
         <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[-1.1, 0.5, -2]} rotation={[0, 0, Math.PI/2]}>
         <cylinderGeometry args={[0.5, 0.5, 0.5, 16]} />
         <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[1.1, 0.5, -2]} rotation={[0, 0, Math.PI/2]}>
         <cylinderGeometry args={[0.5, 0.5, 0.5, 16]} />
         <meshStandardMaterial color="black" />
      </mesh>

      {/* Lights Bar */}
      <mesh position={[0, height + 0.1, -length/2 + 1]}>
         <boxGeometry args={[1.5, 0.2, 0.4]} />
         <meshStandardMaterial color="#CCCCCC" />
      </mesh>

      {/* Left Light (Red) */}
      <mesh position={[-0.5, height + 0.1, -length/2 + 1]}>
          <boxGeometry args={[0.4, 0.3, 0.5]} />
          <meshStandardMaterial 
            color="red" 
            emissive="red" 
            emissiveIntensity={lightState === 0 ? 5 : 0.5} 
          />
      </mesh>

      {/* Right Light (Blue) */}
      <mesh position={[0.5, height + 0.1, -length/2 + 1]}>
          <boxGeometry args={[0.4, 0.3, 0.5]} />
          <meshStandardMaterial 
            color="blue" 
            emissive="blue" 
            emissiveIntensity={lightState === 1 ? 5 : 0.5} 
          />
      </mesh>
    </group>
  );
});
