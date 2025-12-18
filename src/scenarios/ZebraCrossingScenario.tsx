import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { ZebraCrossing } from '../components/world/ZebraCrossing';
import { Pedestrian } from '../components/vehicle/Pedestrian';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const ZebraCrossingScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const pedestrianRef = useRef<THREE.Group>(null);
  const [pedestrianActive, setPedestrianActive] = useState(false);

  // Grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  
  useEffect(() => {
    setMessage('Scenario: Zebra Crossing. Give way to pedestrians waiting to cross.');
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

  useFrame(() => {
    if (finished || finishedRef.current) return;

    const telemetry = useGameStore.getState().telemetry;
    if (!telemetry || !telemetry.position) return;

    const { position } = telemetry;
    const playerZ = position.z;

    // Trigger pedestrian when player is close enough to see them waiting
    if (playerZ < 35 && !pedestrianActive) {
        setPedestrianActive(true);
    }

    // Pedestrian Logic Check
    let pedX = -100;
    if (pedestrianRef.current) {
        pedX = pedestrianRef.current.position.x;
    }

    // Fail Condition: Driving over crossing while pedestrian is on it
    // Crossing is at Z=0, width approx 6m (Z -3 to 3).
    // Pedestrian is on road if X > -5 and X < 5.
    if (playerZ < 4 && playerZ > -4) {
        // Player is ON the crossing
        if (pedX > -5 && pedX < 5) {
            failLevel('You failed to give way to the pedestrian!');
            finishedRef.current = true;
            setFinished(true);
            return;
        }
    }

    // Success: Player passes safely
    if (playerZ < -20) {
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
      {/* Crossing at 0 */}
      <ZebraCrossing position={[0, 0, 0]} />
      <StraightRoad position={[0, 0, -50]} length={100} />

      {/* Pedestrian */}
      {/* Starts on left (-6), walks to right (6) */}
      <Pedestrian 
        ref={pedestrianRef}
        startPos={[-6, 0.2, 0]} 
        endPos={[6, 0.2, 0]} 
        speed={2.0} // Walking speed
        active={pedestrianActive}
      />

      {/* Player Car */}
      <Car position={[-2.5, 1, 50]} />
    </group>
  );
};
