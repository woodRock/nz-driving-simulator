import * as THREE from 'three';
import { RoadGraph, type GraphNode } from './RoadGraph';

interface PathNode {
    id: string;
    g: number; // Cost from start
    h: number; // Heuristic to end
    f: number; // Total cost
    parent: PathNode | null;
}

export class Pathfinding {
    private graph: RoadGraph;

    constructor(graph: RoadGraph) {
        this.graph = graph;
    }

    // Heuristic: Euclidean distance
    private heuristic(a: GraphNode, b: GraphNode): number {
        return Math.sqrt(Math.pow(a.position.x - b.position.x, 2) + Math.pow(a.position.z - b.position.z, 2));
    }

    public findPath(startPos: { x: number, z: number }, endPos: { x: number, z: number }): THREE.Vector3[] {
        const startNode = this.graph.getClosestNode(startPos);
        const endNode = this.graph.getClosestNode(endPos);

        if (!startNode || !endNode) {
            console.warn("Pathfinding: Could not find closest nodes for start/end.");
            return [];
        }

        if (startNode.id === endNode.id) {
            return [startNode.position];
        }

        // A* Algorithm
        const openList: PathNode[] = [];
        const closedList: Set<string> = new Set();
        const nodeMap: Map<string, PathNode> = new Map(); // Keep track of PathNodes by ID

        const startPathNode: PathNode = {
            id: startNode.id,
            g: 0,
            h: this.heuristic(startNode, endNode),
            f: 0, // Calculated below
            parent: null
        };
        startPathNode.f = startPathNode.g + startPathNode.h;

        openList.push(startPathNode);
        nodeMap.set(startNode.id, startPathNode);

        while (openList.length > 0) {
            // Sort by F cost (lowest first) - rudimentary priority queue
            openList.sort((a, b) => a.f - b.f);
            const current = openList.shift()!;

            if (current.id === endNode.id) {
                return this.reconstructPath(current);
            }

            closedList.add(current.id);

            const graphNode = this.graph.nodes.get(current.id);
            if (!graphNode) continue;

            for (const edge of graphNode.edges) {
                const neighborId = edge.to;
                if (closedList.has(neighborId)) continue;

                const neighborGraphNode = this.graph.nodes.get(neighborId);
                if (!neighborGraphNode) continue;

                // Calculate cost (distance of edge points)
                let edgeCost = 0;
                for(let i=0; i<edge.points.length-1; i++) {
                    edgeCost += edge.points[i].distanceTo(edge.points[i+1]);
                }

                const gScore = current.g + edgeCost;

                let neighborPathNode = nodeMap.get(neighborId);

                if (!neighborPathNode) {
                    neighborPathNode = {
                        id: neighborId,
                        g: gScore,
                        h: this.heuristic(neighborGraphNode, endNode),
                        f: 0,
                        parent: current
                    };
                    neighborPathNode.f = neighborPathNode.g + neighborPathNode.h;
                    openList.push(neighborPathNode);
                    nodeMap.set(neighborId, neighborPathNode);
                } else if (gScore < neighborPathNode.g) {
                    // Found a better path to this neighbor
                    neighborPathNode.g = gScore;
                    neighborPathNode.f = gScore + neighborPathNode.h;
                    neighborPathNode.parent = current;
                }
            }
        }

        console.warn("Pathfinding: No path found.");
        return [];
    }

    private reconstructPath(endNode: PathNode): THREE.Vector3[] {
        const path: THREE.Vector3[] = [];
        let current: PathNode | null = endNode;

        // Trace back parents to get node sequence
        const nodeSequence: string[] = [];
        while (current) {
            nodeSequence.push(current.id);
            current = current.parent;
        }
        nodeSequence.reverse();

        // Construct full geometry from edges
        // Note: nodeSequence contains just the junction nodes. We need the points between them.
        
        for (let i = 0; i < nodeSequence.length - 1; i++) {
            const fromId = nodeSequence[i];
            const toId = nodeSequence[i+1];
            const fromNode = this.graph.nodes.get(fromId);
            
            if (fromNode) {
                const edge = fromNode.edges.find(e => e.to === toId);
                if (edge) {
                    // Add points. Avoid duplicating start/end points of segments if possible
                    // edge.points includes start (fromNode) and end (toNode)
                    // If i > 0, we already added the 'fromNode' position in the previous iteration (as the 'end' of that segment)
                    // So skip the first point
                    const pointsToAdd = (i === 0) ? edge.points : edge.points.slice(1);
                    path.push(...pointsToAdd);
                }
            }
        }

        return path;
    }
}
