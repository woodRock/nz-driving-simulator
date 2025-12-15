import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { StraightRoad } from '../components/world/StraightRoad';
import { Car } from '../components/vehicle/Car';
import { Pedestrian } from '../components/vehicle/Pedestrian'; // Import the new Pedestrian component
import { useGameStore } from '../store/gameStore';
import { RigidBody } from '@react-three/rapier';

export const PedestrianScenario: React.FC = () => {
  const { setMessage, telemetry, failLevel, passLevel } = useGameStore();
  const [finished, setFinished] = useState(false);
  const failedRef = useRef(false);
  const [hasStopped, setHasStopped] = useState(false); // New state for stop detection
  const pedestrianCrossedRef = useRef(false); // Track if pedestrian has cleared

  useEffect(() => {
    setMessage('Scenario: Pedestrian Crossing. Give way to the pedestrian!');
  }, [setMessage]);

  useFrame((state) => {
    if (finished || failedRef.current) return;
    const { position, speed } = telemetry;
    const playerSpeed = speed;

    // Pedestrian crosses at z = -20, across X from -10 to 10
    const pedestrianCrossingZ = -20;
    const playerStopLineZ = -15; // Player needs to stop before this Z
    const pedestrianOnRoadMinX = -5; // Approx start of crossing
    const pedestrianOnRoadMaxX = 5;  // Approx end of crossing

    // Simplified pedestrian position check (pedestrian always crosses)
    // For a more robust check, we'd need to know the pedestrian's current position.
    // For now, let's assume pedestrian is "present" on the road if time > delay.
    const pedestrianPresent = state.clock.getElapsedTime() > 1; // Pedestrian starts after 1s delay


    // Stop Detection: Player must stop before playerStopLineZ if pedestrian is present
    const playerAtStopLine = (position.z < playerStopLineZ + 2 && position.z > playerStopLineZ - 2); // A small window around the stop line
    if (pedestrianPresent && !hasStopped && playerAtStopLine && playerSpeed < 0.5) {
        console.log("STOP DETECTED for Pedestrian! Player Z:", position.z.toFixed(2), "Speed:", playerSpeed.toFixed(2));
        setHasStopped(true);
    }

    // Pedestrian crossed logic (simplistic: after some time, or if player stops)
    // For now, let's say pedestrian has "crossed" if player has stopped for them.
    if (hasStopped && !pedestrianCrossedRef.current) {
        // In a real scenario, this would check pedestrian's actual x position.
        // For stationary type pedestrian, we assume they eventually cross if player stops.
        pedestrianCrossedRef.current = true;
    }

    // Fail if player crosses stop line without stopping while pedestrian is present
    if (pedestrianPresent && !hasStopped && position.z < playerStopLineZ - 2) { // Player passed stop line without stopping
        failLevel('You did not stop for the pedestrian!');
        failedRef.current = true;
        setFinished(true);
        return;
    }
    
    // Pass condition: Player successfully passed the pedestrian crossing zone
    if (position.z < pedestrianCrossingZ - 10) { // Player is well past the crossing
        if (!hasStopped && pedestrianPresent) { // If pedestrian was present, player must have stopped
            failLevel('You did not stop for the pedestrian!');
            failedRef.current = true;
            setFinished(true);
            return;
        }
        passLevel();
        setFinished(true);
    }
  });

  return (
    <group>
       {/* Ground */}
      <RigidBody type="fixed" colliders="cuboid" friction={1} userData={{ type: 'grass' }}>
        <mesh position={[0, -0.6, -20]} receiveShadow>
            <boxGeometry args={[50, 1, 100]} />
            <meshStandardMaterial color="#81c784" />
        </mesh>
      </RigidBody>

      <StraightRoad position={[0, 0, 0]} length={20} />
      <StraightRoad position={[0, 0, -20]} length={20} />
      <StraightRoad position={[0, 0, -40]} length={20} />

      {/* Pedestrian crossing the road */}
      <Pedestrian startPos={[-5, 0.9, -7.5]} endPos={[10, 0.9, -7.5]} speed={1.5} delay={1} />
      
      {/* Crossing Markings (Zebra Crossing) */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh 
            key={i} 
            position={[-4.5 + i, 0.02, -20]} 
            rotation={[-Math.PI/2, 0, 0]}
        >
            <planeGeometry args={[0.6, 4]} />
            <meshStandardMaterial color="white" />
        </mesh>
      ))}

      <Car position={[-2.5, 1, 10]} />
    </group>
  );
};
