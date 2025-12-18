import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { metersToLatLon, MAP_CENTER_LAT, MAP_CENTER_LON, latLonToMeters } from '../../utils/geoUtils';
import { latLonToNZTM, nztmToTile, tileToNZTMBounds, nztmToLatLon } from '../../utils/nztm';
import { TerrainSystem } from '../../systems/TerrainSystem';

const ZOOM_LEVEL = 17;
const LOAD_RADIUS = 1; // Radius in tiles to load around player

export const BuildingLayer: React.FC = () => {
    const [tiles, setTiles] = useState<{ col: number, row: number, key: string }[]>([]);
    const loadedTiles = useRef<Set<string>>(new Set());
    const [buildingFeatures, setBuildingFeatures] = useState<any[]>([]);
    const lastTileRef = useRef<{ col: number, row: number } | null>(null);

    useFrame(() => {
        const { x, z } = useGameStore.getState().telemetry.position;
        const { lat, lon } = metersToLatLon(x, z, MAP_CENTER_LAT, MAP_CENTER_LON);
        const { e, n } = latLonToNZTM(lat, lon);
        const centerTile = nztmToTile(e, n, ZOOM_LEVEL);

        if (!lastTileRef.current || lastTileRef.current.col !== centerTile.col || lastTileRef.current.row !== centerTile.row) {
            lastTileRef.current = centerTile;
            
            const newTiles = [];
            for (let dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
                for (let dy = -LOAD_RADIUS; dy <= LOAD_RADIUS; dy++) {
                    const tCol = centerTile.col + dx;
                    const tRow = centerTile.row + dy;
                    const key = `${tCol}-${tRow}`;
                    newTiles.push({ col: tCol, row: tRow, key });
                }
            }
            setTiles(newTiles);
        }
    });

    useEffect(() => {
        tiles.forEach(tile => {
            if (!loadedTiles.current.has(tile.key)) {
                loadTileBuildings(tile.col, tile.row, tile.key);
            }
        });
    }, [tiles]);

    const loadTileBuildings = async (col: number, row: number, key: string) => {
        loadedTiles.current.add(key);
        
        const bounds = tileToNZTMBounds(col, row, ZOOM_LEVEL);
        const sw = nztmToLatLon(bounds.left, bounds.bottom);
        const ne = nztmToLatLon(bounds.right, bounds.top);

        const url = `https://gis.wcc.govt.nz/arcgis/rest/services/PropertyAndBoundaries/BuildingFootprints/MapServer/0/query?` +
            `geometry=${sw.lon},${sw.lat},${ne.lon},${ne.lat}&` +
            `geometryType=esriGeometryEnvelope&` +
            `spatialRel=esriSpatialRelIntersects&` +
            `inSR=4326&` +
            `outSR=4326&` +
            `outFields=*&` +
            `f=geojson`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.features) {
                // Filter out features that might have been loaded by another tile (though ArcGIS query with intersects should be fine)
                // We use Building_Spatial_ID_1 as a unique identifier if possible
                setBuildingFeatures(prev => {
                    const existingIds = new Set(prev.map(f => f.properties.Building_Spatial_ID_1 || f.id));
                    const newFeatures = data.features.filter((f: any) => !existingIds.has(f.properties.Building_Spatial_ID_1 || f.id));
                    return [...prev, ...newFeatures];
                });
            }
        } catch (e) {
            console.error(`Failed to load buildings for tile ${key}`, e);
            // Optionally remove from loadedTiles so it can retry
            // loadedTiles.current.delete(key);
        }
    };

    return (
        <group>
            {buildingFeatures.map((f) => (
                <Building key={f.properties.Building_Spatial_ID_1 || f.id} feature={f} />
            ))}
        </group>
    );
};

const Building = ({ feature }: { feature: any }) => {
    const { geometry, properties } = feature;
    const height = properties.approx_hei || 6;
    const [y, setY] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const centerRef = useRef<THREE.Vector3>(new THREE.Vector3());

    const color = useMemo(() => {
        const id = properties.Building_Spatial_ID_1 || properties.OBJECTID_1 || Math.random();
        const colors = ['#99aabb', '#aabbee', '#8899aa', '#778899', '#aabbcc', '#9999aa'];
        const index = Math.abs(JSON.stringify(id).split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0)) % colors.length;
        return colors[index];
    }, [properties]);

    const meshes = useMemo(() => {
        if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) return [];

        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        
        let sumX = 0, sumZ = 0, totalCount = 0;

        const results = polygons.map((poly: number[][][]) => {
            const shape = new THREE.Shape();
            const exterior = poly[0];
            
            exterior.forEach((coord: number[], i: number) => {
                const { x, z } = latLonToMeters(coord[1], coord[0], MAP_CENTER_LAT, MAP_CENTER_LON);
                if (i === 0) shape.moveTo(x, -z);
                else shape.lineTo(x, -z);
                sumX += x;
                sumZ += z;
                totalCount++;
            });

            // Holes
            for (let h = 1; h < poly.length; h++) {
                const hole = new THREE.Path();
                poly[h].forEach((coord: number[], i: number) => {
                    const { x, z } = latLonToMeters(coord[1], coord[0], MAP_CENTER_LAT, MAP_CENTER_LON);
                    if (i === 0) hole.moveTo(x, -z);
                    else hole.lineTo(x, -z);
                });
                shape.holes.push(hole);
            }

            const extrudeSettings = {
                depth: height,
                bevelEnabled: false,
            };

            const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            geom.rotateX(-Math.PI / 2);
            return geom;
        });

        if (totalCount > 0) {
            centerRef.current.set(sumX / totalCount, 0, sumZ / totalCount);
        }

        return results;
    }, [geometry, height]);

    useFrame(() => {
        const playerPos = useGameStore.getState().telemetry.position;
        const dist = centerRef.current.distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z));
        setIsVisible(dist < 500); // Only render within 500m
    });

    useEffect(() => {
        const initialH = TerrainSystem.getHeight(centerRef.current.x, centerRef.current.z);
        if (initialH !== null) {
            setY(initialH);
        } else {
            const unsubscribe = TerrainSystem.subscribe(() => {
                const h = TerrainSystem.getHeight(centerRef.current.x, centerRef.current.z);
                if (h !== null) {
                    setY(h);
                    unsubscribe();
                }
            });
            return () => {
                unsubscribe();
            };
        }
    }, [geometry]);

    if (!isVisible) return null;

    return (
        <group position={[0, y, 0]}>
            {meshes.map((geom: THREE.ExtrudeGeometry, i: number) => (
                <mesh key={i} geometry={geom} castShadow receiveShadow>
                    <meshStandardMaterial color={color} />
                </mesh>
            ))}
        </group>
    );
};
