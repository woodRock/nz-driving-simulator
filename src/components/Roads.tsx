
import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { latLonToMeters } from '../utils/geoUtils';

// Center of the map (approximate from first feature)
const CENTER_LAT = -40.761484882856685;
const CENTER_LON = 175.828480866816477;

export const Roads = () => {
  const [roadFeatures, setRoadFeatures] = useState<any[]>([]);

  useEffect(() => {
    const fetchRoadData = async () => {
      try {
        const response = await fetch('/src/assets/wellington_roads.geojson');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setRoadFeatures(data.features);
      } catch (error) {
        console.error("Failed to load road data:", error);
      }
    };

    fetchRoadData();
  }, []);

  const geometry = useMemo(() => {
    if (roadFeatures.length === 0) return null;
    
    const vertices: number[] = [];

    roadFeatures.forEach((feature: any) => {
        if (!feature.geometry) return;
        
        const type = feature.geometry.type;
        const coords = feature.geometry.coordinates;

        const processLineString = (points: number[][]) => {
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i+1];
                
                const pos1 = latLonToMeters(p1[1], p1[0], CENTER_LAT, CENTER_LON);
                const pos2 = latLonToMeters(p2[1], p2[0], CENTER_LAT, CENTER_LON);

                vertices.push(pos1.x, 0.1, pos1.z);
                vertices.push(pos2.x, 0.1, pos2.z);
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

    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return bufferGeometry;
  }, [roadFeatures]);

  if (!geometry) return null;

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="white" />
    </lineSegments>
  );
};
