import { RoadGraph } from '../utils/RoadGraph';

class RoadSystemManager {
    graph: RoadGraph | null = null;

    init(features: any[]) {
        this.graph = new RoadGraph(features);
    }

    merge(features: any[]) {
        if (!this.graph) {
            this.graph = new RoadGraph(features);
        } else {
            this.graph.mergeFeatures(features);
        }
    }

    getDistanceToRoad(x: number, z: number): number {
        if (!this.graph) return Infinity;
        return this.graph.getDistanceToRoad(x, z);
    }
}

export const RoadSystem = new RoadSystemManager();
