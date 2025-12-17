import React, { useRef, useMemo, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber'; 
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem'; 
import { TerrainSystem } from '../../systems/TerrainSystem';

interface AICarProps {
    startPos?: [number, number, number]; 
    endPos?: [number, number, number]; 
    speed?: number;
    delay?: number;
    color?: string;
    indicatingLeft?: boolean;
    indicatingRight?: boolean;
    rotation?: [number, number, number]; 
    pathPoints?: THREE.Vector3[]; 
}

export const AICar = React.memo(forwardRef<THREE.Group, AICarProps>(({
    startPos = [0, 0, 0], 
    endPos = [0, 0, 0],   
    speed = 5,
    delay = 0,
    color = 'red',
    indicatingLeft = false,
    indicatingRight = false,
    rotation: initialRotation = [0, 0, 0],
    pathPoints 
}, ref) => {
    const innerRef = useRef<THREE.Group>(null);
    useImperativeHandle(ref, () => innerRef.current!);

    const [blink, setBlink] = useState(false);
    const [autoIndicating, setAutoIndicating] = useState({ left: false, right: false });
    
    const timeElapsed = useRef(0);
    const isDelaying = useRef(true);
    const delayTimer = useRef(0);

    const currentPathIndex = useRef(0);
    const segmentStartTime = useRef(0); 

    // Track Up vector for smooth terrain transitions
    const currentUp = useRef(new THREE.Vector3(0, 1, 0));

    const { fullPath, totalPathDistance } = useMemo(() => {
        let rawPath: THREE.Vector3[] = [];
        if (pathPoints && pathPoints.length > 1) {
            rawPath = pathPoints;
        } else {
            rawPath = [new THREE.Vector3(...startPos), new THREE.Vector3(...endPos)];
        }

        // Curve smoothing
        const curve = new THREE.CatmullRomCurve3(rawPath);
        curve.curveType = 'centripetal';
        
        const length = curve.getLength();
        const divisions = Math.max(2, Math.floor(length / 2)); 
        const smoothedPath = curve.getPoints(divisions);

        let distance = 0;
        for (let i = 0; i < smoothedPath.length - 1; i++) {
            distance += smoothedPath[i].distanceTo(smoothedPath[i+1]);
        }
        return { fullPath: smoothedPath, totalPathDistance: distance };
    }, [pathPoints, startPos, endPos]);

    useEffect(() => {
        const interval = setInterval(() => setBlink((b) => !b), 400); 
        return () => clearInterval(interval);
    }, []);

    const [physicsObjectId] = useState(() => `aiCar_${Math.random().toFixed(5)}`);
    const carSize = new THREE.Vector3(2, 1, 4); 

    useEffect(() => {
        if (!innerRef.current) return;

        const aiCarPhysicsObject: PhysicsObject = {
            id: physicsObjectId,
            position: innerRef.current.position,
            quaternion: innerRef.current.quaternion,
            size: carSize,
            type: 'aiCar',
            onCollide: (_other: PhysicsObject) => {}
        };
        PhysicsSystem.registerObject(aiCarPhysicsObject);

        return () => {
            PhysicsSystem.unregisterObject(physicsObjectId);
        };
    }, []);

    useFrame((state, delta) => { 
        if (!innerRef.current || totalPathDistance === 0) return;

        if (isDelaying.current) {
            delayTimer.current += delta;
            if (delayTimer.current >= delay) {
                isDelaying.current = false;
                segmentStartTime.current = state.clock.getElapsedTime(); 
            }
            innerRef.current.position.copy(fullPath[0]);
            innerRef.current.quaternion.setFromEuler(new THREE.Euler(...initialRotation));
            return;
        }

        const idx = currentPathIndex.current;
        const currentSegmentStart = fullPath[idx];
        const currentSegmentEnd = fullPath[idx + 1];

        if (!currentSegmentStart || !currentSegmentEnd) {
            currentPathIndex.current = 0;
            timeElapsed.current = 0;
            segmentStartTime.current = state.clock.getElapsedTime();
            return;
        }

        const segmentDistance = currentSegmentStart.distanceTo(currentSegmentEnd);
        const segmentDuration = segmentDistance / speed;

        const elapsedTimeInSegment = state.clock.getElapsedTime() - segmentStartTime.current;
        let segmentAlpha = Math.min(1, elapsedTimeInSegment / segmentDuration);

        // Calculate next position for current segment
        const nextPositionFlat = new THREE.Vector3().lerpVectors(currentSegmentStart, currentSegmentEnd, segmentAlpha);
        
        // --- TERRAIN ALIGNMENT ---
        const offsetDist = 2.0;
        
        const centerH = TerrainSystem.getHeight(nextPositionFlat.x, nextPositionFlat.z);

        // Current forward direction (based on path segment)
        const pathDirection = new THREE.Vector3().subVectors(currentSegmentEnd, currentSegmentStart).normalize();
        
        const pForward = nextPositionFlat.clone().add(pathDirection.clone().multiplyScalar(offsetDist));
        const pRight = nextPositionFlat.clone().add(new THREE.Vector3().crossVectors(pathDirection, new THREE.Vector3(0,1,0)).normalize().multiplyScalar(1.0));
        
        const fwdH = TerrainSystem.getHeight(pForward.x, pForward.z);
        const rightH = TerrainSystem.getHeight(pRight.x, pRight.z);
        
        let targetNormal = new THREE.Vector3(0, 1, 0);
        let targetHeight = innerRef.current.position.y;

        if (centerH !== null && fwdH !== null && rightH !== null) {
            targetHeight = centerH + 0.5; // Suspension offset

            const vCenter = new THREE.Vector3(nextPositionFlat.x, centerH, nextPositionFlat.z);
            const vFwd = new THREE.Vector3(pForward.x, fwdH, pForward.z);
            const vRight = new THREE.Vector3(pRight.x, rightH, pRight.z);
            
            const v1 = new THREE.Vector3().subVectors(vFwd, vCenter);
            const v2 = new THREE.Vector3().subVectors(vRight, vCenter);
            
            targetNormal.crossVectors(v1, v2).normalize();
            if (targetNormal.y < 0) targetNormal.negate();
        } else if (centerH !== null) {
            targetHeight = centerH + 0.5;
        }

        // Smoothly interpolate Y
        const yLerpFactor = 10.0 * delta; 
        nextPositionFlat.y = THREE.MathUtils.lerp(innerRef.current.position.y, targetHeight, yLerpFactor);

        // Prevent falling through ground
        if (centerH !== null && nextPositionFlat.y < centerH + 0.3) {
            nextPositionFlat.y = centerH + 0.3;
        }
        
        // Smoothly slerp Up vector for smooth tilt
        currentUp.current.lerp(targetNormal, 5.0 * delta).normalize();

        // Re-orthogonalize to create rotation matrix
        const rightVec = new THREE.Vector3().crossVectors(pathDirection, currentUp.current).normalize();
        const realForward = new THREE.Vector3().crossVectors(currentUp.current, rightVec).normalize();
        
        // Basis: X=Right, Y=Up, Z=Forward. 
        // We want +X to be World Right, +Y to World Up, +Z to World Forward.
        // Since rightVec (calculated as pathDirection x currentUp) is actually a 'Left' vector,
        // we need to negate it to get the World Right vector.
        const rotationMatrix = new THREE.Matrix4().makeBasis(rightVec.negate(), currentUp.current, realForward);
        const targetQuat = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
        const rotation180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        targetQuat.multiply(rotation180); // Apply 180 degree rotation

        innerRef.current.position.copy(nextPositionFlat);
        innerRef.current.quaternion.copy(targetQuat);
        
        // --- INDICATOR LOGIC ---
        // Look ahead by distance (e.g. 20m)
        const lookAheadDist = 20.0; 
        let lookAheadIdx = idx;
        let distAccum = 0;
        
        while(lookAheadIdx < fullPath.length - 2 && distAccum < lookAheadDist) {
            distAccum += fullPath[lookAheadIdx].distanceTo(fullPath[lookAheadIdx+1]);
            lookAheadIdx++;
        }

        if (lookAheadIdx < fullPath.length - 1) {
            const currentDir = pathDirection.clone();
            const pNext = fullPath[lookAheadIdx];
            const pNextNext = fullPath[lookAheadIdx + 1];
            const nextDir = new THREE.Vector3().subVectors(pNextNext, pNext).normalize();
            
            // Calculate signed angle in XZ plane
            const crossY = currentDir.x * nextDir.z - currentDir.z * nextDir.x;
            const dot = currentDir.x * nextDir.x + currentDir.z * nextDir.z;
            const angle = Math.atan2(crossY, dot);
            
            const threshold = 0.3; // ~17 degrees
            
            if (angle > threshold) {
                // Positive crossY (angle) means a Right turn in this coordinate system
                if (!autoIndicating.right) setAutoIndicating({ left: false, right: true });
            } else if (angle < -threshold) {
                // Negative crossY (angle) means a Left turn in this coordinate system
                if (!autoIndicating.left) setAutoIndicating({ left: true, right: false });
            } else {
                // Straight
                if (autoIndicating.left || autoIndicating.right) setAutoIndicating({ left: false, right: false });
            }
        }

        if (segmentAlpha >= 1) {
            currentPathIndex.current++;
            segmentStartTime.current = state.clock.getElapsedTime(); 
            if (currentPathIndex.current >= fullPath.length - 1) {
                currentPathIndex.current = 0; 
                segmentStartTime.current = state.clock.getElapsedTime(); 
            }
        }
        
        const physicsObject = PhysicsSystem.getObject(physicsObjectId);
        if (physicsObject) {
            physicsObject.position.copy(innerRef.current.position);
            physicsObject.quaternion.copy(innerRef.current.quaternion);
        }
    });

    const isLeft = indicatingLeft || autoIndicating.left;
    const isRight = indicatingRight || autoIndicating.right;

    return (
        <group 
            ref={innerRef}
            position={fullPath[0].toArray()} 
            rotation={initialRotation} 
            userData={{ type: 'aiCar' }} 
        >
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
                        color={isLeft && blink ? "#FFAA00" : "#333"}
                        emissive={isLeft && blink ? "#FFAA00" : "#000"}
                        emissiveIntensity={2}
                    />
                </mesh>
                <mesh position={[-0.9, 0.5, 2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial
                        color={isLeft && blink ? "#FFAA00" : "#333"}
                        emissive={isLeft && blink ? "#FFAA00" : "#000"}
                        emissiveIntensity={2}
                    />
                </mesh>
                <mesh position={[0.9, 0.5, -2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial
                        color={isRight && blink ? "#FFAA00" : "#333"}
                        emissive={isRight && blink ? "#FFAA00" : "#000"}
                        emissiveIntensity={2}
                    />
                </mesh>
                <mesh position={[0.9, 0.5, 2.05]}>
                    <boxGeometry args={[0.4, 0.2, 0.1]} />
                    <meshStandardMaterial
                        color={isRight && blink ? "#FFAA00" : "#333"}
                        emissive={isRight && blink ? "#FFAA00" : "#000"}
                        emissiveIntensity={2}
                    />
                </mesh>
            </group>
        </group>
    );
}));