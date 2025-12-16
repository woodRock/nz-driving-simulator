
import { useState, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latLonToMeters, MAP_CENTER_LAT, MAP_CENTER_LON, getChunkId, getChunkIdsAround } from '../utils/geoUtils';
import { useGameStore } from '../store/gameStore';

const ROAD_WIDTH = 20; 
const MARKING_WIDTH = 0.3;
const MARKING_Y = 0.15; 

interface RoadsProps {
    features: any[];
}

interface ChunkData {
    roadPositions: number[];
    roadIndices: number[];
    roadVertexCount: number;
    markingPositions: number[];
    markingIndices: number[];
    markingVertexCount: number;
}

export const Roads = ({ features }: RoadsProps) => {
  const [visibleChunkIds, setVisibleChunkIds] = useState<string[]>([]);
  const lastChunkId = useRef<string | null>(null);

  const chunkGeometries = useMemo(() => {
    if (!features || features.length === 0) return {};
    
    const chunks = new Map<string, ChunkData>();

    const getChunk = (id: string) => {
        if (!chunks.has(id)) {
            chunks.set(id, {
                roadPositions: [],
                roadIndices: [],
                roadVertexCount: 0,
                markingPositions: [],
                markingIndices: [],
                markingVertexCount: 0
            });
        }
        return chunks.get(id)!;
    };

    features.forEach((feature: any) => {
        if (!feature.geometry) return;
        
        const type = feature.geometry.type;
        const coords = feature.geometry.coordinates;

        const processLineString = (points: number[][]) => {
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i+1];
                
                const pos1 = new THREE.Vector3();
                const pos2 = new THREE.Vector3();

                const meterPos1 = latLonToMeters(p1[1], p1[0], MAP_CENTER_LAT, MAP_CENTER_LON);
                const meterPos2 = latLonToMeters(p2[1], p2[0], MAP_CENTER_LAT, MAP_CENTER_LON);

                pos1.set(meterPos1.x, 0.1, meterPos1.z);
                pos2.set(meterPos2.x, 0.1, meterPos2.z);

                // Determine chunk based on segment center
                const midX = (pos1.x + pos2.x) / 2;
                const midZ = (pos1.z + pos2.z) / 2;
                const chunkId = getChunkId(midX, midZ);
                const chunk = getChunk(chunkId);

                // Calculate geometry
                const dir = new THREE.Vector3().subVectors(pos2, pos1);
                const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
                
                // --- Road ---
                const roadPerp = perp.clone().multiplyScalar(ROAD_WIDTH / 2);
                const v0 = new THREE.Vector3().subVectors(pos1, roadPerp);
                const v1 = new THREE.Vector3().addVectors(pos1, roadPerp);
                const v2 = new THREE.Vector3().subVectors(pos2, roadPerp);
                const v3 = new THREE.Vector3().addVectors(pos2, roadPerp);

                chunk.roadPositions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
                chunk.roadIndices.push(
                    chunk.roadVertexCount + 0, chunk.roadVertexCount + 1, chunk.roadVertexCount + 2,
                    chunk.roadVertexCount + 1, chunk.roadVertexCount + 3, chunk.roadVertexCount + 2
                );
                chunk.roadVertexCount += 4;

                // --- Marking ---
                const markingPerp = perp.clone().multiplyScalar(MARKING_WIDTH / 2);
                const mPos1 = pos1.clone().setY(MARKING_Y);
                const mPos2 = pos2.clone().setY(MARKING_Y);
                const mv0 = new THREE.Vector3().subVectors(mPos1, markingPerp);
                const mv1 = new THREE.Vector3().addVectors(mPos1, markingPerp);
                const mv2 = new THREE.Vector3().subVectors(mPos2, markingPerp);
                const mv3 = new THREE.Vector3().addVectors(mPos2, markingPerp);

                chunk.markingPositions.push(mv0.x, mv0.y, mv0.z, mv1.x, mv1.y, mv1.z, mv2.x, mv2.y, mv2.z, mv3.x, mv3.y, mv3.z);
                chunk.markingIndices.push(
                    chunk.markingVertexCount + 0, chunk.markingVertexCount + 1, chunk.markingVertexCount + 2,
                    chunk.markingVertexCount + 1, chunk.markingVertexCount + 3, chunk.markingVertexCount + 2
                );
                chunk.markingVertexCount += 4;
            }
        };

        if (type === 'LineString') {
            processLineString(coords);
        } else if (type === 'MultiLineString') {
            coords.forEach((line: number[][]) => {
                processLineString(line);
            });
        }
    });

    const geometries: Record<string, { road: THREE.BufferGeometry, marking: THREE.BufferGeometry }> = {};
    
    chunks.forEach((data, id) => {
        const roadGeo = new THREE.BufferGeometry();
        roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(data.roadPositions, 3));
        roadGeo.setIndex(data.roadIndices);
        roadGeo.computeVertexNormals();

        const markingGeo = new THREE.BufferGeometry();
        markingGeo.setAttribute('position', new THREE.Float32BufferAttribute(data.markingPositions, 3));
        markingGeo.setIndex(data.markingIndices);
        markingGeo.computeVertexNormals();

        geometries[id] = { road: roadGeo, marking: markingGeo };
    });

    return geometries;
  }, [features]);

  useFrame(() => {
      const { x, z } = useGameStore.getState().telemetry.position;
      const currentId = getChunkId(x, z);
      
      if (currentId !== lastChunkId.current) {
          lastChunkId.current = currentId;
          const ids = getChunkIdsAround(x, z, 1); // Radius 1 (3x3 chunks)
          setVisibleChunkIds(ids);
      }
  });

  return (
    <group>
        {visibleChunkIds.map(id => {
            const geo = chunkGeometries[id];
            if (!geo) return null;
            return (
                <group key={id}>
                    <mesh geometry={geo.road}>
                        <meshStandardMaterial color="#424242" />
                    </mesh>
                    <mesh geometry={geo.marking}>
                        <meshStandardMaterial color="#FFFFFF" />
                    </mesh>
                </group>
            );
        })}
    </group>
  );
};
