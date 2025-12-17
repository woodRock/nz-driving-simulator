import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useControls } from '../../hooks/useControls';
import { useGameStore } from '../../store/gameStore';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';
import { TerrainSystem } from '../../systems/TerrainSystem';

interface CarProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const Car: React.FC<CarProps> = ({ position = [0, 1, 0], rotation: initialRotation = [0, 0, 0] }) => {
  const carRef = useRef<THREE.Group>(null);
  const frontLeftWheelRef = useRef<THREE.Group>(null);
  const frontRightWheelRef = useRef<THREE.Group>(null);
  const carQuaternionRef = useRef(new THREE.Quaternion().setFromEuler(new THREE.Euler(...initialRotation)));
  
  const controls = useControls();
  const { camera } = useThree();
  const updateTelemetry = useGameStore(state => state.updateTelemetry);
  const failLevel = useGameStore(state => state.failLevel);
  const levelStatus = useGameStore(state => state.levelStatus);
  
  const linearVelocity = useRef(new THREE.Vector3(0, 0, 0));
  const currentSteeringAngle = useRef(0);
  
  const [blink, setBlink] = useState(false);
  const physicsObjectId = useRef(`playerCar_${Math.random().toFixed(5)}`);
  const carSize = new THREE.Vector3(2, 1, 4); 

  useEffect(() => {
    const interval = setInterval(() => setBlink((b) => !b), 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!carRef.current) return;

    const carPhysicsObject: PhysicsObject = {
        id: physicsObjectId.current,
        position: carRef.current.position,
        quaternion: carQuaternionRef.current,
        size: carSize,
        type: 'playerCar',
        onCollide: (other: PhysicsObject) => {
            if (levelStatus !== 'playing') return; // Don't fail twice

            if (other.type === 'roadBoundary') {
                failLevel('You drove off the road!');
            } else if (other.type === 'aiCar' || other.type === 'stationaryAICar') {
                failLevel('You crashed into another car!');
            } else if (other.type === 'pedestrian') {
                failLevel('You hit a pedestrian! major fail.');
            } else if (other.type === 'cyclist') {
                failLevel('You hit a cyclist! major fail.');
            }
        }
    };
    PhysicsSystem.registerObject(carPhysicsObject);

    return () => {
        PhysicsSystem.unregisterObject(physicsObjectId.current);
    };
  }, [failLevel, levelStatus]);

