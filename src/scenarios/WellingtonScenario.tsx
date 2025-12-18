import React, { useEffect, useState } from 'react';
import { Roads } from '../components/Roads';
import { Car } from '../components/vehicle/Car';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';
import { type PhysicsObject, PhysicsSystem } from '../physics/PhysicsSystem';
import { latLonToMeters, MAP_CENTER_LAT, MAP_CENTER_LON } from '../utils/geoUtils';
import { StreetSigns } from '../components/world/StreetSigns';
import { MapLayer } from '../components/world/MapLayer';
import { OnlineSatelliteLayer } from '../components/world/OnlineSatelliteLayer';
import { BuildingLayer } from '../components/world/BuildingLayer';
import { TrafficSystem } from '../components/world/TrafficSystem';
import { WaypointMarker } from '../components/world/WaypointMarker';
import { RoadSystem } from '../systems/RoadSystem';

export const WellingtonScenario: React.FC = () => {
  const { setMessage, setScore, failLevel, mapType, waypoints } = useGameStore();
  const [features, setFeatures] = useState<any[]>([]);

  // Define spawn and center coordinates
  const spawnLat = -41.341425;
  const spawnLon = 174.772200;

  // Convert spawn Lat/Lon to Meters
  const { x: spawnX, z: spawnZ } = latLonToMeters(spawnLat, spawnLon, MAP_CENTER_LAT, MAP_CENTER_LON);

  // Unique ID for physics system registration for the grass (ground)
  const [grassPhysicsObjectId] = useState(() => `grass_${Math.random().toFixed(5)}`);
  // Grass dimensions for AABB collision
  const grassSize = new THREE.Vector3(100000, 1, 100000); 
  const grassPosition = new THREE.Vector3(0, -1.0, 0); // Lowered slightly to be under map/roads

  useEffect(() => {
    // Ensure level is playing on mount (fixes stuck car if previous state was failed)
    useGameStore.setState({ levelStatus: 'playing' });
    setMessage('Welcome to Wellington! Drive around. (Roads are visual guides only)');
    setScore(0);
    
    // Initial road data
    const fetchRoadData = async () => {
        try {
          const response = await fetch(`${import.meta.env.BASE_URL}wellington_roads.geojson`);
          if (!response.ok) throw new Error('Failed to fetch roads');
          const data = await response.json();
          setFeatures(data.features);
          RoadSystem.init(data.features);
        } catch (e) {
            console.error(e);
        }
    };
    fetchRoadData();
  }, [setMessage, setScore]);

  useEffect(() => {
    // Register ground with PhysicsSystem
    const grassPhysicsObject: PhysicsObject = {
        id: grassPhysicsObjectId,
        position: grassPosition,
        quaternion: new THREE.Quaternion(),
        size: grassSize,
        type: 'grass',
        onCollide: (other: PhysicsObject) => {
            if (other.type === 'playerCar') {
                console.log('Player drove off road!');
            }
        }
    };
    PhysicsSystem.registerObject(grassPhysicsObject);

    return () => {
        PhysicsSystem.unregisterObject(grassPhysicsObjectId);
    };
  }, [failLevel]);


  return (
    <group>
      {/* Map Layer (Satellite or OSM) */}
      {mapType === 'satellite' ? <OnlineSatelliteLayer /> : <MapLayer />}

      {/* Buildings Layer */}
      <BuildingLayer />

      {/* Roads Visuals */}
      <Roads features={features} />
      
      {/* Street Signs */}
      <StreetSigns features={features} />

      {/* AI Traffic */}
      <TrafficSystem features={features} />

      {/* Waypoints */}
      {waypoints.map(w => <WaypointMarker key={w.id} waypoint={w} />)}

      {/* Player Car */}
      <Car position={[spawnX, 1, spawnZ]} rotation={[0, 0, 0]} /> 
    </group>
  );
};