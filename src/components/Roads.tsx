import { useState, useMemo } from 'react';
import * as THREE from 'three';
import { latLonToMeters, MAP_CENTER_LAT, MAP_CENTER_LON, getChunkId, getChunkIdsAround } from '../utils/geoUtils';
import { useGameStore } from '../store/gameStore';
import { RoadChunk } from './RoadChunk';

interface RoadsProps {
    features: any[];
}

interface RoadSegment {
    p1: THREE.Vector3;
    p2: THREE.Vector3;
}

export const Roads = ({ features }: RoadsProps) => {
  const [visibleChunkIds, setVisibleChunkIds] = useState<string[]>([]);
  const chunkedSegments = useMemo(() => {
      const map = new Map<string, RoadSegment[]>();
      if (!features) return map;

      features.forEach((feature: any) => {
          if (!feature.geometry) return;
          const coords = feature.geometry.coordinates;
          const type = feature.geometry.type;

          const processLine = (points: number[][]) => {
              for (let i = 0; i < points.length - 1; i++) {
                  const pStart = points[i];
                  const pEnd = points[i+1];
                  
                  const v1 = latLonToMeters(pStart[1], pStart[0], MAP_CENTER_LAT, MAP_CENTER_LON);
                  const v2 = latLonToMeters(pEnd[1], pEnd[0], MAP_CENTER_LAT, MAP_CENTER_LON);
                  
                  const p1 = new THREE.Vector3(v1.x, 0, v1.z);
                  const p2 = new THREE.Vector3(v2.x, 0, v2.z);
                  
                  const dist = p1.distanceTo(p2);
                  const maxSegLen = 10;
                  
                  if (dist > maxSegLen) {
                      const count = Math.ceil(dist / maxSegLen);
                      for (let k = 0; k < count; k++) {
                          const t1 = k / count;
                          const t2 = (k + 1) / count;
                          const subP1 = new THREE.Vector3().lerpVectors(p1, p2, t1);
                          const subP2 = new THREE.Vector3().lerpVectors(p1, p2, t2);
                          
                          const midX = (subP1.x + subP2.x) / 2;
                          const midZ = (subP1.z + subP2.z) / 2;
                          const id = getChunkId(midX, midZ);
                          
                          if (!map.has(id)) map.set(id, []);
                          map.get(id)!.push({ p1: subP1, p2: subP2 });
                      }
                  } else {
                      const midX = (p1.x + p2.x) / 2;
                      const midZ = (p1.z + p2.z) / 2;
                      const id = getChunkId(midX, midZ);
                      
                      if (!map.has(id)) map.set(id, []);
                      map.get(id)!.push({ p1, p2 });
                  }
              }
          };

          if (type === 'LineString') {
              processLine(coords);
          } else if (type === 'MultiLineString') {
              coords.forEach((line: number[][]) => processLine(line));
          }
      });
      return map;
  }, [features]);

  // Update visible chunks based on player position
  useMemo(() => {
    const unsub = useGameStore.subscribe((state) => {
        const { x, z } = state.telemetry.position;
        // Radius 2 = 5x5 chunks (750m x 750m area) - enough for visibility
        const ids = getChunkIdsAround(x, z, 2);
        
        // Simple distinct check to avoid spamming state updates
        setVisibleChunkIds(prev => {
             const set = new Set(prev);
             let changed = false;
             if (ids.length !== prev.length) changed = true;
             else {
                 for (const id of ids) if (!set.has(id)) { changed = true; break; }
             }
             return changed ? ids : prev;
        });
    });
    return unsub;
  }, []);

  return (
    <group>
        {visibleChunkIds.map(id => {
            const segments = chunkedSegments.get(id);
            if (!segments) return null;
            return <RoadChunk key={id} chunkId={id} segments={segments} />;
        })}
    </group>
  );
};
