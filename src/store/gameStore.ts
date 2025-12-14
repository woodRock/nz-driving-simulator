import { create } from 'zustand';

export type ScenarioId = 't-intersection' | 'roundabout' | 'stop-sign' | 'pedestrian' | 'parking' | 'wellington';

export interface ScenarioDef {
    id: ScenarioId;
    title: string;
    description: string;
}

export const SCENARIOS: ScenarioDef[] = [
    { id: 't-intersection', title: 'T-Intersection', description: 'Give way to traffic. Turn Left.' },
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
}

export const useGameStore = create<GameState>((set, get) => ({
  currentScenario: 'menu',
  currentLevelIndex: 0,
  levelStatus: 'playing',
  message: 'Welcome! Select a scenario.',
  score: 100,
  telemetry: { speed: 0, position: { x: 0, y: 0, z: 0 }, indicators: { left: false, right: false } },

  setMessage: (msg) => set({ message: msg }),
  setScore: (score) => set({ score }),
  updateTelemetry: (data) => set((state) => ({ telemetry: { ...state.telemetry, ...data } })),

  startCareer: () => {
      set({ 
          currentLevelIndex: 0, 
          currentScenario: SCENARIOS[0].id, 
          levelStatus: 'playing', 
          message: SCENARIOS[0].description,
          score: 100 
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
              score: 100
          });
      } else {
          set({ currentScenario: 'menu', message: 'Career Completed! Well done.' });
      }
  },

  retryLevel: () => {
      // Force re-mount by briefly setting to menu or just resetting status?
      // Ideally, the parent component handles unmount/remount on key change.
      // We'll just reset status and let the UI/Scene handle the reload.
      const idx = get().currentLevelIndex;
      set({ 
          levelStatus: 'playing', 
          message: SCENARIOS[idx].description,
          score: 100
      });
      // Note: A real reload might need a key change in the Scene component.
  },

  passLevel: () => {
      set({ levelStatus: 'passed', message: 'PASSED! Press Next to continue.' });
  },

  failLevel: (reason) => {
      set({ levelStatus: 'failed', message: `FAILED: ${reason}`, score: 0 });
  },

  goToMenu: () => {
      set({ currentScenario: 'menu', message: 'Welcome' });
  },

  selectScenario: (id) => {
      set({ currentScenario: id, levelStatus: 'playing', message: '', score: 100 });
  }
}));

