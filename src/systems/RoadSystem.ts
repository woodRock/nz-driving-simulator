import { RoadGraph } from '../utils/RoadGraph';

class RoadSystemManager {
    graph: RoadGraph | null = null;

    init(features: any[]) {
        this.graph = new RoadGraph(features);
    }

    getDistanceToRoad(x: number, z: number): number {
        if (!this.graph) return Infinity;
        return this.graph.getDistanceToRoad(x, z);
    }
}

export const RoadSystem = new RoadSystemManager();
