import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { RoadCone } from '../components/world/RoadCone';
import { SpeedLimitSign } from '../components/world/SpeedLimitSign';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const RoadWorksScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  // Grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  
  useEffect(() => {
    setMessage('Scenario: Road Works. Temporary Speed Limit 30km/h. Slow down BEFORE the cones.');
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

    const { position, speed } = telemetry;
    const z = position.z;
    
    // Zone starts at Z=10 (cones start). Limit applies.
    // Ends at Z=-80.
    // Speed limit 30 km/h = 8.33 m/s.
    // Tolerance: 35 km/h = 9.7 m/s.
    
    if (z < 10 && z > -80) {
        if (Math.abs(speed) > 20) {
             failLevel(`Speeding in Road Works! You were doing ${(Math.abs(speed)*3.6).toFixed(1)} km/h. Limit is 30.`);
             finishedRef.current = true;
             setFinished(true);
             return;
        }
    }

    // Success
    if (z < -90) {
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    }
  });

  // Generate cones
  const cones = [];
  // Taper
  for (let i = 0; i <= 10; i++) {
      const alpha = i / 10;
      const x = THREE.MathUtils.lerp(-5, -0.5, alpha); // From edge to center
      const z = THREE.MathUtils.lerp(20, 0, alpha);
      cones.push(<RoadCone key={`taper_${i}`} position={[x, 0, z]} />);
  }
  // Straight line down center
  for (let i = 0; i < 20; i++) {
      const z = -4 - (i * 4); // Spaced every 4m
      cones.push(<RoadCone key={`line_${i}`} position={[-0.5, 0, z]} />);
  }

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

      {/* Signs */}
      <SpeedLimitSign position={[-5.5, 0, 25]} limit={30} rotation={[0, 0, 0]} />
      <SpeedLimitSign position={[5.5, 0, 25]} limit={30} rotation={[0, Math.PI, 0]} />

      {/* Cones */}
      {cones}

      {/* Player Car */}
      <Car position={[-2.5, 1, 50]} />
    </group>
  );
};