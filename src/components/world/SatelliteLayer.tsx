import React from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';

// Tile Metadata with precise Game World coordinates
// Calculated by projecting Tile Corners (NZTM -> WGS84 -> GameMeters)
// and deriving center, dimensions, and rotation (to correct for Grid Convergence).
const TILES = [
  {
    name: 'BQ31_5000_0507',
    url: 'lds-wellington-02m-rural-aerial-photos-2025-JPEG/BQ31_5000_0507.jpg',
    x: -897.97,
    z: 3500.63,
    width: 1907.60,
    height: 345.67,
    rotation: 0.0204, 
  },
  {
    name: 'BQ31_5000_0508',
    url: 'lds-wellington-02m-rural-aerial-photos-2025-JPEG/BQ31_5000_0508.jpg',
    x: 398.70,
    z: 3474.08,
    width: 686.23,
    height: 345.66,
    rotation: 0.0206, 
  },
  {
    name: 'BQ31_5000_0607',
    url: 'lds-wellington-02m-rural-aerial-photos-2025-JPEG/BQ31_5000_0607.jpg',
    x: -857.86,
    z: 5475.47,
    width: 1907.69,
    height: 3604.84,
    rotation: 0.0204, 
  },
  {
    name: 'BQ31_5000_0608',
    url: 'lds-wellington-02m-rural-aerial-photos-2025-JPEG/BQ31_5000_0608.jpg',
    x: 439.17,
    z: 5448.90,
    width: 686.26,
    height: 3604.81,
    rotation: 0.0206, 
  },
  {
    name: 'BQ31_5000_0707',
    url: 'lds-wellington-02m-rural-aerial-photos-2025-JPEG/BQ31_5000_0707.jpg',
    x: -820.47,
    z: 7316.25,
    width: 1908.64,
    height: 77.50,
    rotation: 0.0204, 
  },
  {
    name: 'BQ31_5000_0708',
    url: 'lds-wellington-02m-rural-aerial-photos-2025-JPEG/BQ31_5000_0708.jpg',
    x: 476.89,
    z: 7289.67,
    width: 686.60,
    height: 77.50,
    rotation: 0.0206, 
  },
];

const SatelliteTile: React.FC<{ tile: typeof TILES[0] }> = ({ tile }) => {
  const texture = useLoader(THREE.TextureLoader, `${import.meta.env.BASE_URL}${tile.url}`);
  
  return (
    <mesh 
      position={[tile.x, -0.6, tile.z]} 
      rotation={[-Math.PI / 2, 0, tile.rotation]} 
      receiveShadow
    >
      <planeGeometry args={[tile.width, tile.height]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
};

export const SatelliteLayer: React.FC = () => {
  return (
    <group>
      {TILES.map((tile) => (
        <SatelliteTile key={tile.name} tile={tile} />
      ))}
    </group>
  );
};
