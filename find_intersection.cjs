
const fs = require('fs');

const geojsonPath = 'src/assets/wellington_roads.geojson';
const rawData = fs.readFileSync(geojsonPath);
const roads = JSON.parse(rawData);

function getCoordinates(feature) {
    if (feature.geometry.type === 'LineString') {
        return [feature.geometry.coordinates];
    } else if (feature.geometry.type === 'MultiLineString') {
        return feature.geometry.coordinates;
    }
    return [];
}

const humberStFeatures = roads.features.filter(f => f.properties.name && f.properties.name.includes('Humber St'));
const theParadeFeatures = roads.features.filter(f => f.properties.name && f.properties.name.includes('The Parade'));

console.log(`Found ${humberStFeatures.length} Humber St features.`);
console.log(`Found ${theParadeFeatures.length} The Parade features.`);

let intersection = null;
let minDistance = Infinity;
let closestPoints = null;

// Helper to flatten coordinates
const getPoints = (features) => {
    const points = [];
    features.forEach(f => {
        const segments = getCoordinates(f);
        segments.forEach(segment => {
            segment.forEach(coord => {
                points.push(coord);
            });
        });
    });
    return points;
};

const humberPoints = getPoints(humberStFeatures);
const paradePoints = getPoints(theParadeFeatures);

// Simple exact match check
for (const p1 of humberPoints) {
    for (const p2 of paradePoints) {
        // Check for exact match or very close proximity
        const dist = Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
        if (dist < 0.0000001) { // Floating point tolerance
            intersection = p1;
            break;
        }
        if (dist < minDistance) {
            minDistance = dist;
            closestPoints = p1;
        }
    }
    if (intersection) break;
}

if (intersection) {
    console.log(`Intersection found at: ${intersection[0]}, ${intersection[1]}`);
} else {
    console.log('No exact intersection found.');
    if (closestPoints) {
        console.log(`Closest point on Humber St to The Parade is at: ${closestPoints[0]}, ${closestPoints[1]} with distance ${minDistance}`);
    }
}
