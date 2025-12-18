import { create } from 'zustand';

export type ScenarioId = 'giveway' | 't-intersection' | 'roundabout' | 'stop-sign' | 'pedestrian' | 'pedestrian-island' | 'parking' | 'wellington' | 't-intersection-right' | 't-intersection-give-way' | 'stop-sign-cross-traffic' | 'giveway-merge-traffic' | 'giveway-right-to-left' | 'four-way-give-way' | 'train-crossing' | 't-intersection-left-oncoming' | 'cyclist-hazard' | 'overtaking' | 'one-lane-bridge' | 'school-bus' | 'emergency-vehicle' | 'zebra-crossing' | 'flush-median' | 'road-works' | 'unmarked-intersection' | 'livestock' | 'roundabout-give-way' | 'three-point-turn';

export interface ScenarioDef {
    id: ScenarioId;
    title: string;
    description: string;
}

export const SCENARIOS: ScenarioDef[] = [
    { id: 'three-point-turn', title: 'Three-Point Turn', description: 'The road is too narrow for a U-turn. Turn around without hitting the kerb.' },
    { id: 'roundabout-give-way', title: 'Roundabout Give Way', description: 'Give way to traffic from your right at the roundabout.' },
    { id: 'livestock', title: 'Livestock', description: 'Sheep on the road! Stop and wait for them to clear.' },
    { id: 'unmarked-intersection', title: 'Unmarked Intersection', description: 'No signs. Give way to traffic from your RIGHT.' },
    { id: 'road-works', title: 'Road Works', description: 'Temporary Speed Limit 30km/h. Slow down before the cones.' },
    { id: 'flush-median', title: 'Flush Median', description: 'Use the flush median to wait for a gap, then turn right.' },
    { id: 'zebra-crossing', title: 'Zebra Crossing', description: 'Give way to pedestrians waiting to cross at the zebra crossing.' },
    { id: 'emergency-vehicle', title: 'Emergency Vehicle', description: 'An ambulance is approaching! Pull over to the left and STOP.' },
    { id: 'school-bus', title: 'School Bus', description: 'The speed limit is 20km/h when passing a stationary school bus.' },
    { id: 'one-lane-bridge', title: 'One-Lane Bridge', description: 'Give way to oncoming traffic at the one-lane bridge.' },
    { id: 'overtaking', title: 'No Overtaking Lines', description: 'Follow the slow vehicle. Do NOT overtake on a solid yellow line. Wait for the passing lane.' },
    { id: 'cyclist-hazard', title: 'Cyclist Hazard', description: 'Watch out for the cyclist ahead!' },
    { id: 'pedestrian-island', title: 'Pedestrian Crossing (Island)', description: 'Stop until the pedestrian reaches the island, then proceed safely.' }, // New scenario
    { id: 't-intersection-right', title: 'T-Intersection (Right Turn)', description: 'Give way to ALL traffic. Turn Right. Watch for oncoming traffic and other turning vehicles!' },
    { id: 't-intersection-give-way', title: 'T-Intersection (Give Way)', description: 'Give way to traffic from your right. Go straight or turn left.' }, // New scenario
    { id: 'stop-sign-cross-traffic', title: 'Stop Sign (Cross Traffic)', description: 'Come to a complete stop and give way to cross traffic before proceeding.' }, // New scenario
    { id: 'giveway-merge-traffic', title: 'Give Way (Merge Traffic)', description: 'Give way to continuous traffic flow from your right. Merge safely onto the main road.' }, // New scenario
    { id: 'giveway-right-to-left', title: 'Give Way (Right-to-Left)', description: 'You are at the intersection. Give way to the car approaching from your right before proceeding straight.' }, // New scenario
    { id: 'four-way-give-way', title: 'Four-Way Give Way', description: 'At this four-way intersection, give way to traffic from your right and proceed straight.' }, // New scenario
    { id: 'train-crossing', title: 'Train Crossing', description: 'Stop at the tracks and wait for the train to pass safely before proceeding.' }, // New scenario
    { id: 't-intersection-left-oncoming', title: 'T-Intersection (Left Turn, Oncoming)', description: 'Prepare to turn left. Give way to oncoming traffic before turning.' }, // New scenario
    { id: 'giveway', title: 'Give Way', description: 'Give way to crossing traffic.' },
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

export interface Waypoint {
    id: string;
    name: string;
    lat: number;
    lon: number;
}

interface GameState {
  currentScenario: ScenarioId | 'menu';
  currentLevelIndex: number;
  levelStatus: 'playing' | 'passed' | 'failed';
  message: string;
  score: number;
  telemetry: Telemetry;
  isPaused: boolean; // New state property
  flags: Record<string, boolean>;
  retryCount: number;
  mapType: 'osm' | 'satellite';
  waypoints: Waypoint[];

  // Actions
  setMessage: (msg: string) => void;
  setScore: (score: number) => void;
  updateTelemetry: (data: Partial<Telemetry>) => void;
  setFlag: (key: string, value: boolean) => void;
  setMapType: (type: 'osm' | 'satellite') => void;
  addWaypoint: (waypoint: Waypoint) => void;
  removeWaypoint: (id: string) => void;
  
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
    flags: {},
    retryCount: 0,
    mapType: 'satellite',
    waypoints: [],
  
    setMessage: (msg) => set({ message: msg }),
    setScore: (score) => set({ score }),
    updateTelemetry: (data) => set((state) => ({ telemetry: { ...state.telemetry, ...data } })),
    setFlag: (key, value) => set((state) => ({ flags: { ...state.flags, [key]: value } })),
    setMapType: (type) => set({ mapType: type }),
    addWaypoint: (waypoint) => set((state) => ({ waypoints: [...state.waypoints, waypoint] })),
    removeWaypoint: (id) => set((state) => ({ waypoints: state.waypoints.filter((w) => w.id !== id) })),
  
    startCareer: () => {
        set({ 
            currentLevelIndex: 0, 
            currentScenario: SCENARIOS[0].id, 
            levelStatus: 'playing', 
            message: SCENARIOS[0].description,
            score: 100,
            isPaused: false,
            flags: {},
            retryCount: 0
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
                isPaused: false,
                flags: {},
                retryCount: 0
            });
        } else {
            set({ currentScenario: 'menu', message: 'Career Completed! Well done.', isPaused: false, flags: {}, retryCount: 0 });
        }
    },
  
    retryLevel: () => {
        const idx = get().currentLevelIndex;
        set((state) => ({ 
            levelStatus: 'playing', 
            message: SCENARIOS[idx].description,
            score: 100,
            isPaused: false,
            flags: {},
            retryCount: state.retryCount + 1
        }));
    },  
    passLevel: () => {
        set({ levelStatus: 'passed', message: 'PASSED! Press Next to continue.', isPaused: false }); // Ensure not paused when passing
    },
  
    failLevel: (reason) => {
        set({ levelStatus: 'failed', message: `FAILED: ${reason}`, score: 0, isPaused: false }); // Ensure not paused when failing
    },
  
      goToMenu: () => {
          set({ currentScenario: 'menu', message: 'Welcome', isPaused: false, flags: {}, retryCount: 0 }); // Ensure not paused when going to menu
      },
    
      selectScenario: (id) => {
          set({ currentScenario: id, levelStatus: 'playing', message: '', score: 100, isPaused: false, flags: {}, retryCount: 0 }); // Ensure not paused when selecting scenario
      },  togglePause: () => {
      set((state) => ({ isPaused: !state.isPaused }));
  }
}));