  useFrame((_, delta) => {
      if (!carRef.current) return;
      if (levelStatus !== 'playing') return; // Stop processing physics if failed/paused

      const { forward, backward, left, right, brake, indicateLeft, indicateRight } = controls;

      // Car physics constants
      const acceleration = 30;
      const maxSpeed = 35; 
      const maxReverseSpeed = -10;
      const brakingDeceleration = 50;
      const frictionDeceleration = 10;
      const maxSteeringAngle = Math.PI / 6; 
      const steeringSpeed = 2.0 * delta; 
      const wheelbase = 3.0; 
      const wheelTurnVisualFactor = 1.0; 

      // Calc current speed relative to car forward direction
      const forwardDir = new THREE.Vector3(0,0,-1).applyQuaternion(carQuaternionRef.current);
      let currentSpeed = linearVelocity.current.dot(forwardDir);

      // --- STEERING ---
      if (left) {
          currentSteeringAngle.current += steeringSpeed;
      } else if (right) {
          currentSteeringAngle.current -= steeringSpeed;
      } else {
          // Return to center
          if (Math.abs(currentSteeringAngle.current) > 0.01) {
              currentSteeringAngle.current -= Math.sign(currentSteeringAngle.current) * steeringSpeed * 2;
          } else {
              currentSteeringAngle.current = 0;
          }
      }
      currentSteeringAngle.current = Math.max(-maxSteeringAngle, Math.min(maxSteeringAngle, currentSteeringAngle.current));

      // --- MOVEMENT ---
      if (forward) {
          currentSpeed += acceleration * delta;
      } else if (backward) {
          currentSpeed -= acceleration * delta;
      }

      if (brake) {
          if (currentSpeed > 0) currentSpeed -= brakingDeceleration * delta;
          else if (currentSpeed < 0) currentSpeed += brakingDeceleration * delta;
          if (Math.abs(currentSpeed) < 1) currentSpeed = 0; // Full stop
      }

      // Friction
      if (!forward && !backward && !brake) {
          if (Math.abs(currentSpeed) > frictionDeceleration * delta) {
              currentSpeed -= Math.sign(currentSpeed) * frictionDeceleration * delta;
          } else {
              currentSpeed = 0;
          }
      }

      currentSpeed = Math.max(maxReverseSpeed, Math.min(maxSpeed, currentSpeed));

      // --- TURNING (Ackermann) ---
      if (Math.abs(currentSpeed) > 0.1) {
          const turnRadius = wheelbase / Math.tan(currentSteeringAngle.current);
          // angular velocity = v / r
          const rotationAmount = (currentSpeed / turnRadius) * delta;
          
          if (Math.abs(rotationAmount) > 0.0001) {
            const rotQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationAmount);
            carQuaternionRef.current.multiply(rotQuat);
            carRef.current.quaternion.copy(carQuaternionRef.current);
          }
      }

      // Apply Velocity
      // Recalculate forward vector based on new rotation
      const newForward = new THREE.Vector3(0, 0, -1).applyQuaternion(carQuaternionRef.current);
      linearVelocity.current.copy(newForward).multiplyScalar(currentSpeed);
      
      const newPos = carRef.current.position.clone().add(linearVelocity.current.clone().multiplyScalar(delta));
      
      // Terrain Following
      const terrainHeight = TerrainSystem.getHeight(newPos.x, newPos.z);
      
      // If terrain data is available, target that height.
      // If not, maintain current height (fly/hover) or slowly descend? 
      // Maintaining height prevents snapping to sea level (0) which causes glitches.
      let targetHeight = carRef.current.position.y; 
      
      if (terrainHeight !== null) {
          // Add suspension/wheel radius offset
          targetHeight = terrainHeight + 0.5;
      } else {
          // Optional: Apply simple gravity if no terrain? 
          // For now, staying level is smoother than falling into void.
      }
      
      // Smoothly interpolate Y
      const yLerpFactor = 10.0 * delta; 
      newPos.y = THREE.MathUtils.lerp(carRef.current.position.y, targetHeight, yLerpFactor);

      // Hard floor only if we have terrain data to respect
      if (terrainHeight !== null && newPos.y < terrainHeight + 0.3) {
          newPos.y = terrainHeight + 0.3;
      }

      carRef.current.position.copy(newPos);

      // --- VISUALS ---
      if (frontLeftWheelRef.current && frontRightWheelRef.current) {
          frontLeftWheelRef.current.rotation.y = currentSteeringAngle.current * wheelTurnVisualFactor;
          frontRightWheelRef.current.rotation.y = currentSteeringAngle.current * wheelTurnVisualFactor;
      }

      // --- TELEMETRY ---
      updateTelemetry({
          speed: currentSpeed,
          position: { x: carRef.current.position.x, y: carRef.current.position.y, z: carRef.current.position.z },
          indicators: { left: indicateLeft, right: indicateRight }
      });

      // --- PHYSICS SYNC ---
      const physicsObject = PhysicsSystem.getObject(physicsObjectId.current);
      if (physicsObject) {
          physicsObject.position.copy(carRef.current.position);
          // Quaternion shared via ref, but explicit copy doesn't hurt if reference broke
          physicsObject.quaternion.copy(carRef.current.quaternion);
      }

      // --- CAMERA ---
      const cameraOffset = new THREE.Vector3(0, 5, 10).applyQuaternion(carQuaternionRef.current);
      const targetPos = carRef.current.position.clone().add(cameraOffset);
      camera.position.lerp(targetPos, 0.1); // Smooth follow
      camera.lookAt(carRef.current.position);
  });

  return (
    <group 
      ref={carRef}
      position={position}
      userData={{ type: 'playerCar' }}
    >
        {/* Car Body */}
        <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[2, 1, 4]} />
            <meshStandardMaterial color="#2196F3" />
        </mesh>

        {/* Wheels */}
        <group>
            <mesh position={[-1.1, 0.25, 1.2]} rotation={[0, 0, Math.PI / 2]}> 
                <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                <meshStandardMaterial color="black" />
            </mesh>
            <mesh position={[1.1, 0.25, 1.2]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                <meshStandardMaterial color="black" />
            </mesh>
            <group ref={frontLeftWheelRef} position={[-1.1, 0.25, -1.2]}>
                <mesh rotation={[0, 0, Math.PI / 2]}> 
                    <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                    <meshStandardMaterial color="black" />
                </mesh>
            </group>
            <group ref={frontRightWheelRef} position={[1.1, 0.25, -1.2]}>
                <mesh rotation={[0, 0, Math.PI / 2]}> 
                    <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                    <meshStandardMaterial color="black" />
                </mesh>
            </group>
        </group>

        {/* Windshield */}
        <mesh position={[0, 0.9, -0.5]}>
            <boxGeometry args={[1.8, 0.6, 1.5]} />
            <meshStandardMaterial color="#87CEEB" transparent opacity={0.7} />
        </mesh>

        {/* Indicators */}
        <mesh position={[-0.9, 0.5, -2.05]}>
            <boxGeometry args={[0.4, 0.2, 0.1]} />
            <meshStandardMaterial 
                color={controls.indicateLeft && blink ? "#FFAA00" : "#333"} 
                emissive={controls.indicateLeft && blink ? "#FFAA00" : "#000"}
                emissiveIntensity={2}
            />
        </mesh>
        <mesh position={[-0.9, 0.5, 2.05]}>
            <boxGeometry args={[0.4, 0.2, 0.1]} />
            <meshStandardMaterial 
                color={controls.indicateLeft && blink ? "#FFAA00" : "#333"} 
                emissive={controls.indicateLeft && blink ? "#FFAA00" : "#000"}
                emissiveIntensity={2}
            />
        </mesh>
        <mesh position={[0.9, 0.5, -2.05]}>
            <boxGeometry args={[0.4, 0.2, 0.1]} />
            <meshStandardMaterial 
                color={controls.indicateRight && blink ? "#FFAA00" : "#333"} 
                emissive={controls.indicateRight && blink ? "#FFAA00" : "#000"}
                emissiveIntensity={2}
            />
        </mesh>
        <mesh position={[0.9, 0.5, 2.05]}>
            <boxGeometry args={[0.4, 0.2, 0.1]} />
            <meshStandardMaterial 
                color={controls.indicateRight && blink ? "#FFAA00" : "#333"} 
                emissive={controls.indicateRight && blink ? "#FFAA00" : "#000"}
                emissiveIntensity={2}
            />
        </mesh>
    </group>
  );
};
