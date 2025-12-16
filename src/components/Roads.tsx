
import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { latLonToMeters } from '../utils/geoUtils';

// Center of the map (approximate from first feature)
const CENTER_LAT = -40.761484882856685;
const CENTER_LON = 175.828480866816477;

const ROAD_WIDTH = 20; // Define a consistent width for roads

export const Roads = () => {
  const [roadFeatures, setRoadFeatures] = useState<any[]>([]);

  useEffect(() => {
    const fetchRoadData = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}wellington_roads.geojson`);
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
    
    const positions: number[] = [];
    const indices: number[] = [];
    let vertexCount = 0;

    roadFeatures.forEach((feature: any) => {
        if (!feature.geometry) return;
        
        const type = feature.geometry.type;
        const coords = feature.geometry.coordinates;

        const processLineString = (points: number[][]) => {
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i+1];
                
                const pos1 = new THREE.Vector3();
                const pos2 = new THREE.Vector3();

                // Convert Lat/Lon to Meters for 3D coordinates
                const meterPos1 = latLonToMeters(p1[1], p1[0], CENTER_LAT, CENTER_LON);
                const meterPos2 = latLonToMeters(p2[1], p2[0], CENTER_LAT, CENTER_LON);

                pos1.set(meterPos1.x, 0.1, meterPos1.z); // Y-position slightly above ground
                pos2.set(meterPos2.x, 0.1, meterPos2.z);

                // Calculate direction and perpendicular vectors
                const dir = new THREE.Vector3().subVectors(pos2, pos1);
                const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(ROAD_WIDTH / 2);

                // Define 4 vertices for the road segment
                const v0 = new THREE.Vector3().subVectors(pos1, perp);
                const v1 = new THREE.Vector3().addVectors(pos1, perp);
                const v2 = new THREE.Vector3().subVectors(pos2, perp);
                const v3 = new THREE.Vector3().addVectors(pos2, perp);

                positions.push(v0.x, v0.y, v0.z);
                positions.push(v1.x, v1.y, v1.z);
                positions.push(v2.x, v2.y, v2.z);
                positions.push(v3.x, v3.y, v3.z);

                // Add indices for two triangles (forming a quad)
                indices.push(vertexCount + 0, vertexCount + 1, vertexCount + 2);
                indices.push(vertexCount + 1, vertexCount + 3, vertexCount + 2);
                
                vertexCount += 4;
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
    bufferGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    bufferGeometry.setIndex(indices);
    bufferGeometry.computeVertexNormals(); // Important for correct lighting

    return bufferGeometry;
  }, [roadFeatures]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}> {/* Render as a mesh */}
      <meshStandardMaterial color="#424242" /> {/* Asphalt color */}
    </mesh>
  );
};
