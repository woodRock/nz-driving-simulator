import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Ambulance } from '../components/vehicle/Ambulance';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const EmergencyVehicleScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const ambulanceRef = useRef<THREE.Group>(null);

  // Grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  
  useEffect(() => {
    setMessage('Scenario: Emergency Vehicle. An ambulance is approaching from behind! Pull over to the LEFT shoulder and STOP.');
  }, [setMessage]);

  useEffect(() => {
    const grassPhysicsObject: PhysicsObject = {
        id: grassPhysicsObjectId,
        position: new THREE.Vector3(0, -0.6, 0),
        quaternion: new THREE.Quaternion(),
        size: new THREE.Vector3(100, 1, 400),
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

    const { position, speed } = telemetry;
    const playerZ = position.z;
    const playerX = position.x;

    let ambulanceZ = 1000;
    if (ambulanceRef.current) {
        ambulanceZ = ambulanceRef.current.position.z;
    }

    // Fail Condition 1: Ambulance catches up (Z close) and Player is NOT safely on shoulder
    // Player safe if x < -3.5 (Left shoulder). Road is width 10 (-5 to 5). Lane center -2.5.
    // Ambulance width ~2.5. If player is > -3.5, they might obstruct.
    // Catch up zone: Ambulance is within 10m behind player.
    // Ambulance starts at 40. Player at 0. Both moving -Z.
    // AmbulanceZ < PlayerZ + 8 (caught up).
    
    if (ambulanceZ < playerZ + 8 && ambulanceZ > playerZ - 10) { // Ambulance is passing or close behind
        if (playerX > -3.5) {
             failLevel('You failed to pull over for the emergency vehicle!');
             finishedRef.current = true;
             setFinished(true);
             return;
        }
        
        // Fail Condition 2: Not stopped (or very slow)
        // Allow crawling speed < 2 km/h (~0.5 m/s)
        if (Math.abs(speed) > 1.0) {
             failLevel('You must STOP for the emergency vehicle!');
             finishedRef.current = true;
             setFinished(true);
             return;
        }
    }

    // Success Condition: Ambulance has passed securely
    // Ambulance Z < Player Z - 15 (Passed and gone ahead)
    if (ambulanceZ < playerZ - 20) {
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    }
  });

  return (
    <group>
      {/* Grass */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
            <boxGeometry args={[100, 1, 400]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Roads */}
      <StraightRoad position={[0, 0, 50]} length={100} />
      <StraightRoad position={[0, 0, -50]} length={100} />

      {/* Ambulance */}
      {/* Starts behind (z=40), moves faster than player. Speed 25. */}
      <Ambulance 
        ref={ambulanceRef} 
        position={[0, 0, 80]} 
        speed={25} 
      />

      {/* Player Car */}
      {/* Starts at 0. Should be moving initially? Or stopped? */}
      {/* If driving along, maybe speed 15. */}
      {/* We can't force player speed easily without auto-drive, but player drives themselves. */}
      <Car position={[-2.5, 1, 0]} />
    </group>
  );
};