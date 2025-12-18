import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Sheep } from '../components/vehicle/Sheep';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const LivestockScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  
  const [cleared, setCleared] = useState(false);
  const stopTimer = useRef(0);
  const [sheepPositions, setSheepPositions] = useState<[number, number, number][]>([
      [-1, 0, 0], [1, 0, 2], [0, 0, -2], [-2, 0, 4], [2, 0, -3] // Blocking center
  ]);
  const targetPositions: [number, number, number][] = [
      [-6, 0, 0], [6, 0, 2], [-7, 0, -2], [-6, 0, 4], [7, 0, -3] // On grass
  ];

  const [sheepRotations, setSheepRotations] = useState<[number, number, number][]>([
      [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]
  ]);

  // Grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  
  useEffect(() => {
    setMessage('Scenario: Livestock. Sheep on the road! STOP and wait for them to clear.');
  }, [setMessage]);

  useEffect(() => {
    const grassPhysicsObject: PhysicsObject = {
        id: grassPhysicsObjectId,
        position: new THREE.Vector3(0, -0.6, 0),
        quaternion: new THREE.Quaternion(),
        size: new THREE.Vector3(100, 1, 300),
        type: 'grass',
        onCollide: () => {}
    };
    PhysicsSystem.registerObject(grassPhysicsObject);
    return () => {
        PhysicsSystem.unregisterObject(grassPhysicsObjectId);
    };
  }, []);

  useFrame((_, delta) => {
    if (finished || finishedRef.current) return;

    const telemetry = useGameStore.getState().telemetry;
    if (!telemetry || !telemetry.position) return;

    const { position, speed } = telemetry;
    const z = position.z;

    // Check stop condition
    if (!cleared) {
        // Player must be close (Z < 30) but safe (Z > 10).
        if (z < 30 && z > 5) {
            if (Math.abs(speed) < 0.5) {
                stopTimer.current += delta;
                if (stopTimer.current > 2.0) {
                    setCleared(true);
                    setMessage('The sheep are moving... Wait a moment.');
                }
            } else {
                stopTimer.current = 0;
            }
        }
    }

    // Animate sheep if cleared
    if (cleared) {
        const moveSpeed = 2.0 * delta;
        const rotSpeed = 5.0 * delta;
        
        // Update positions and rotations
        // We need to update state, but doing it inside useFrame with setState might be jittery if not careful.
        // However, for this simple anim it's fine. 
        // Better to calculate new values and set them once.
        
        let newPositions: [number, number, number][] = [];
        let newRotations: [number, number, number][] = [];
        let anyMoving = false;

        for (let i = 0; i < sheepPositions.length; i++) {
            const currentPos = new THREE.Vector3(...sheepPositions[i]);
            const targetPos = new THREE.Vector3(...targetPositions[i]);
            const currentRotY = sheepRotations[i][1];
            
            let nextPos = currentPos.clone();
            let nextRotY = currentRotY;

            const dist = currentPos.distanceTo(targetPos);
            
            if (dist > 0.1) {
                anyMoving = true;
                // Calculate target angle
                // atan2(dx, dz) gives angle from Z axis? 
                // In ThreeJS: Z is forward (usually). 
                // Let's use lookAt logic manually or atan2.
                // dx = target.x - current.x
                // dz = target.z - current.z
                // Angle = atan2(dx, dz). 
                const dx = targetPos.x - currentPos.x;
                const dz = targetPos.z - currentPos.z;
                const targetAngle = Math.atan2(dx, dz);
                
                // Smoothly rotate towards targetAngle
                // Shortest path interpolation
                let diff = targetAngle - currentRotY;
                // Normalize to -PI...PI
                while (diff > Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;
                
                if (Math.abs(diff) > 0.05) {
                    nextRotY += diff * rotSpeed;
                } else {
                    nextRotY = targetAngle;
                    // Only move if facing roughly the right way
                    nextPos.lerp(targetPos, moveSpeed);
                }
            }
            
            newPositions.push([nextPos.x, nextPos.y, nextPos.z]);
            newRotations.push([0, nextRotY, 0]);
        }
        
        if (anyMoving) {
            setSheepPositions(newPositions);
            setSheepRotations(newRotations);
        }
    }

    // Fail: Collision handled by Physics (Car hits 'pedestrian' type -> Fail).
    // But we should also fail if they drive through before clearing (if they dodge collisions).
    // If Z < -5 and !cleared -> Fail? 
    // If they manage to dodge them, maybe it's "unsafe"?
    // Let's stick to collision = fail. But also speed check?
    // If z < 0 and !cleared, fail.
    if (z < 0 && !cleared) {
         failLevel('You tried to drive through the flock!');
         finishedRef.current = true;
         setFinished(true);
    }

    // Success
    if (z < -30) {
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    }
  });

  return (
    <group>
      {/* Grass */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
            <boxGeometry args={[100, 1, 300]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Roads */}
      <StraightRoad position={[0, 0, 50]} length={100} />
      <StraightRoad position={[0, 0, -50]} length={100} />

      {/* Sheep */}
      {sheepPositions.map((pos, i) => (
          <Sheep key={i} position={pos} rotation={sheepRotations[i]} />
      ))}

      {/* Player Car */}
      <Car position={[-2.5, 1, 50]} />
    </group>
  );
};
