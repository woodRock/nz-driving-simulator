import React, { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import { latLonToMeters, MAP_CENTER_LAT, MAP_CENTER_LON } from '../../utils/geoUtils';
import type { Waypoint } from '../../store/gameStore';
import { TerrainSystem } from '../../systems/TerrainSystem';

interface WaypointMarkerProps {
    waypoint: Waypoint;
}

export const WaypointMarker: React.FC<WaypointMarkerProps> = ({ waypoint }) => {
    const { x, z } = latLonToMeters(waypoint.lat, waypoint.lon, MAP_CENTER_LAT, MAP_CENTER_LON);
    const [y, setY] = useState(0);

    useEffect(() => {
        const updateHeight = () => {
            const h = TerrainSystem.getHeight(x, z);
            if (h !== null) setY(h);
        };

        updateHeight(); // Initial check
        
        const unsubscribe = TerrainSystem.subscribe(updateHeight);
        return () => { unsubscribe(); };
    }, [x, z]);

    return (
        <group position={[x, y, z]}>
            {/* Visual Marker (Beacon) */}
            <mesh position={[0, 10, 0]}>
                <cylinderGeometry args={[0.5, 0.5, 20, 8]} />
                <meshStandardMaterial color="red" transparent opacity={0.6} />
            </mesh>
            
            {/* Ground Ring */}
            <mesh position={[0, 0.5, 0]} rotation={[-Math.PI/2, 0, 0]}>
                <ringGeometry args={[2, 3, 16]} />
                <meshBasicMaterial color="red" side={2} />
            </mesh>

            {/* Label */}
            <Html position={[0, 22, 0]} center distanceFactor={100}>
                <div style={{
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '5px 10px',
                    borderRadius: '5px',
                    fontSize: '14px',
                    whiteSpace: 'nowrap'
                }}>
                    {waypoint.name}
                </div>
            </Html>
        </group>
    );
};
