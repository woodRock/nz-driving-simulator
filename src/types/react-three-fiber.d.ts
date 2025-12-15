// src/types/react-three-fiber.d.ts
// This file is intended to augment the JSX namespace to include
// the intrinsic elements provided by @react-three/fiber.
// This is a common workaround when TypeScript struggles to pick them up automatically.

import type * as THREE from 'three'; // For Three.js types
import 'react'; // Necessary for JSX namespace augmentation

// Augment the @react-three/fiber module directly
declare module '@react-three/fiber' {
  // You might need to add specific props interfaces if the defaults aren't enough
  // For basic JSX recognition, merging with `any` or explicit `ThreeElements` usually works
  // interface ThreeElements { ... } is usually what provides these
}

// Also augment the global JSX namespace directly as a fallback
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Core elements
      group: any;
      mesh: any;
      lineSegments: any;
      lineBasicMaterial: any;

      // Lights
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      spotLight: any;

      // Geometries
      boxGeometry: any;
      sphereGeometry: any;
      planeGeometry: any;
      cylinderGeometry: any;
      ringGeometry: any;

      // Materials
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      // Primitive is usually handled by ThreeElements already, but can be added if needed
      primitive: any;
    }
  }
}
