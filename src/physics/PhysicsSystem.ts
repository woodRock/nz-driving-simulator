import * as THREE from 'three';

// Interface for objects participating in our custom physics system
export interface PhysicsObject {
    id: string; // Unique identifier for the object
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    size: THREE.Vector3; // Dimensions for simple AABB collision (e.g., car body size)
    type: string; // e.g., 'playerCar', 'aiCar', 'pedestrian', 'road', 'sign'
    onCollide?: (other: PhysicsObject) => void; // Callback for collision events
}

// Simple AABB (Axis-Aligned Bounding Box) collision detection
const checkAABBCollision = (obj1: PhysicsObject, obj2: PhysicsObject): boolean => {
    const min1 = obj1.position.clone().sub(obj1.size.clone().multiplyScalar(0.5));
    const max1 = obj1.position.clone().add(obj1.size.clone().multiplyScalar(0.5));
    const min2 = obj2.position.clone().sub(obj2.size.clone().multiplyScalar(0.5));
    const max2 = obj2.position.clone().add(obj2.size.clone().multiplyScalar(0.5));

    return (
        max1.x > min2.x &&
        min1.x < max2.x &&
        max1.y > min2.y && // Basic Y-axis check for objects on ground
        min1.y < max2.y &&
        max1.z > min2.z &&
        min1.z < max2.z
    );
};

// Physics System using a React Context or Zustand store
// For simplicity, we'll implement it as a singleton manager for now.
class PhysicsSystemManager {
    private objects: Map<string, PhysicsObject> = new Map();

    registerObject(obj: PhysicsObject) {
        this.objects.set(obj.id, obj);
    }

    unregisterObject(id: string) {
        this.objects.delete(id);
    }

    getObject(id: string): PhysicsObject | undefined {
        return this.objects.get(id);
    }

    // This method will be called every frame (e.g., from useFrame in App.tsx)
    update(delta: number) {
        // Broad-phase: Simple iteration for now, optimize later if needed
        this.objects.forEach((obj1) => {
            this.objects.forEach((obj2) => {
                if (obj1.id === obj2.id) return; // Don't check self-collision

                // Narrow-phase: AABB check
                if (checkAABBCollision(obj1, obj2)) {
                    // Trigger collision callbacks
                    obj1.onCollide?.(obj2);
                    obj2.onCollide?.(obj1); // Call for both objects
                }
            });
        });
    }

    // Query methods for scenarios (e.g., find nearby objects)
    queryObjectsInArea(min: THREE.Vector3, max: THREE.Vector3, excludeId?: string): PhysicsObject[] {
        const results: PhysicsObject[] = [];
        this.objects.forEach(obj => {
            if (obj.id === excludeId) return;

            const objMin = obj.position.clone().sub(obj.size.clone().multiplyScalar(0.5));
            const objMax = obj.position.clone().add(obj.size.clone().multiplyScalar(0.5));

            if (
                objMax.x > min.x &&
                objMin.x < max.x &&
                objMax.y > min.y &&
                objMin.y < max.y &&
                objMax.z > min.z &&
                objMin.z < max.z
            ) {
                results.push(obj);
            }
        });
        return results;
    }
}

// Export a singleton instance
export const PhysicsSystem = new PhysicsSystemManager();
