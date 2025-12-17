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

export const Minimap: React.FC = () => {
    const { telemetry, waypoints } = useGameStore();
    const [path, setPath] = useState<THREE.Vector3[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mapCenter, setMapCenter] = useState({ lat: MAP_CENTER_LAT, lon: MAP_CENTER_LON });

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

    // Pathfinding Logic
    useEffect(() => {
        if (!pathfinder || waypoints.length === 0) {
            setPath([]);
            return;
        }

        const target = waypoints[waypoints.length - 1]; // Route to last added waypoint
        const startPos = { x: telemetry.position.x, z: telemetry.position.z };
        const endPosLatLon = latLonToMeters(target.lat, target.lon, MAP_CENTER_LAT, MAP_CENTER_LON);
        const endPos = { x: endPosLatLon.x, z: endPosLatLon.z };

        // Run async or in timeout to not block UI
        setTimeout(() => {
            if(pathfinder) {
                const calculatedPath = pathfinder.findPath(startPos, endPos);
                setPath(calculatedPath);
            }
        }, 10);

    }, [telemetry.position.x, telemetry.position.z, waypoints]); // Re-calc when position or waypoints change (debouncing might be needed for pos)

    // Update Map Center periodically or on significant move
    useEffect(() => {
        const { lat, lon } = metersToLatLon(telemetry.position.x, telemetry.position.z, MAP_CENTER_LAT, MAP_CENTER_LON);
        setMapCenter({ lat, lon });
    }, [telemetry.position.x, telemetry.position.z]);

    // Render Minimap
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;

        // Clear
        ctx.fillStyle = '#ddd';
        ctx.fillRect(0, 0, width, height);

        // 1. Draw OSM Tiles
        const centerTileX = long2tile(mapCenter.lon, ZOOM);
        const centerTileY = lat2tile(mapCenter.lat, ZOOM);

        // Load 3x3 grid around center
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const tx = centerTileX + dx;
                const ty = centerTileY + dy;
                
                // Calculate pixel offset from center
                // Tile Top-Left Lat/Lon
                // const tileLon = tile2long(tx, ZOOM);
                // const tileLat = tile2lat(ty, ZOOM);

                // Convert Tile TL to Meters relative to Map Center (0,0 is player effectively for visual, but we use fixed center)
                // Actually, simpler:
                // Calculate relative pixel position of the Tile's Top-Left corner vs the Player's position (Center of Canvas).
                
                // Player Pos in Tile Coordinates (fractional)
                const n = Math.pow(2, ZOOM);
                const playerTileX = (mapCenter.lon + 180) / 360 * n;
                const latRad = mapCenter.lat * Math.PI / 180;
                const playerTileY = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

                const offsetX = (tx - playerTileX) * TILE_SIZE;
                const offsetY = (ty - playerTileY) * TILE_SIZE;

                const img = new Image();
                img.src = `https://tile.openstreetmap.org/${ZOOM}/${tx}/${ty}.png`;
                // Draw immediately if cached, or on load
                // Note: In a real react app, we'd manage tile state better. 
                // For a simple canvas render loop, this causes flicker. 
                // Better to assume loaded or use a pattern cache.
                // Just attempting to draw:
                ctx.drawImage(img, centerX + offsetX, centerY + offsetY, TILE_SIZE, TILE_SIZE);
                // Force redraw on load
                img.onload = () => {
                    ctx.drawImage(img, centerX + offsetX, centerY + offsetY, TILE_SIZE, TILE_SIZE);
                    // Re-draw overlay on top
                    drawOverlay(ctx, centerX, centerY);
                };
            }
        }
        
        drawOverlay(ctx, centerX, centerY);

    }, [mapCenter, path]); // Re-render when center moves or path changes

    const drawOverlay = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
        // We need meters per pixel at this zoom level to draw the path
        // Approx resolution: 156543.03 * cos(lat) / 2^zoom
        const resolution = 156543.03 * Math.cos(mapCenter.lat * Math.PI / 180) / Math.pow(2, ZOOM);
        
        // 2. Draw Path
        if (path.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 4;

            path.forEach((point, i) => {
                // Point is in Game Meters (x, z) relative to MAP_CENTER_LAT/LON
                // We need to convert it to Screen Coordinates relative to Player Position
                
                const dxMeters = point.x - telemetry.position.x;
                const dyMeters = point.z - telemetry.position.z; // Game Z is South (down)

                // Screen X = dxMeters / resolution
                // Screen Y = dyMeters / resolution (Game Z+ is South, Screen Y+ is Down/South. Matches)
                
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
        // Game Yaw: 0 is North? 
        // Typically Car rotation Y.
        // Needs checking Car model orientation.
        // Assuming 0 is -Z (North).
        // Canvas 0 rotation is +X (Right).
        // Rotate -90 deg to make 0 Up?
        // Actually usually standard atan2.
        // Just drawing a circle for now is safer.
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '0px',
            left: '0px',
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
