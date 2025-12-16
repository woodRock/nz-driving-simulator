import * as THREE from 'three';
import { latLonToMeters, MAP_CENTER_LAT, MAP_CENTER_LON, getChunkId } from './geoUtils';

export interface GraphNode {
    id: string; // "x,z"
    position: THREE.Vector3;
    edges: GraphEdge[];
}

export interface GraphEdge {
    id: string;
    from: string; // Node ID
    to: string; // Node ID
    points: THREE.Vector3[]; // Geometry points
    roadName: string;
}

export class RoadGraph {
    nodes: Map<string, GraphNode> = new Map();
    chunkedNodes: Map<string, GraphNode[]> = new Map();

    constructor(features: any[]) {
        this.buildGraph(features);
    }

    private getNodeKey(x: number, z: number): string {
        return `${Math.round(x)},${Math.round(z)}`;
    }

    private buildGraph(features: any[]) {
        features.forEach((feature: any) => {
            if (!feature.geometry) return;
            const type = feature.geometry.type;
            const coords = feature.geometry.coordinates;
            const name = feature.properties?.name || 'Unknown Road';

            const processLineString = (line: number[][]) => {
                if (line.length < 2) return;

                // Convert all points to meters
                const points = line.map(p => {
                    const m = latLonToMeters(p[1], p[0], MAP_CENTER_LAT, MAP_CENTER_LON);
                    return new THREE.Vector3(m.x, 0, m.z);
                });

                // Create/Get Nodes for Start and End
                const startP = points[0];
                const endP = points[points.length - 1];
                const startKey = this.getNodeKey(startP.x, startP.z);
                const endKey = this.getNodeKey(endP.x, endP.z);

                const getOrCreateNode = (key: string, pos: THREE.Vector3) => {
                    if (!this.nodes.has(key)) {
                        const node = { id: key, position: pos, edges: [] };
                        this.nodes.set(key, node);
                        
                        // Add to spatial chunk index
                        const chunkId = getChunkId(pos.x, pos.z);
                        if (!this.chunkedNodes.has(chunkId)) {
                            this.chunkedNodes.set(chunkId, []);
                        }
                        this.chunkedNodes.get(chunkId)!.push(node);
                    }
                    return this.nodes.get(key)!;
                };

                const startNode = getOrCreateNode(startKey, startP);
                const endNode = getOrCreateNode(endKey, endP);

                // Create Edges (Bidirectional for now)
                // Edge 1: Start -> End
                const edge1: GraphEdge = {
                    id: `${startKey}-${endKey}`,
                    from: startKey,
                    to: endKey,
                    points: points,
                    roadName: name
                };
                startNode.edges.push(edge1);

                // Edge 2: End -> Start (Reverse points)
                const edge2: GraphEdge = {
                    id: `${endKey}-${startKey}`,
                    from: endKey,
                    to: startKey,
                    points: [...points].reverse(),
                    roadName: name
                };
                endNode.edges.push(edge2);
            };

            if (type === 'LineString') {
                processLineString(coords);
            } else if (type === 'MultiLineString') {
                coords.forEach((line: number[][]) => {
                    processLineString(line);
                });
            }
        });
    }

    public getClosestNode(position: { x: number, z: number }): GraphNode | null {
        let closest: GraphNode | null = null;
        let minDist = Infinity;

        // Optimization: Only check nodes in the surrounding chunks
        const centerChunkId = getChunkId(position.x, position.z);
        // Parse chunk ID to get x, z indices
        const [cx, cz] = centerChunkId.split(',').map(Number);
        
        // Search 3x3 grid of chunks
        for(let dx = -1; dx <= 1; dx++) {
            for(let dz = -1; dz <= 1; dz++) {
                const chunkId = `${cx + dx},${cz + dz}`;
                const nodes = this.chunkedNodes.get(chunkId);
                if (nodes) {
                    for (const node of nodes) {
                        const dist = Math.sqrt(Math.pow(node.position.x - position.x, 2) + Math.pow(node.position.z - position.z, 2));
                        if (dist < minDist) {
                            minDist = dist;
                            closest = node;
                        }
                    }
                }
            }
        }

        return closest;
    }

    public getNodesInChunk(chunkId: string): GraphNode[] {
        return this.chunkedNodes.get(chunkId) || [];
    }

    public getRandomNodeInChunk(chunkId: string): GraphNode | null {
        const nodes = this.chunkedNodes.get(chunkId);
        if (!nodes || nodes.length === 0) return null;
        return nodes[Math.floor(Math.random() * nodes.length)];
    }

    public getRandomPath(startNodeId: string, maxSegments: number = 5): THREE.Vector3[] {
        let currentNode = this.nodes.get(startNodeId);
        if (!currentNode) return [];

        const pathPoints: THREE.Vector3[] = [currentNode.position];
        let previousNodeId: string | null = null;

        for (let i = 0; i < maxSegments; i++) {
            // Filter out the edge that goes back to where we came from
            const validEdges = currentNode.edges.filter(e => e.to !== previousNodeId);
            
            if (validEdges.length === 0) break; // Dead end

            // Pick a random edge
            const edge = validEdges[Math.floor(Math.random() * validEdges.length)];
            
            // Add intermediate points (excluding start, as it's already in path)
            // Offset logic should happen here or in the component. 
            // For raw path, just return center line points.
            for (let j = 1; j < edge.points.length; j++) {
                pathPoints.push(edge.points[j]);
            }

            previousNodeId = currentNode.id;
            currentNode = this.nodes.get(edge.to);
            if (!currentNode) break;
        }

        return pathPoints;
    }
}

