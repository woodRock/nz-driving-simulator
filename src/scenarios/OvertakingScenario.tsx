import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';
import { AICar } from '../components/vehicle/AICar'; 
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const OvertakingScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  // Grass background
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  const grassSize = new THREE.Vector3(100, 1, 200); 
  const grassPosition = new THREE.Vector3(0, -0.6, -50); 

  useEffect(() => {
    setMessage('Scenario: No Overtaking. Follow the slow vehicle. Do NOT overtake on a solid yellow line. Wait for the passing lane (dashed lines).');
  }, [setMessage]);

  useEffect(() => {
    const grassPhysicsObject: PhysicsObject = {
        id: grassPhysicsObjectId,
        position: grassPosition,
        quaternion: new THREE.Quaternion(),
        size: grassSize,
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
    const x = position.x;
    const z = position.z;

    // --- LOGIC ---

    // 1. Solid Yellow Line Rule (from start down to z=-40)
    // The solid road segment ends at z=-40. After that, it's dashed.
    // We check if the player crosses the line while in the solid zone.
    if (z > -40 && z < 35) { // In the solid line zone
        if (x > 0.2) { // Crossed the center line
            failLevel('You crossed a solid yellow line!');
            finishedRef.current = true;
            setFinished(true);
            return;
        }
    }

    // 2. Success Condition
    // Passed the solid line zone (z < -70) AND overtook the car?
    // Or just survived long enough? 
    // Let's make the goal to overtake AFTER the line breaks.
    // The dashed road starts at z = -80 (center) -> covering -70 to -90... wait.
    
    // Road 1 (Solid): 0,0,0 length 80. Extends from z=40 to z=-40. 
    // Let's adjust positions to make it intuitive.
    // Player starts at z=35. 
    // Solid Road: pos=[0,0,0], len=80 (z: 40 to -40).
    // Dashed Road: pos=[0,0,-80], len=80 (z: -40 to -120).
    
    // So Solid Zone is z > -40.
    // Dashed Zone is z < -40.
    
    if (x > 0.2 && z > -40) {
         failLevel('Do not overtake on a solid yellow line!');
         finishedRef.current = true;
         setFinished(true);
         return;
    }

    // Success: Player has overtaken the slow car (which is moving) AND is in the dashed zone.
    // But safely. 
    // Simply passing the level if they reach z < -100 without failing.
    if (z < -110) {
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    }
  });

  return (
    <group>
      {/* Grass */}
      <mesh position={grassPosition} receiveShadow>
            <boxGeometry args={[100, 1, 200]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Roads */}
      {/* Section 1: Solid Yellow Line. Centered at 0, extends +/- 40 */}
      <StraightRoad position={[0, 0, 0]} length={80} centerLine="solid-yellow" />
      
      {/* Section 2: Dashed Line. Starts at -40. Center at -80 (extends -40 to -120) */}
      <StraightRoad position={[0, 0, -80]} length={80} centerLine="dashed" />

      {/* Slow Vehicle */}
      {/* Starts ahead of player. Player at z=35. Slow car at z=20? */}
      <AICar 
        startPos={[-2.5, 0.2, 20]} 
        endPos={[-2.5, 0.2, -150]} 
        speed={8} // Very slow
        delay={0} 
        color="orange" // "Tractor" color
        rotation={[0, Math.PI, 0]} // Moving towards -z
      />

      {/* Player Car */}
      <Car position={[-2.5, 1, 35]} />
    </group>
  );
};
