import React, { useRef, useMemo, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber'; 
import { type PhysicsObject, PhysicsSystem } from '../../physics/PhysicsSystem'; 

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

    const physicsObjectId = useRef(`aiCar_${Math.random().toFixed(5)}`);
    const carSize = new THREE.Vector3(2, 1, 4); 

    useEffect(() => {
        if (!innerRef.current) return;

        const aiCarPhysicsObject: PhysicsObject = {
            id: physicsObjectId.current,
            position: innerRef.current.position,
            quaternion: innerRef.current.quaternion,
            size: carSize,
            type: 'aiCar',
            onCollide: (_other: PhysicsObject) => {}
        };
        PhysicsSystem.registerObject(aiCarPhysicsObject);

        return () => {
            PhysicsSystem.unregisterObject(physicsObjectId.current);
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

        const nextPosition = new THREE.Vector3().lerpVectors(currentSegmentStart, currentSegmentEnd, segmentAlpha);
        
        const direction = new THREE.Vector3().subVectors(currentSegmentEnd, currentSegmentStart).normalize();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction);
        innerRef.current.quaternion.slerp(quaternion, 0.1); 

        // --- INDICATOR LOGIC ---
        // Look ahead 2 segments to predict turn
        const lookAheadIdx = idx + 2; 
        let nextLeft = false;
        let nextRight = false;

        if (lookAheadIdx < fullPath.length) {
            const nextP1 = fullPath[idx + 1];
            const nextP2 = fullPath[lookAheadIdx];
            const futureDir = new THREE.Vector3().subVectors(nextP2, nextP1).normalize();

            // Check angle
            // Dot product: 1 = straight, 0 = 90deg
            const dot = direction.dot(futureDir);
            
            // If turn is sharp enough (< 0.95 roughly 18 degrees)
            if (dot < 0.95) {
                // Cross product Y component tells us left vs right
                // car forward is (0,0,-1) roughly? No, we used direction.
                // Cross(currentDir, futureDir)
                // If Y > 0, Left turn (in standard 3D? Let's verify).
                // X=1 (Right), Z=0. Next Z=-1 (Up). Cross(Right, Up) = (0, -1, 0)?
                // Let's stick to standard Y-up.
                // Left is usually positive Y in cross product of (Forward, NewForward).
                const crossY = direction.x * futureDir.z - direction.z * futureDir.x;
                // Actually 2D cross product scalar.
                // If we are looking -Z. Left is -X.
                // Let's test: Current (0,0,-1). Turn Left (-1,0,0).
                // crossY = 0*0 - (-1)*(-1) = -1. 
                // So Y < 0 is Left?
                // Turn Right (1,0,0).
                // crossY = 0*0 - (-1)*1 = 1.
                // So Y > 0 is Right?
                
                // Correction: In standard coords (Right-handed):
                // X x Z = -Y.
                // Let's just assume and flip if wrong. Usually Y>0 is Left in map logic if Y is Up.
                // Wait, latLonToMeters: x=lon, z=-lat. 
                // North is -Z. East is +X.
                // Forward -Z. Turn Left -> West -> -X.
                // Current(0,0,-1). Next(-1,0,0).
                // Cross = (0)(-1) - (0)(-1) ... wait x1*z2 - z1*x2
                // (0)(0) - (-1)(-1) = -1.
                // So Negative is Left. Positive is Right.
                
                if (crossY < -0.1) nextLeft = true;
                if (crossY > 0.1) nextRight = true;
            }
        }

        if (nextLeft !== autoIndicating.left || nextRight !== autoIndicating.right) {
            setAutoIndicating({ left: nextLeft, right: nextRight });
        }

        innerRef.current.position.copy(nextPosition);

        if (segmentAlpha >= 1) {
            currentPathIndex.current++;
            segmentStartTime.current = state.clock.getElapsedTime(); 
            if (currentPathIndex.current >= fullPath.length - 1) {
                currentPathIndex.current = 0; 
                segmentStartTime.current = state.clock.getElapsedTime(); 
            }
        }
        
        const physicsObject = PhysicsSystem.getObject(physicsObjectId.current);
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