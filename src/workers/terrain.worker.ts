// Helper to decode Mapbox Terrain-RGB (Must match TerrainTile.tsx)
const decodeHeight = (r: number, g: number, b: number) => {
    return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
};

self.onmessage = async (e) => {
    const { url, segments } = e.data;

    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);

        const width = bitmap.width;
        const height = bitmap.height;

        const offscreen = new OffscreenCanvas(width, height);
        const ctx = offscreen.getContext('2d');

        if (!ctx) {
            throw new Error('Could not get OffscreenCanvas context');
        }

        ctx.drawImage(bitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Create height array
        const heights = new Float32Array((segments + 1) * (segments + 1));

        for (let i = 0; i <= segments; i++) { // y
            for (let j = 0; j <= segments; j++) { // x
                // Map vertex (j, i) to image pixel
                const pixelX = Math.floor((j / segments) * (width - 1));
                const pixelY = Math.floor((i / segments) * (height - 1));

                const idx = (pixelY * width + pixelX) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                heights[i * (segments + 1) + j] = decodeHeight(r, g, b);
            }
        }

        // Send back the Float32Array (Transferable)
        (self as DedicatedWorkerGlobalScope).postMessage({ heights }, [heights.buffer]);

    } catch (error) {
        console.error('Terrain Worker Error:', error);
        // Fallback or error handling
        (self as DedicatedWorkerGlobalScope).postMessage({ error: (error as Error).message });
    }
};
