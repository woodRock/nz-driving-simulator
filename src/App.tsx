import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
// Removed: import { Physics } from '@react-three/rapier';
import { useGameStore } from './store/gameStore';
import { TIntersectionScenario } from './scenarios/TIntersectionScenario';
import { RoundaboutScenario } from './scenarios/RoundaboutScenario';
import { WellingtonScenario } from './scenarios/WellingtonScenario';
import { StopSignScenario } from './scenarios/StopSignScenario';
import { PedestrianScenario } from './scenarios/PedestrianScenario';
import { ParallelParkingScenario } from './scenarios/ParallelParkingScenario';
import { UI } from './components/UI';
import { TIntersectionRightScenario } from './scenarios/TIntersectionRightScenario';
import { GiveWayScenario } from './scenarios/GiveWayScenario';
import { TIntersectionGiveWayScenario } from './scenarios/TIntersectionGiveWayScenario'; // New import
import { StopSignCrossTrafficScenario } from './scenarios/StopSignCrossTrafficScenario'; // New import
import { GiveWayMergeTrafficScenario } from './scenarios/GiveWayMergeTrafficScenario'; // New import
import { GiveWayRightToLeftScenario } from './scenarios/GiveWayRightToLeftScenario'; // New import
import { FourWayGiveWayScenario } from './scenarios/FourWayGiveWayScenario'; // New import
import { TrainCrossingScenario } from './scenarios/TrainCrossingScenario'; // New import
import { TIntersectionLeftOncomingScenario } from './scenarios/TIntersectionLeftOncomingScenario'; // New import
import { PhysicsSystem } from './physics/PhysicsSystem'; // Custom PhysicsSystem import
import { CyclistHazardScenario } from './scenarios/CyclistHazardScenario';
import { PedestrianIslandScenario } from './scenarios/PedestrianIslandScenario'; // New import

function Scene() {
  const { currentScenario, currentLevelIndex, levelStatus } = useGameStore();

  // Unique key to force re-mount when retrying (status goes back to 'playing')
  // We combine scenario ID and status to ensure a fresh start on retry.
  const key = `${currentScenario}-${levelStatus === 'playing' ? 'play' : 'stop'}-${currentLevelIndex}`;

  // Update custom physics system every frame
  useFrame((_, delta) => {
    PhysicsSystem.update(delta);
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <Environment preset="city" />
      
      {/* Removed: <Physics debug gravity={[0, -9.81, 0]}> */}
        <group key={key}>
          {currentScenario === 'cyclist-hazard' && <CyclistHazardScenario />}
          {currentScenario === 'giveway' && <GiveWayScenario />}
          {currentScenario === 't-intersection' && <TIntersectionScenario />}
          {currentScenario === 'roundabout' && <RoundaboutScenario />}
          {currentScenario === 'stop-sign' && <StopSignScenario />}
          {currentScenario === 'pedestrian' && <PedestrianScenario />}
          {currentScenario === 'pedestrian-island' && <PedestrianIslandScenario />} {/* New scenario */}
          {currentScenario === 'parking' && <ParallelParkingScenario />}
          {currentScenario === 'wellington' && <WellingtonScenario />}
          {currentScenario === 't-intersection-right' && <TIntersectionRightScenario />}
          {currentScenario === 't-intersection-give-way' && <TIntersectionGiveWayScenario />}
          {currentScenario === 'stop-sign-cross-traffic' && <StopSignCrossTrafficScenario />}
          {currentScenario === 'giveway-merge-traffic' && <GiveWayMergeTrafficScenario />}
          {currentScenario === 'giveway-right-to-left' && <GiveWayRightToLeftScenario />}
          {currentScenario === 'four-way-give-way' && <FourWayGiveWayScenario />}
          {currentScenario === 'train-crossing' && <TrainCrossingScenario />}
          {currentScenario === 't-intersection-left-oncoming' && <TIntersectionLeftOncomingScenario />} {/* New scenario */}
        </group>
      {/* Removed: </Physics> */}
    </>
  );
}

function App() {
  return (
    <>
      <UI />
      <Canvas>
        <Scene />
      </Canvas>
    </>
  );
}

export default App;
