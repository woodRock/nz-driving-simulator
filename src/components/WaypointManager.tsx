import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

// Client-side cache for Nominatim search results
const searchCache = new Map<string, any>();

export const WaypointManager: React.FC = () => {
    const { addWaypoint, removeWaypoint, waypoints } = useGameStore();
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!address.trim() || loading) return;

        // Check cache first
        const cachedData = searchCache.get(address.trim().toLowerCase());
        if (cachedData) {
            // Check if it's Photon (FeatureCollection object) or Nominatim (Array)
            if (!Array.isArray(cachedData) && cachedData.features) {
                processPhotonResult(cachedData);
            } else if (Array.isArray(cachedData)) {
                processNominatimResult(cachedData);
            }
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Attempt 1: Photon API
            const bbox = '174.6,-41.4,175.0,-41.2'; 
            const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&bbox=${bbox}&limit=1`;
            
            const response = await fetch(photonUrl);
            if (!response.ok) throw new Error('Photon failed');
            const data = await response.json();
            
            searchCache.set(address.trim().toLowerCase(), data);
            processPhotonResult(data);

        } catch (photonError) {
            console.warn('Photon API failed, falling back to Nominatim', photonError);
            
            // Attempt 2: Nominatim API (Fallback)
            try {
                const viewbox = '174.6,-41.2,175.0,-41.4';
                const email = 'woodrock_sim@example.com'; // Valid email format
                const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&viewbox=${viewbox}&bounded=1&addressdetails=1&email=${email}`;
                
                const response = await fetch(nominatimUrl);
                if (!response.ok) throw new Error('Nominatim failed');
                const data = await response.json();

                searchCache.set(address.trim().toLowerCase(), data);
                processNominatimResult(data);

            } catch (nominatimError) {
                console.error(nominatimError);
                setError('Failed to fetch coordinates from both providers.');
            }
        } finally {
            // Enforce 1-second delay 
            setTimeout(() => {
                setLoading(false);
            }, 1000);
        }
    };

    const processNominatimResult = (data: any[]) => {
        if (data && data.length > 0) {
            const result = data[0];
            let displayName = result.name || result.display_name.split(',')[0];

            if (result.address) {
                const { road, house_number } = result.address;
                if (road && house_number) {
                    displayName = `${house_number} ${road}`;
                } else if (road) {
                    displayName = road;
                }
                if (result.name && result.name !== road && result.name !== house_number) {
                        displayName = result.name;
                }
            }

            const newWaypoint = {
                id: Math.random().toString(36).substr(2, 9),
                name: displayName,
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon)
            };
            addWaypoint(newWaypoint);
            setAddress('');
        } else {
            setError('No results found for this address in Wellington.');
        }
    };

    const processPhotonResult = (data: any) => {
        if (data && data.features && data.features.length > 0) {
            const feature = data.features[0];
            const props = feature.properties;
            const coords = feature.geometry.coordinates; // [lon, lat]

            // Determine name
            let displayName = props.name;
            
            if (!displayName) {
                if (props.housenumber && props.street) {
                    displayName = `${props.housenumber} ${props.street}`;
                } else if (props.street) {
                    displayName = props.street;
                } else {
                    displayName = props.city || props.suburb || address;
                }
            }

            const newWaypoint = {
                id: Math.random().toString(36).substr(2, 9),
                name: displayName || address,
                lat: coords[1],
                lon: coords[0]
            };
            
            addWaypoint(newWaypoint);
            setAddress('');
        } else {
            setError('No results found for this address in Wellington.');
        }
    };

    return (
        <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '20px',
            borderRadius: '10px',
            color: 'white',
            maxWidth: '400px',
            pointerEvents: 'auto' // Re-enable pointer events inside the overlay
        }}>
            <h3>Waypoint Manager</h3>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter Wellington Address..."
                    style={{ flex: 1, padding: '5px' }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} disabled={loading} style={{ padding: '5px 10px', cursor: 'pointer' }}>
                    {loading ? '...' : 'Add'}
                </button>
            </div>

            {error && <p style={{ color: '#ff6b6b', fontSize: '0.9em' }}>{error}</p>}

            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {waypoints.map(w => (
                    <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '5px', marginBottom: '5px', borderRadius: '4px' }}>
                        <span>{w.name}</span>
                        <button onClick={() => removeWaypoint(w.id)} style={{ background: 'red', border: 'none', color: 'white', cursor: 'pointer', padding: '2px 5px', borderRadius: '3px' }}>
                            X
                        </button>
                    </div>
                ))}
                {waypoints.length === 0 && <p style={{ color: '#aaa', fontSize: '0.9em' }}>No waypoints added.</p>}
            </div>
        </div>
    );
};
