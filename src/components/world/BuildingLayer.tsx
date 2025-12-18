import React, { useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useGameStore } from '../../store/gameStore';
import { metersToLatLon, MAP_CENTER_LAT, MAP_CENTER_LON, latLonToMeters, getChunkId, getChunkIdsAround } from '../../utils/geoUtils';
import { latLonToNZTM, nztmToTile, tileToNZTMBounds, nztmToLatLon } from '../../utils/nztm';
import { TerrainSystem } from '../../systems/TerrainSystem';

const TILE_ZOOM = 17;
const LOAD_RADIUS = 1; 

export const BuildingLayer: React.FC = () => {
    const loadedTiles = useRef<Set<string>>(new Set());
    const buildingData = useRef<Map<string, any[]>>(new Map()); // ChunkID -> Features
    const [chunksToRender, setChunksToRender] = useState<string[]>([]);
    const lastTileRef = useRef<{ col: number, row: number } | null>(null);

    useFrame(() => {
        const { x, z } = useGameStore.getState().telemetry.position;
        const { lat, lon } = metersToLatLon(x, z, MAP_CENTER_LAT, MAP_CENTER_LON);
        const { e, n } = latLonToNZTM(lat, lon);
        const centerTile = nztmToTile(e, n, TILE_ZOOM);

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
            
            newTiles.forEach(tile => {
                if (!loadedTiles.current.has(tile.key)) {
                    loadTileBuildings(tile.col, tile.row, tile.key);
                }
            });

            // Update visible chunks (using the same chunking as roads for consistency)
            const chunkIds = getChunkIdsAround(x, z, 3); // 3 chunk radius for buildings
            setChunksToRender(chunkIds);
        }
    });

    const loadTileBuildings = async (col: number, row: number, key: string) => {
        loadedTiles.current.add(key);
        const bounds = tileToNZTMBounds(col, row, TILE_ZOOM);
        const sw = nztmToLatLon(bounds.left, bounds.bottom);
        const ne = nztmToLatLon(bounds.right, bounds.top);

        const url = `https://gis.wcc.govt.nz/arcgis/rest/services/PropertyAndBoundaries/BuildingFootprints/MapServer/0/query?` +
            `geometry=${sw.lon},${sw.lat},${ne.lon},${ne.lat}&` +
            `geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&inSR=4326&outSR=4326&outFields=*&f=geojson`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.features) {
                data.features.forEach((f: any) => {
                    const coords = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0][0] : f.geometry.coordinates[0][0][0];
                    const { x, z } = latLonToMeters(coords[1], coords[0]);
                    const cid = getChunkId(x, z);
                    
                    if (!buildingData.current.has(cid)) buildingData.current.set(cid, []);
                    const existing = buildingData.current.get(cid)!;
                    if (!existing.find(e => e.properties.Building_Spatial_ID_1 === f.properties.Building_Spatial_ID_1)) {
                        existing.push(f);
                    }
                });
                setChunksToRender(prev => [...prev]); // Trigger re-render
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <group>
            {chunksToRender.map(cid => (
                <BuildingChunk key={cid} features={buildingData.current.get(cid) || []} />
            ))}
        </group>
    );
};

const BuildingChunk = React.memo(({ features }: { features: any[] }) => {
    const [version, setVersion] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const centerRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const [mergedMeshes, setMergedMeshes] = useState<{ geometry: THREE.BufferGeometry, color: string }[] | null>(null);
    const isGenerating = useRef(false);

    useEffect(() => {
        if (features.length > 0) {
            const firstCoord = features[0].geometry.type === 'Polygon' ? features[0].geometry.coordinates[0][0] : features[0].geometry.coordinates[0][0][0];
            const { x, z } = latLonToMeters(firstCoord[1], firstCoord[0]);
            centerRef.current.set(x, 0, z);
        }
    }, [features]);

    useFrame(() => {
        const playerPos = useGameStore.getState().telemetry.position;
        const dist = centerRef.current.distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z));
        setIsVisible(dist < 500);
    });

    useEffect(() => {
        const unsubscribe = TerrainSystem.subscribe(() => {
            setVersion(v => v + 1);
        });
        return () => { unsubscribe(); };
    }, []);

    useEffect(() => {
        if (features.length === 0 || !isVisible || isGenerating.current) return;

        let cancelled = false;
        isGenerating.current = true;

        const generateAsync = async () => {
            const colorGroups: Map<string, THREE.BufferGeometry[]> = new Map();
            const palette = ['#99aabb', '#aabbee', '#8899aa', '#778899', '#aabbcc', '#9999aa'];
            const BATCH_SIZE = 15;
            
            for (let i = 0; i < features.length; i++) {
                if (cancelled) break;

                const f = features[i];
                const { geometry, properties } = f;
                const height = properties.approx_hei || 6;
                const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
                
                const firstCoord = geometry.type === 'Polygon' ? geometry.coordinates[0][0] : geometry.coordinates[0][0][0];
                const { x: bx, z: bz } = latLonToMeters(firstCoord[1], firstCoord[0]);
                const groundY = TerrainSystem.getHeight(bx, bz) || 0;

                const id = properties.Building_Spatial_ID_1 || properties.OBJECTID_1 || Math.random();
                const colorIndex = Math.abs(JSON.stringify(id).split('').reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a;
                }, 0)) % palette.length;
                const color = palette[colorIndex];

                if (!colorGroups.has(color)) colorGroups.set(color, []);
                const group = colorGroups.get(color)!;

                polygons.forEach((poly: number[][][]) => {
                    const shape = new THREE.Shape();
                    const exterior = poly[0];
                    exterior.forEach((coord: number[], idx: number) => {
                        const { x, z } = latLonToMeters(coord[1], coord[0]);
                        if (idx === 0) shape.moveTo(x, -z);
                        else shape.lineTo(x, -z);
                    });

                    for (let h = 1; h < poly.length; h++) {
                        const hole = new THREE.Path();
                        poly[h].forEach((coord: number[], idx: number) => {
                            const { x, z } = latLonToMeters(coord[1], coord[0]);
                            if (idx === 0) hole.moveTo(x, -z);
                            else hole.lineTo(x, -z);
                        });
                        shape.holes.push(hole);
                    }

                    const extrudeSettings = { depth: height, bevelEnabled: false };
                    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                    geom.rotateX(-Math.PI / 2);
                    geom.translate(0, groundY, 0);
                    group.push(geom);
                });

                if (i % BATCH_SIZE === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            if (!cancelled) {
                const results: { geometry: THREE.BufferGeometry, color: string }[] = [];
                colorGroups.forEach((geoms, color) => {
                    if (geoms.length > 0) {
                        const merged = BufferGeometryUtils.mergeGeometries(geoms);
                        results.push({ geometry: merged, color });
                        geoms.forEach(g => g.dispose());
                    }
                });
                setMergedMeshes(results);
            }
            isGenerating.current = false;
        };

        generateAsync();
        return () => { cancelled = true; isGenerating.current = false; };
    }, [features, isVisible, version]);

    if (!isVisible || !mergedMeshes) return null;

    return (
        <group>
            {mergedMeshes.map((m, i) => (
                <mesh key={i} geometry={m.geometry} castShadow receiveShadow>
                    <meshStandardMaterial color={m.color} roughness={0.7} />
                </mesh>
            ))}
        </group>
    );
});