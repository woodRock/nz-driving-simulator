import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Intersection } from '../components/world/Intersection';
import { Car } from '../components/vehicle/Car';
import { AICar } from '../components/vehicle/AICar';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const CenterLineGiveWayScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const aiCarRef = useRef<THREE.Group>(null);

  // Grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  
  useEffect(() => {
    setMessage('Scenario: Center Line Rule. The main road curves LEFT. You are going STRAIGHT (leaving the center line). Give way to traffic following the center line.');
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
    const { position } = telemetry;

    let aiDist = 100;
    if (aiCarRef.current) {
        aiDist = aiCarRef.current.position.distanceTo(new THREE.Vector3(0, 0, 0));
    }
    
    // Player entering intersection check
    if (position.z < 8 && position.z > -8) {
        if (aiDist < 12) {
             failLevel('You failed to give way to the vehicle following the center line!');
             finishedRef.current = true;
             setFinished(true);
        }
    }

    // Success: Reached Straight Branch (Z < -20)
    if (position.z < -20) {
        passLevel();
        finishedRef.current = true;
        setFinished(true);
    }
  });

  // Curve Geometry for Center Line
  const curve = useMemo(() => {
      // Rotation 0.5 rad: sin(0.5)=0.479, cos(0.5)=0.877
      // Road entry at dist 5: x = -5 * 0.479 = -2.395, z = -5 * 0.877 = -4.385
      return new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0.02, 5), // South road boundary
          new THREE.Vector3(0, 0.02, 2), 
          new THREE.Vector3(-1, 0.02, -2), 
          new THREE.Vector3(-2.4, 0.02, -4.4) // Left road boundary (approx)
      ]);
  }, []);

  // AI Path (Following Main Road: NW -> S)
  const aiPath = useMemo(() => {
      return [
          new THREE.Vector3(-19.2, 0.2, -35.1), // Far NW on rotated road
          new THREE.Vector3(-2.4, 0.2, -4.4),   // Entry to intersection
          new THREE.Vector3(0, 0.2, 0),         // Center
          new THREE.Vector3(0, 0.2, 40)         // Exit South
      ];
  }, []);

  return (
    <group>
      <mesh position={[0, -0.6, 0]} receiveShadow>
            <boxGeometry args={[200, 1, 200]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      {/* Intersection Tile */}
      <Intersection position={[0, 0, 0]} />

      {/* Visual Center Line (Yellow) */}
      <mesh position={[0, 0.05, 0]}>
          <tubeGeometry args={[curve, 20, 0.08, 8, false]} />
          <meshStandardMaterial color="#FFD700" />
      </mesh>

      {/* Roads */}
      {/* 1. Player Start (South) */}
      <StraightRoad position={[0, 0, 15]} length={20} />
      
      {/* 2. Side Road (North) - Straight */}
      <StraightRoad position={[0, 0, -15]} length={20} />
      
      {/* 3. Main Road (Soft Left) */}
      {/* Angle approx 30 deg (0.5 rad) */}
      <group position={[0, 0, 0]} rotation={[0, 0.5, 0]}>
          <StraightRoad position={[0, 0, -15]} length={20} />
      </group>

      {/* AI Car */}
      <AICar 
        ref={aiCarRef}
        pathPoints={aiPath} 
        speed={12} 
        delay={0}
        color="blue"
        indicatingRight={false}
      />

      {/* Player Car */}
      <Car position={[-2.5, 1, 20]} />
    </group>
  );
};
