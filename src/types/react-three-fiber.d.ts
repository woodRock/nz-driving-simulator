// src/types/react-three-fiber.d.ts
// This file is intended to augment the JSX namespace to include
// the intrinsic elements provided by @react-three/fiber.
// This is a common workaround when TypeScript struggles to pick them up automatically.

import type * as THREE from 'three'; // For Three.js types
import 'react'; // Necessary for JSX namespace augmentation
import { ThreeElements } from '@react-three/fiber'

declare global {
  namespace React {
    namespace JSX {
        interface IntrinsicElements extends ThreeElements {
        }
    }
  }
}