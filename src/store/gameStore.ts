import { create } from 'zustand';

export type ScenarioId = 'giveway' | 't-intersection' | 'roundabout' | 'stop-sign' | 'pedestrian' | 'parking' | 'wellington' | 't-intersection-right';

export interface ScenarioDef {
    id: ScenarioId;
    title: string;
    description: string;
}

export const SCENARIOS: ScenarioDef[] = [
    { id: 'giveway', title: 'Give Way', description: 'Give way to crossing traffic.' },
    { id: 't-intersection', title: 'T-Intersection', description: 'Give way to traffic. Turn Left.' },
    { id: 't-intersection-right', title: 'T-Intersection (Right Turn)', description: 'Give way to ALL traffic. Turn Right. Watch for oncoming traffic and other turning vehicles!' },
    { id: 'roundabout', title: 'Roundabout', description: 'Take the 3rd exit (Right Turn).' },
    { id: 'pedestrian', title: 'Pedestrian Crossing', description: 'Stop for the pedestrian.' },
    { id: 'parking', title: 'Parallel Parking', description: 'Park in the green box between the cars.' },
    { id: 'stop-sign', title: 'Stop Sign', description: 'Come to a complete stop at the line.' },
];

interface Telemetry {
    speed: number;
    position: { x: number, y: number, z: number };
    indicators: { left: boolean, right: boolean };
}

interface GameState {
  currentScenario: ScenarioId | 'menu';
  currentLevelIndex: number;
  levelStatus: 'playing' | 'passed' | 'failed';
  message: string;
  score: number;
  telemetry: Telemetry;
  isPaused: boolean; // New state property

  // Actions
  setMessage: (msg: string) => void;
  setScore: (score: number) => void;
  updateTelemetry: (data: Partial<Telemetry>) => void;
  
  startCareer: () => void;
  nextLevel: () => void;
  retryLevel: () => void;
  passLevel: () => void;
  failLevel: (reason: string) => void;
  goToMenu: () => void;
  selectScenario: (id: ScenarioId) => void;
  togglePause: () => void; // New action
}

export const useGameStore = create<GameState>((set, get) => ({
  currentScenario: 'menu',
  currentLevelIndex: 0,
  levelStatus: 'playing',
  message: 'Welcome! Select a scenario.',
  score: 100,
  telemetry: { speed: 0, position: { x: 0, y: 0, z: 0 }, indicators: { left: false, right: false } },
  isPaused: false, // Initial state for new property

  setMessage: (msg) => set({ message: msg }),
  setScore: (score) => set({ score }),
  updateTelemetry: (data) => set((state) => ({ telemetry: { ...state.telemetry, ...data } })),

  startCareer: () => {
      set({ 
          currentLevelIndex: 0, 
          currentScenario: SCENARIOS[0].id, 
          levelStatus: 'playing', 
          message: SCENARIOS[0].description,
          score: 100,
          isPaused: false // Ensure not paused when starting career
      });
  },

  nextLevel: () => {
      const nextIndex = get().currentLevelIndex + 1;
      if (nextIndex < SCENARIOS.length) {
          set({ 
              currentLevelIndex: nextIndex, 
              currentScenario: SCENARIOS[nextIndex].id, 
              levelStatus: 'playing',
              message: SCENARIOS[nextIndex].description,
              score: 100,
              isPaused: false // Ensure not paused when moving to next level
          });
      } else {
          set({ currentScenario: 'menu', message: 'Career Completed! Well done.', isPaused: false });
      }
  },

  retryLevel: () => {
      const idx = get().currentLevelIndex;
      set({ 
          levelStatus: 'playing', 
          message: SCENARIOS[idx].description,
          score: 100,
          isPaused: false // Ensure not paused when retrying level
      });
  },

  passLevel: () => {
      set({ levelStatus: 'passed', message: 'PASSED! Press Next to continue.', isPaused: false }); // Ensure not paused when passing
  },

  failLevel: (reason) => {
      set({ levelStatus: 'failed', message: `FAILED: ${reason}`, score: 0, isPaused: false }); // Ensure not paused when failing
  },

  goToMenu: () => {
      set({ currentScenario: 'menu', message: 'Welcome', isPaused: false }); // Ensure not paused when going to menu
  },

  selectScenario: (id) => {
      set({ currentScenario: id, levelStatus: 'playing', message: '', score: 100, isPaused: false }); // Ensure not paused when selecting scenario
  },

  togglePause: () => {
      set((state) => ({ isPaused: !state.isPaused }));
  }
}));
