import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { latLonToMeters, metersToLatLon, MAP_CENTER_LAT, MAP_CENTER_LON } from '../../utils/geoUtils';
import { RoadGraph } from '../../utils/RoadGraph';
import { Pathfinding } from '../../utils/pathfinding';
import * as THREE from 'three';

// Constants for OSM Tile Calculation
const TILE_SIZE = 256;
const ZOOM = 15; // Minimap zoom level

function long2tile(lon: number, zoom: number) {
    return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
}

function lat2tile(lat: number, zoom: number) {
    return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
}

// Global Graph Instance (Lazy loaded)
let roadGraph: RoadGraph | null = null;
let pathfinder: Pathfinding | null = null;

// Tile Cache to prevent 429s
const tileCache = new Map<string, HTMLImageElement>();

export const Minimap: React.FC = () => {
    const { telemetry, waypoints } = useGameStore();
    const [path, setPath] = useState<THREE.Vector3[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // We strictly use refs for rendering state to avoid React render loop overhead for the canvas
    const mapState = useRef({ lat: MAP_CENTER_LAT, lon: MAP_CENTER_LON, x: 0, z: 0 });

    // Force re-render for tile loading
    const [, setTick] = useState(0);

    // Load Road Graph
    useEffect(() => {
        if (!roadGraph) {
            fetch(`${import.meta.env.BASE_URL}wellington_roads.geojson`)
                .then(res => res.json())
                .then(data => {
                    roadGraph = new RoadGraph(data.features);
                    pathfinder = new Pathfinding(roadGraph);
                    console.log("Road Graph Loaded for Minimap");
                });
        }
    }, []);

    // Update Path (Throttled)
    useEffect(() => {
        if (!pathfinder || waypoints.length === 0) {
            setPath([]);
            return;
        }

        const timeout = setTimeout(() => {
            const target = waypoints[waypoints.length - 1]; 
            const startPos = { x: telemetry.position.x, z: telemetry.position.z };
            const endPosLatLon = latLonToMeters(target.lat, target.lon, MAP_CENTER_LAT, MAP_CENTER_LON);
            const endPos = { x: endPosLatLon.x, z: endPosLatLon.z };

            if(pathfinder) {
                const calculatedPath = pathfinder.findPath(startPos, endPos);
                setPath(calculatedPath);
            }
        }, 500); // 500ms debounce for pathfinding

        return () => clearTimeout(timeout);
    }, [telemetry.position.x, telemetry.position.z, waypoints.length]); 

    // Main Render Loop
    useEffect(() => {
        let animationFrameId: number;

        const render = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const width = canvas.width;
            const height = canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;

            // Sync state
            const { x, z } = useGameStore.getState().telemetry.position;
            const { lat, lon } = metersToLatLon(x, z, MAP_CENTER_LAT, MAP_CENTER_LON);
            mapState.current = { lat, lon, x, z };

            // Clear
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, width, height);

            // 1. Draw OSM Tiles
            const centerTileX = long2tile(lon, ZOOM);
            const centerTileY = lat2tile(lat, ZOOM);

            // Load 3x3 grid around center
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const tx = centerTileX + dx;
                    const ty = centerTileY + dy;
                    const key = `${ZOOM}/${tx}/${ty}`;

                    let img = tileCache.get(key);

                    if (!img) {
                        img = new Image();
                        img.crossOrigin = "Anonymous";
                        img.src = `https://tile.openstreetmap.org/${ZOOM}/${tx}/${ty}.png`;
                        tileCache.set(key, img);
                        
                        img.onload = () => {
                            // Trigger re-render when image loads
                            setTick(t => t + 1);
                        };
                    }

                    if (img.complete && img.naturalWidth > 0) {
                        // Calculate offset
                        const n = Math.pow(2, ZOOM);
                        const playerTileX = (lon + 180) / 360 * n;
                        const latRad = lat * Math.PI / 180;
                        const playerTileY = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

                        const offsetX = (tx - playerTileX) * TILE_SIZE;
                        const offsetY = (ty - playerTileY) * TILE_SIZE;

                        ctx.drawImage(img, centerX + offsetX, centerY + offsetY, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
            
            drawOverlay(ctx, centerX, centerY, lat);
            animationFrameId = requestAnimationFrame(render);
        };

        const drawOverlay = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, currentLat: number) => {
            // Approx resolution: 156543.03 * cos(lat) / 2^zoom
            const resolution = 156543.03 * Math.cos(currentLat * Math.PI / 180) / Math.pow(2, ZOOM);
            
            // 2. Draw Path
            if (path.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = 'blue';
                ctx.lineWidth = 4;

                const { x: playerX, z: playerZ } = mapState.current;

                path.forEach((point, i) => {
                    const dxMeters = point.x - playerX;
                    const dyMeters = point.z - playerZ; // Game Z is South

                    const sx = centerX + dxMeters / resolution;
                    const sy = centerY + dyMeters / resolution;

                    if (i === 0) ctx.moveTo(sx, sy);
                    else ctx.lineTo(sx, sy);
                });
                ctx.stroke();
            }

            // 3. Draw Player Arrow
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [path]); // Re-start loop if path object changes (rare)

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            width: '250px',
            height: '250px',
            border: '4px solid white',
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            zIndex: 100,
            background: '#222'
        }}>
            <canvas ref={canvasRef} width={250} height={250} />
        </div>
    );
};