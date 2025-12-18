import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useControls } from '../../hooks/useControls';
import { useGameStore } from '../../store/gameStore';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem';
import { TerrainSystem } from '../../systems/TerrainSystem';
import { RoadSystem } from '../../systems/RoadSystem';

interface CarProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  maxSpeed?: number;
  acceleration?: number;
}

export const Car: React.FC<CarProps> = ({ 
  position = [0, 1, 0], 
  rotation: initialRotation = [0, 0, 0],
  maxSpeed: propsMaxSpeed = 35,
  acceleration: propsAcceleration = 30
}) => {
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
  const [isInitializing, setIsInitializing] = useState(true); // New state for initialization flag
  const [physicsObjectId] = useState(() => `playerCar_${Math.random().toFixed(5)}`);
  const carSize = new THREE.Vector3(2, 1, 4); 

  useEffect(() => {
    const interval = setInterval(() => setBlink((b) => !b), 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 2000); // 2 seconds delay to allow car to settle

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!carRef.current) return;

    const carPhysicsObject: PhysicsObject = {
        id: physicsObjectId,
        position: carRef.current.position,
        quaternion: carQuaternionRef.current,
        size: carSize,
        type: 'playerCar',
        onCollide: (other: PhysicsObject) => {
            if (levelStatus !== 'playing') return; // Don't fail twice
            if (isInitializing) return; // Ignore collisions during initialization

            if (other.type === 'roadBoundary' && useGameStore.getState().currentScenario !== "wellington") {
                failLevel(`You drove off the road!`);
            }
            else if (other.type === 'aiCar' || other.type === 'stationaryAICar') {
                failLevel('You crashed into another car!');
            }
            else if (other.type === 'pedestrian') {
                failLevel('You hit a pedestrian! major fail.');
            }
            else if (other.type === 'cyclist') {
                failLevel('You hit a cyclist! major fail.');
            }
        }
    };
    PhysicsSystem.registerObject(carPhysicsObject);

    return () => {
        PhysicsSystem.unregisterObject(physicsObjectId);
    };
  }, [failLevel, levelStatus, isInitializing]);

  useFrame((_, delta) => {
      if (!carRef.current) return;
      if (levelStatus !== 'playing') return; // Stop processing physics if failed/paused

      // Clamp delta to prevent physics explosions during lag spikes
      const dt = Math.min(delta, 0.1);

      const { forward, backward, left, right, brake, indicateLeft, indicateRight } = controls;

      // Car physics constants
      const acceleration = propsAcceleration;
      const maxSpeed = propsMaxSpeed; 
      const maxReverseSpeed = -10;
      const brakingDeceleration = 50;
      const frictionDeceleration = 10;
      const maxSteeringAngle = Math.PI / 6; 
      const steeringSpeed = 2.0 * dt; 
      const wheelbase = 3.0; 
      const wheelTurnVisualFactor = 1.0; 

      // Calc current speed relative to car forward direction
      const forwardDir = new THREE.Vector3(0,0,-1).applyQuaternion(carQuaternionRef.current).normalize();
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
          currentSpeed += acceleration * dt;
      } else if (backward) {
          currentSpeed -= acceleration * dt;
      }

      if (brake) {
          if (currentSpeed > 0) currentSpeed -= brakingDeceleration * dt;
          else if (currentSpeed < 0) currentSpeed += brakingDeceleration * dt;
          if (Math.abs(currentSpeed) < 1) currentSpeed = 0; // Full stop
      }

      // Friction
      if (!forward && !backward && !brake) {
          if (Math.abs(currentSpeed) > frictionDeceleration * dt) {
              currentSpeed -= Math.sign(currentSpeed) * frictionDeceleration * dt;
          } else {
              currentSpeed = 0;
          }
      }

      currentSpeed = Math.max(maxReverseSpeed, Math.min(maxSpeed, currentSpeed));

      // --- TURNING (Ackermann) ---
      if (Math.abs(currentSpeed) > 0.1) {
          // angular velocity = v / r
          // r = wheelbase / tan(steeringAngle)
          // rotationAmount = (v * tan(steeringAngle) / wheelbase) * dt
          const rotationAmount = (currentSpeed * Math.tan(currentSteeringAngle.current) * dt) / wheelbase;
          
          if (Math.abs(rotationAmount) > 0.0001) {
            const rotQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationAmount);
            carQuaternionRef.current.multiply(rotQuat);
            carQuaternionRef.current.normalize(); // Crucial: prevent drift and scale issues
            carRef.current.quaternion.copy(carQuaternionRef.current);
          }
      }

      // Apply Velocity
      // Recalculate forward vector based on new rotation
      const newForward = new THREE.Vector3(0, 0, -1).applyQuaternion(carQuaternionRef.current).normalize();
      linearVelocity.current.copy(newForward).multiplyScalar(currentSpeed);
      
      const newPos = carRef.current.position.clone().add(linearVelocity.current.clone().multiplyScalar(dt));

      // Terrain Following
      const terrainHeight = TerrainSystem.getHeight(newPos.x, newPos.z);
      let targetHeight;
      const currentCarY = carRef.current.position.y;
      
      if (terrainHeight !== null) {
          // Check road proximity for layer snapping
          const distToRoad = RoadSystem.getDistanceToRoad(newPos.x, newPos.z);
          
          let offset = 0.25; // Default (off-road)
          
          if (distToRoad < 6.0) {
              offset = 0.40; // On road
          } else if (distToRoad < 8.0) {
              // Smooth ramp
              const t = (distToRoad - 6.0) / 2.0; // 0..1
              offset = 0.40 * (1 - t) + 0.25 * t;
          }

          targetHeight = terrainHeight + offset;
      } else {
          // If no terrain data, gradually fall towards 0, but don't go below it.
          // This prevents hovering at an arbitrary Y and then snapping when data loads.
          targetHeight = Math.max(0, currentCarY - (5 * dt)); // Fall speed of 5 units/sec
      }

      // Smoothly interpolate Y
      const yLerpFactor = Math.min(1.0, 5.0 * dt); // Reduced from 10.0 * dt for smoother transitions
      
      // Only apply lerp if the difference is significant to reduce jittering
      const heightDifference = Math.abs(currentCarY - targetHeight);
      if (heightDifference > 0.01) { // Threshold of 1cm
          newPos.y = THREE.MathUtils.lerp(currentCarY, targetHeight, yLerpFactor);
      } else {
          newPos.y = currentCarY; // Don't update if difference is too small
      }

      // Hard floor only if we have terrain data to respect
      if (terrainHeight !== null && newPos.y < terrainHeight + 0.2) {
          newPos.y = terrainHeight + 0.2;
      }

      carRef.current.position.copy(newPos);

      // --- Centralized Off-Road Check (Once per frame) ---
      if (levelStatus === 'playing' && !isInitializing) {
          const currentScenarioId = useGameStore.getState().currentScenario;

          if (currentScenarioId !== 'wellington') { 
              const distToRoad = RoadSystem.getDistanceToRoad(carRef.current.position.x, carRef.current.position.z);
              const offRoadThreshold = 5.5; // Half road width (5) + small buffer
              const carBottomY = carRef.current.position.y - (carSize.y / 2); 
              const groundLevelThreshold = 0.5; // If car bottom is significantly above this, it's still descending

              if (distToRoad > offRoadThreshold && carBottomY + 5 < groundLevelThreshold) { 
                  failLevel('You drove off the road!');
              }
          }
      }

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
      const physicsObject = PhysicsSystem.getObject(physicsObjectId);
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