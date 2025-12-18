import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Roundabout } from '../components/world/Roundabout';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';
import { AICar } from '../components/vehicle/AICar';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { PhysicsSystem, type PhysicsObject } from '../physics/PhysicsSystem';

export const RoundaboutGiveWayScenario: React.FC = () => {
  const { setMessage, passLevel, failLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const [passedFirstExit, setPassedFirstExit] = useState(false);

  // Grass
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  
  useEffect(() => {
    setMessage('Scenario: Roundabout Give Way. Proceed STRAIGHT. Give way to traffic from your right. Signal left AFTER passing the first exit.');
  }, [setMessage]);

  useEffect(() => {
    const grassPhysicsObject: PhysicsObject = {
        id: grassPhysicsObjectId,
        position: new THREE.Vector3(0, -0.6, -20),
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

  // Generate path points for AI Cars (circling from Right/East to Left/West)
  // Roundabout center: [0, 0, -20]
  // Lane radius ~ 8m.
  // Start: East entrance (X=20, Z=-22.5). Enter circle.
  // Circle segment: From angle 0 (East) to PI (West).
  // Exit: West road.
  
  const aiPath = useMemo(() => {
      const points: THREE.Vector3[] = [];
      const center = new THREE.Vector3(0, 0.2, -20);
      const radius = 8;
      
      // Approach from East
      points.push(new THREE.Vector3(30, 0.2, -22.5));
      points.push(new THREE.Vector3(15, 0.2, -22.5)); // Entrance
      
      // Arc (Clockwise in visual, which is negative angle change in 3D usually? Wait.)
      // 0 is East (X+). PI/2 is South (Z+). PI is West (X-).
      // We want to go East -> South -> West.
      // Angles: 0 -> PI/2 -> PI.
      // Points: x = r*cos(a), z = r*sin(a)
      // Wait, 0 is usually X+.
      // We want to start near X+ and go "clockwise" from top down?
      // NZ Roundabouts are Clockwise.
      // So entering from East (Right), you go North -> West -> South.
      // Wait. If you enter from East (3 o'clock), you go 12 -> 9 -> 6.
      // No. East is 3. South is 6.
      // Clockwise: 3 -> 6 -> 9 -> 12.
      // So East entrance -> South (passes player) -> West.
      // This means AI crosses the player's path.
      
      // Angles: 0 (East) -> PI/2 (South) -> PI (West).
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI; // 0 to PI
          // Parametric circle
          // x = r * cos(angle)
          // z = r * sin(angle) 
          // Check direction:
          // angle=0 -> x=8, z=0. (Relative to center) -> World: 8, -20.
          // angle=PI/2 -> x=0, z=8. -> World: 0, -12. (South side of center).
          // This looks like passing in front of player (Player at 0, 0).
          // Wait, player is at South entrance.
          // Player enters at Z=0. Roundabout center Z=-20.
          // So South side of roundabout is Z=-12.
          // Yes.
          
          points.push(new THREE.Vector3(
              center.x + radius * Math.cos(angle), 
              center.y, 
              center.z + radius * Math.sin(angle)
          ));
      }
      
      // Exit West
      points.push(new THREE.Vector3(-15, 0.2, -17.5)); // Exit lane
      points.push(new THREE.Vector3(-30, 0.2, -17.5));
      
      return points;
  }, []);

  useFrame(() => {
    if (finished || finishedRef.current) return;

    const telemetry = useGameStore.getState().telemetry;
    const { position, indicators } = telemetry;

    // Check if passed first exit (West exit center is at Z=-20)
    if (position.z < -20 && !passedFirstExit) {
        setPassedFirstExit(true);
    }

    // Fail if indicating too early (before first exit) when going straight
    if (!passedFirstExit && (indicators.left || indicators.right)) {
        // Many drivers indicate right on approach if they are confused, but for straight it should be no signal.
        // We'll be strict on left signal early.
        if (indicators.left && position.z < 0) { // Only check once they enter intersection area
            failLevel('Do not signal left until you have passed the exit before yours.');
            finishedRef.current = true;
            setFinished(true);
            return;
        }
    }
    
    // Success: Reached North (passed conflict point)
    if (position.z < -35) {
        if (indicators.left) {
            passLevel();
        } else {
            failLevel('You failed to indicate left before exiting the roundabout!');
        }
        finishedRef.current = true;
        setFinished(true);
    }
  });

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -0.6, -20]} receiveShadow>
            <boxGeometry args={[200, 1, 200]} />
            <meshStandardMaterial color="#558b2f" />
      </mesh>

      <Roundabout position={[0, 0, -20]} />
      <StraightRoad position={[0, 0, 0]} length={20} />
      <StraightRoad position={[0, 0, -40]} length={20} />
      <StraightRoad position={[20, 0, -20]} rotation={[0, Math.PI / 2, 0]} length={20} />
      <StraightRoad position={[-20, 0, -20]} rotation={[0, Math.PI / 2, 0]} length={20} />

      {/* AI Traffic Convoy */}
      <AICar pathPoints={aiPath} speed={10} delay={0} color="red" />
      <AICar pathPoints={aiPath} speed={10} delay={2} color="blue" />
      <AICar pathPoints={aiPath} speed={10} delay={4} color="green" />
      
      {/* Player Car */}
      <Car position={[-2.5, 1, 9]} />
    </group>
  );
};
