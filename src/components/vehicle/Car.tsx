import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useControls } from '../../hooks/useControls';
import { useGameStore } from '../../store/gameStore';

interface CarProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const Car: React.FC<CarProps> = ({ position = [0, 1, 0], rotation: initialRotation = [0, 0, 0] }) => {
  const rigidBody = useRef<RapierRigidBody>(null);
  const controls = useControls();
  const { camera } = useThree();
  const { updateTelemetry, failLevel } = useGameStore();
  
  // Steering state
  const currentSteeringAngle = useRef(0);
  
  // Indicator blinking state
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink((b) => !b);
    }, 400); // Blink every 400ms
    return () => clearInterval(interval);
  }, []);

  useFrame((_, delta) => {
    if (!rigidBody.current) return;

    const { forward, backward, left, right, brake, indicateLeft, indicateRight } = controls;
    
    // Car settings
    const enginePower = 400 * delta; 
    const maxSteeringAngle = 0.8; // Increased max angle for tighter turns
    const steeringSpeed = 2.0 * delta; // Slower steering response
    
    // Update Steering Angle
    if (left) {
        currentSteeringAngle.current += steeringSpeed;
    } else if (right) {
        currentSteeringAngle.current -= steeringSpeed;
    } else {
        // Return to center
        if (Math.abs(currentSteeringAngle.current) > 0.01) {
            currentSteeringAngle.current -= Math.sign(currentSteeringAngle.current) * steeringSpeed;
        } else {
            currentSteeringAngle.current = 0;
        }
    }
    // Clamp steering
    currentSteeringAngle.current = Math.max(-maxSteeringAngle, Math.min(maxSteeringAngle, currentSteeringAngle.current));

    // Get current state
    const vel = rigidBody.current.linvel();
    const rot = rigidBody.current.rotation();
    const carPos = rigidBody.current.translation();
    const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(rot);
    
    const signedSpeed = vel.x * forwardDir.x + vel.z * forwardDir.z;
    const absSpeed = Math.abs(signedSpeed);



    // Update Telemetry
    updateTelemetry({
        speed: absSpeed,
        position: { x: carPos.x, y: carPos.y, z: carPos.z },
        indicators: { left: indicateLeft, right: indicateRight }
    });

    // Movement Logic
    const impulse = { x: 0, y: 0, z: 0 };
    if (forward) {
        impulse.x += forwardDir.x * enginePower;
        impulse.z += forwardDir.z * enginePower;
    }
    if (backward) {
        impulse.x -= forwardDir.x * enginePower;
        impulse.z -= forwardDir.z * enginePower;
    }
    rigidBody.current.applyImpulse(impulse, true);

    // Steering
    // Reduce turnFactor to make it less twitchy
    const turnFactor = 0.5; // Increased turn factor for tighter turns
    const targetAngVel = signedSpeed * currentSteeringAngle.current * turnFactor;
    
    rigidBody.current.setAngvel({ x: 0, y: targetAngVel, z: 0 }, true);

    // Damping / Friction
    if (brake) {
        rigidBody.current.setLinearDamping(5);
    } else {
        // Higher base damping to prevent infinite coasting and limit top speed implicitly
        rigidBody.current.setLinearDamping(1.5); 
    }
    
    rigidBody.current.setAngularDamping(5); // High angular damping to stop spinning

    // Camera Follow
    const cameraOffset = new THREE.Vector3(0, 5, 8).applyQuaternion(rot);
    const targetPos = new THREE.Vector3(carPos.x, carPos.y, carPos.z).add(cameraOffset);
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(carPos.x, carPos.y, carPos.z);
  });

  // Euler to Quaternion for initial rotation
  const euler = new THREE.Euler(...initialRotation);

  return (
    <RigidBody 
      ref={rigidBody} 
      position={position} 
      rotation={[euler.x, euler.y, euler.z]}
      colliders={false} 
      mass={500}
      onCollisionEnter={({ other }) => {
        const type = other.rigidBodyObject?.userData?.type;
        if (type === 'grass') {
            failLevel('You drove off the road!');
        } else if (type === 'car') {
            failLevel('You crashed into another car!');
        } else if (type === 'cyclist') {
            failLevel('You hit a cyclist/pedestrian! major fail.');
        }
      }}
    >
        <CuboidCollider args={[1, 0.5, 2]} position={[0, 0.5, 0]} />
        
        {/* Car Body */}
        <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[2, 1, 4]} />
            <meshStandardMaterial color="#2196F3" />
        </mesh>

        {/* Wheels */}
        <mesh position={[-1.1, 0.25, 1.2]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
            <meshStandardMaterial color="black" />
        </mesh>
        <mesh position={[1.1, 0.25, 1.2]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
            <meshStandardMaterial color="black" />
        </mesh>
        <mesh position={[-1.1, 0.25, -1.2]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
            <meshStandardMaterial color="black" />
        </mesh>
        <mesh position={[1.1, 0.25, -1.2]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
            <meshStandardMaterial color="black" />
        </mesh>

        {/* Windshield */}
        <mesh position={[0, 0.9, -0.5]}>
            <boxGeometry args={[1.8, 0.6, 1.5]} />
            <meshStandardMaterial color="#87CEEB" transparent opacity={0.7} />
        </mesh>

        {/* Indicators */}
        {/* Front Left */}
        <mesh position={[-0.9, 0.5, -2.05]}>
            <boxGeometry args={[0.4, 0.2, 0.1]} />
            <meshStandardMaterial 
                color={controls.indicateLeft && blink ? "#FFAA00" : "#333"} 
                emissive={controls.indicateLeft && blink ? "#FFAA00" : "#000"}
                emissiveIntensity={2}
            />
        </mesh>
        {/* Rear Left */}
        <mesh position={[-0.9, 0.5, 2.05]}>
            <boxGeometry args={[0.4, 0.2, 0.1]} />
            <meshStandardMaterial 
                color={controls.indicateLeft && blink ? "#FFAA00" : "#333"} 
                emissive={controls.indicateLeft && blink ? "#FFAA00" : "#000"}
                emissiveIntensity={2}
            />
        </mesh>

        {/* Front Right */}
        <mesh position={[0.9, 0.5, -2.05]}>
            <boxGeometry args={[0.4, 0.2, 0.1]} />
            <meshStandardMaterial 
                color={controls.indicateRight && blink ? "#FFAA00" : "#333"} 
                emissive={controls.indicateRight && blink ? "#FFAA00" : "#000"}
                emissiveIntensity={2}
            />
        </mesh>
        {/* Rear Right */}
        <mesh position={[0.9, 0.5, 2.05]}>
            <boxGeometry args={[0.4, 0.2, 0.1]} />
            <meshStandardMaterial 
                color={controls.indicateRight && blink ? "#FFAA00" : "#333"} 
                emissive={controls.indicateRight && blink ? "#FFAA00" : "#000"}
                emissiveIntensity={2}
            />
        </mesh>
    </RigidBody>
  );
};
