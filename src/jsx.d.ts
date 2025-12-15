// src/jsx.d.ts
// This file augments the JSX namespace to include
// the intrinsic elements provided by @react-three/fiber.

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
      primitive: any; // Add primitive as well
    }
  }
}
