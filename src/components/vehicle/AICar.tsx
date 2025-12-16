import React, { useRef, useMemo, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber'; // Missing import
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem'; // Import PhysicsSystem

interface AICarProps {
    startPos?: [number, number, number]; // Made optional if pathPoints are used
    endPos?: [number, number, number]; // Made optional if pathPoints are used
    speed?: number;
    delay?: number;
    color?: string;
    indicatingLeft?: boolean;
    indicatingRight?: boolean;
    rotation?: [number, number, number]; // Initial rotation, might be overridden by path
    pathPoints?: THREE.Vector3[]; // New prop: array of points to follow
}

export const AICar = React.memo(forwardRef<THREE.Group, AICarProps>(({
    startPos = [0, 0, 0], // Default if not provided by path
    endPos = [0, 0, 0],   // Default if not provided by path
    speed = 5,
    delay = 0,
    color = 'red',
    indicatingLeft = false,
    indicatingRight = false,
    rotation: initialRotation = [0, 0, 0],
    pathPoints // Destructure new prop
}, ref) => {
    const innerRef = useRef<THREE.Group>(null);
    useImperativeHandle(ref, () => innerRef.current!);

    const [blink, setBlink] = useState(false);
    
    const timeElapsed = useRef(0);
    const isDelaying = useRef(true);
    const delayTimer = useRef(0);

    // Dynamic pathing logic
    const currentPathIndex = useRef(0);
    const segmentStartTime = useRef(0); // Time when current segment started

    const { fullPath, totalPathDistance } = useMemo(() => {
        let path: THREE.Vector3[] = [];
        if (pathPoints && pathPoints.length > 1) {
            path = pathPoints;
        } else {
            path = [new THREE.Vector3(...startPos), new THREE.Vector3(...endPos)];
        }

        let distance = 0;
        for (let i = 0; i < path.length - 1; i++) {
            distance += path[i].distanceTo(path[i+1]);
        }
        return { fullPath: path, totalPathDistance: distance };
    }, [pathPoints, startPos, endPos]);

    useEffect(() => {
        const interval = setInterval(() => setBlink((b) => !b), 400); 
        return () => clearInterval(interval);
    }, []);

    // Unique ID for physics system registration
    const physicsObjectId = useRef(`aiCar_${Math.random().toFixed(5)}`);
    // Car dimensions for AABB collision
    const carSize = new THREE.Vector3(2, 1, 4); 

    useEffect(() => {
        if (!innerRef.current) return;

        // Register AI car with PhysicsSystem
        const aiCarPhysicsObject: PhysicsObject = {
            id: physicsObjectId.current,
            position: innerRef.current.position,
            quaternion: innerRef.current.quaternion,
            size: carSize,
            type: 'aiCar',
            onCollide: (_other: PhysicsObject) => {
                // console.log(`AICar collided with ${_other.type}`);
            }
        };
        PhysicsSystem.registerObject(aiCarPhysicsObject);

        // Cleanup: unregister on unmount
        return () => {
            PhysicsSystem.unregisterObject(physicsObjectId.current);
        };
    }, []);

    useFrame((state, delta) => { // Added state as first argument
        if (!innerRef.current || totalPathDistance === 0) return;

        // --- HANDLE DELAY ---
        if (isDelaying.current) {
            delayTimer.current += delta;
            if (delayTimer.current >= delay) {
                isDelaying.current = false;
                segmentStartTime.current = state.clock.getElapsedTime(); // Initialize segment start time
            }
            // Hold at the first point of the path
            innerRef.current.position.copy(fullPath[0]);
            // Set initial rotation if it's explicitly provided
            innerRef.current.quaternion.setFromEuler(new THREE.Euler(...initialRotation));
            return;
        }

        // --- MOVE ALONG PATH ---
        const currentSegmentStart = fullPath[currentPathIndex.current];
        const currentSegmentEnd = fullPath[currentPathIndex.current + 1];

        if (!currentSegmentStart || !currentSegmentEnd) {
            // Reached end of path, loop back to start
            currentPathIndex.current = 0;
            timeElapsed.current = 0;
            segmentStartTime.current = state.clock.getElapsedTime();
            return;
        }

        const segmentDistance = currentSegmentStart.distanceTo(currentSegmentEnd);
        const segmentDuration = segmentDistance / speed;

        const elapsedTimeInSegment = state.clock.getElapsedTime() - segmentStartTime.current;
        let segmentAlpha = Math.min(1, elapsedTimeInSegment / segmentDuration);

        const nextPosition = new THREE.Vector3().lerpVectors(currentSegmentStart, currentSegmentEnd, segmentAlpha);
        
        // --- ORIENTATION (Turning) ---
        const direction = new THREE.Vector3().subVectors(currentSegmentEnd, currentSegmentStart).normalize();
        // const upVector = new THREE.Vector3(0, 1, 0); // Car's "up" direction - Removed as unused
        const quaternion = new THREE.Quaternion();
        // Assume car's forward is -Z in its local space
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction);
        innerRef.current.quaternion.slerp(quaternion, 0.1); // Smooth rotation

        // Update visual model's position and rotation
        innerRef.current.position.copy(nextPosition);

        // Transition to next segment if current one is finished
        if (segmentAlpha >= 1) {
            currentPathIndex.current++;
            segmentStartTime.current = state.clock.getElapsedTime(); // Reset segment start time
            if (currentPathIndex.current >= fullPath.length - 1) {
                // Loop behavior: reset to start or stop
                currentPathIndex.current = 0; // Loop path
                segmentStartTime.current = state.clock.getElapsedTime(); // Reset for new loop
            }
        }
        
        // Manually update the PhysicsSystem object's position and quaternion
        const physicsObject = PhysicsSystem.getObject(physicsObjectId.current);
        if (physicsObject) {
            physicsObject.position.copy(innerRef.current.position);
            physicsObject.quaternion.copy(innerRef.current.quaternion);
        }
    });

    return (
        <group 
            ref={innerRef}
            position={fullPath[0].toArray()} 
            rotation={initialRotation} // Initial rotation only, will be overwritten by useFrame
            userData={{ type: 'aiCar' }} 
        >
            {/* The visual model of the car */}
            <mesh position={[0, 0.5, 0]} castShadow>
                <boxGeometry args={[2, 1, 4]} />
                <meshStandardMaterial color={color} />
            </mesh>

            <group>
                <mesh position={[-1.1, 0.25, 1.2]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                <mesh position={[1.1, 0.25, 1.2]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                <mesh position={[-1.1, 0.25, -1.2]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                <mesh position={[1.1, 0.25, -1.2]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                    <meshStandardMaterial color="black" />
                </mesh>
            </group>

            <mesh position={[0, 0.9, -0.5]}>
                <boxGeometry args={[1.8, 0.6, 1.5]} />
                <meshStandardMaterial color="#87CEEB" transparent opacity={0.7} />
            </mesh>

            <group>
                <mesh position={[-0.9, 0.5, -2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial
                        color={indicatingLeft && blink ? "#FFAA00" : "#333"}
                        emissive={indicatingLeft && blink ? "#FFAA00" : "#000"}
                        emissiveIntensity={2}
                    />
                </mesh>
                <mesh position={[-0.9, 0.5, 2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial
                        color={indicatingLeft && blink ? "#FFAA00" : "#333"}
                        emissive={indicatingLeft && blink ? "#FFAA00" : "#000"}
                        emissiveIntensity={2}
                    />
                </mesh>
                <mesh position={[0.9, 0.5, -2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial
                        color={indicatingRight && blink ? "#FFAA00" : "#333"}
                        emissive={indicatingRight && blink ? "#FFAA00" : "#000"}
                        emissiveIntensity={2}
                    />
                </mesh>
                <mesh position={[0.9, 0.5, 2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial
                        color={indicatingRight && blink ? "#FFAA00" : "#333"}
                        emissive={indicatingRight && blink ? "#FFAA00" : "#000"}
                        emissiveIntensity={2}
                    />
                </mesh>
            </group>
        </group>
    );
}));