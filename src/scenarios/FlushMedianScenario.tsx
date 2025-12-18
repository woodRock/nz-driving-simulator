import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FlushMedianRoad } from '../components/world/FlushMedianRoad';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';
import { AICar } from '../components/vehicle/AICar';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const FlushMedianScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  // Grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  
  useEffect(() => {
    setMessage('Scenario: Flush Median. Use the white diagonal striped area to wait for a gap, then turn RIGHT.');
  }, [setMessage]);

  useEffect(() => {
    const grassPhysicsObject: PhysicsObject = {
        id: grassPhysicsObjectId,
        position: new THREE.Vector3(0, -0.6, 0),
        quaternion: new THREE.Quaternion(),
        size: new THREE.Vector3(200, 1, 200),
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

    // Success: Reached the side street
    // Side street is at X > 10, Z around 0 (+/- 5).
    if (position.x > 15) {
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    }
    
    // Fail: Drove past the turn (Z < -20)
    if (position.z < -20 && position.x < 5) { // Still on main road
         failLevel('You missed the turn!');
         finishedRef.current = true;
         setFinished(true);
    }
  });

  return (
    <group>
      {/* Grass */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
            <boxGeometry args={[200, 1, 200]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Main Road with Median */}
      <FlushMedianRoad position={[0, 0, 0]} length={80} />

      {/* Side Road (Right) */}
      {/* Width 10. Center at X=12 (7 + 5). Z=0. Rotation 90. */}
      <StraightRoad position={[12, 0, 0]} rotation={[0, -Math.PI / 2, 0]} length={20} />

      {/* Oncoming Traffic (Left lane relative to them, Right relative to player) */}
      {/* FlushMedian width 14. Center 0.
          Left lane (Player): X approx -4.5.
          Right lane (Oncoming): X approx 4.5.
      */}
      {/* Convoy causing block */}
      <AICar startPos={[4.5, 0.2, -40]} endPos={[4.5, 0.2, 50]} speed={12} delay={0} color="blue" rotation={[0, Math.PI, 0]} />
      <AICar startPos={[4.5, 0.2, -55]} endPos={[4.5, 0.2, 50]} speed={12} delay={1.2} color="green" rotation={[0, Math.PI, 0]} />
      <AICar startPos={[4.5, 0.2, -70]} endPos={[4.5, 0.2, 50]} speed={12} delay={2.4} color="grey" rotation={[0, Math.PI, 0]} />
      
      {/* Gap here */}
      
      <AICar startPos={[4.5, 0.2, -150]} endPos={[4.5, 0.2, 50]} speed={12} delay={0} color="red" rotation={[0, Math.PI, 0]} />

      {/* Player Car */}
      {/* Starts in left lane (X = -4.5) */}
      <Car position={[-4.5, 1, 40]} />
    </group>
  );
};
