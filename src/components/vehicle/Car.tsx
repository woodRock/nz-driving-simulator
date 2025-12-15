import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useControls } from '../../hooks/useControls';
import { useGameStore } from '../../store/gameStore';
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem'; // Import PhysicsSystem

interface CarProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const Car: React.FC<CarProps> = ({ position = [0, 1, 0], rotation: initialRotation = [0, 0, 0] }) => {
  const carRef = useRef<THREE.Group>(null); // Now refers to a THREE.Group
  const frontLeftWheelRef = useRef<THREE.Group>(null);
  const frontRightWheelRef = useRef<THREE.Group>(null);
  const carQuaternionRef = useRef(new THREE.Quaternion().setFromEuler(new THREE.Euler(...initialRotation))); // Managed quaternion for car's actual orientation
  const controls = useControls();
  const { camera } = useThree();
  const { updateTelemetry, failLevel } = useGameStore();
  
  // Internal state for custom physics
  const linearVelocity = useRef(new THREE.Vector3(0, 0, 0));
  const currentSteeringAngle = useRef(0);
  
  // Indicator blinking state
  const [blink, setBlink] = useState(false);

  // Unique ID for physics system registration
  const physicsObjectId = useRef(`playerCar_${Math.random().toFixed(5)}`);

  // Car dimensions for AABB collision
  const carSize = new THREE.Vector3(2, 1, 4); // Based on main car body boxGeometry args

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink((b) => !b);
    }, 400); // Blink every 400ms
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!carRef.current) return;

    // Register car with PhysicsSystem
    const carPhysicsObject: PhysicsObject = {
        id: physicsObjectId.current,
        position: carRef.current.position,
        quaternion: carQuaternionRef.current, // Use the managed quaternion ref
        size: carSize,
        type: 'playerCar',
        onCollide: (other: PhysicsObject) => {
            if (other.type === 'roadBoundary') { // Custom type for road boundaries
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

    // Cleanup: unregister on unmount
    return () => {
        PhysicsSystem.unregisterObject(physicsObjectId.current);
    };
  }, [failLevel]); // Depend on failLevel to ensure onCollide has latest ref

        useFrame((_, delta) => {

          if (!carRef.current) return;

          const { forward, backward, left, right, brake, indicateLeft, indicateRight } = controls;

          // Car settings
          const acceleration = 30; // Force applied per second
          const maxSpeed = 25; // Max forward speed
          const maxReverseSpeed = -10; // Max reverse speed
          const brakingDeceleration = 50; // Deceleration when braking
          const frictionDeceleration = 10; // Deceleration due to friction when no input
          
          const maxSteeringAngle = Math.PI / 6; // Max front wheel angle (30 degrees)
          const steeringSpeed = 1.5 * delta; // How fast steering angle changes
          const wheelbase = 3.0; // Approximate wheelbase of the car (distance between front and rear axles)
          const wheelTurnVisualFactor = 1.0; // Factor to visually turn wheels (1: matches steering angle)

          // Initial calculation of currentSpeed (needs to be early)
          let currentSpeed = linearVelocity.current.length() * Math.sign(linearVelocity.current.dot(new THREE.Vector3(0,0,-1).applyQuaternion(carQuaternionRef.current)));


          // --- STEERING (Front Wheel Angle) ---
          if (left) {
              currentSteeringAngle.current += steeringSpeed;
          } else if (right) {
              currentSteeringAngle.current -= steeringSpeed;
          } else {
              // Return to center
              if (Math.abs(currentSteeringAngle.current) > 0.01) {
                  currentSteeringAngle.current -= Math.sign(currentSteeringAngle.current) * steeringSpeed * 2; // Return faster
              } else {
                  currentSteeringAngle.current = 0;
              }
          }
          currentSteeringAngle.current = Math.max(-maxSteeringAngle, Math.min(maxSteeringAngle, currentSteeringAngle.current));

          // --- ANGULAR MOVEMENT (Car Body Rotation - Ackerman Steering) ---
          // Use Math.abs(currentSpeed) as the speed magnitude for turning threshold
          if (Math.abs(currentSpeed) > 0.5) { 
              // Simplified Ackerman formula for angular velocity (yaw rate)
              // yawRate = (speed * tan(steeringAngle)) / wheelbase
              const turnRadius = wheelbase / Math.tan(currentSteeringAngle.current);
              const rotationAmount = (currentSpeed / turnRadius) * delta; // Use currentSpeed here
              
              // Apply rotation
              const rotationQuaternionDelta = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationAmount);
              carQuaternionRef.current.multiply(rotationQuaternionDelta);
              carRef.current.quaternion.copy(carQuaternionRef.current); // Explicitly copy to the group's quaternion
          }

      

      

                    

      

      

                                                            // --- LINEAR MOVEMENT ---

      

      

                    

      

      

                                    

      

      

                    

      

      

                                                            // Now, carRef.current.quaternion is updated, so forwardVector will be correct

      

      

                    

      

      

                                                            currentSpeed = linearVelocity.current.length() * Math.sign(linearVelocity.current.dot(new THREE.Vector3(0,0,-1).applyQuaternion(carQuaternionRef.current)));

      

      

                    

      

      

                              if (forward) {

      

      

                                  currentSpeed += acceleration * delta;

      

      

                              } else if (backward) {

      

      

                                  currentSpeed -= acceleration * delta;

      

      

                              }

      

      

                    

      

      

                              if (brake) {

      

      

                                  currentSpeed -= brakingDeceleration * delta;

      

      

                              }

      

      

                    

      

      

                              // Apply friction if no acceleration/braking

      

      

                              if (!forward && !backward && !brake) {

      

      

                                  if (Math.abs(currentSpeed) > frictionDeceleration * delta) {

      

      

                                      currentSpeed -= Math.sign(currentSpeed) * frictionDeceleration * delta;

      

      

                                  } else {

      

      

                                      currentSpeed = 0;

      

      

                                  }

      

      

                              }

      

      

                    

      

      

                              // Clamp speed

      

      

                              currentSpeed = Math.max(maxReverseSpeed, Math.min(maxSpeed, currentSpeed));

      

      

                    

      

      

                              // Update linear velocity direction based on car's current forward orientation

      

      

                              const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(carQuaternionRef.current);

      

      

                              linearVelocity.current.copy(forwardVector).multiplyScalar(currentSpeed);

      

      

          // --- APPLY POSITION UPDATE ---

          carRef.current.position.add(linearVelocity.current.clone().multiplyScalar(delta));

      

          // --- VISUAL WHEEL ROTATION ---

          if (frontLeftWheelRef.current && frontRightWheelRef.current) {

              frontLeftWheelRef.current.rotation.y = currentSteeringAngle.current * wheelTurnVisualFactor;

              frontRightWheelRef.current.rotation.y = currentSteeringAngle.current * wheelTurnVisualFactor;

          }

      

          // Update Telemetry

          updateTelemetry({

              speed: linearVelocity.current.length(), // Approx speed

              position: { x: carRef.current.position.x, y: carRef.current.position.y, z: carRef.current.position.z },

              indicators: { left: indicateLeft, right: indicateRight }

          });

      

          // Manually update the PhysicsSystem object's position and quaternion (redundant if references are live)

          const physicsObject = PhysicsSystem.getObject(physicsObjectId.current);

          if (physicsObject) {

              physicsObject.position.copy(carRef.current.position);

              // physicsObject.quaternion.copy(carQuaternionRef.current); // No need to copy, it's already a reference
          }

      

          // Camera Follow

          const carQuaternionForCamera = carQuaternionRef.current; // Use the managed quaternion

          const cameraOffset = new THREE.Vector3(0, 5, 8).applyQuaternion(carQuaternionForCamera);

          const targetPos = carRef.current.position.clone().add(cameraOffset);

          camera.position.lerp(targetPos, 0.1);

          camera.lookAt(carRef.current.position);

        });
  
    // Convert initialRotation to a Quaternion once (This should be before return)
    const initialQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...initialRotation));
  
    return (
    <group 
      ref={carRef}
      position={position}
      userData={{ type: 'playerCar' }} // Custom user data for identification
    >
        {/* Car Body */}
        <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[2, 1, 4]} />
            <meshStandardMaterial color="#2196F3" />
        </mesh>

        {/* Wheels */}
        <group>
            {/* Rear Left */}
            <mesh position={[-1.1, 0.25, 1.2]} rotation={[0, 0, Math.PI / 2]}> 
                <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                <meshStandardMaterial color="black" />
            </mesh>
            {/* Rear Right */}
            <mesh position={[1.1, 0.25, 1.2]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                <meshStandardMaterial color="black" />
            </mesh>
            {/* Front Left */}
            <group ref={frontLeftWheelRef} position={[-1.1, 0.25, -1.2]}>
                <mesh rotation={[0, 0, Math.PI / 2]}> 
                    <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                    <meshStandardMaterial color="black" />
                </mesh>
            </group>
            {/* Front Right */}
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
    </group>
  );
};