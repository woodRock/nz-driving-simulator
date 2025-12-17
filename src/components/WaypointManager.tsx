import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

// Client-side cache for Nominatim search results
const searchCache = new Map<string, any[]>();

export const WaypointManager: React.FC = () => {
    const { addWaypoint, removeWaypoint, waypoints } = useGameStore();
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!address.trim() || loading) return;

        // Check cache first
        const cachedResult = searchCache.get(address.trim().toLowerCase());
        if (cachedResult) {
            processResult(cachedResult);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Use Nominatim API to geocode address
            // Bounding box for Wellington Region roughly
            const viewbox = '174.6,-41.2,175.0,-41.4';
            // Compliance: Add email parameter for identification
            const email = 'woodrock.github.io@example.com'; 
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&viewbox=${viewbox}&bounded=1&addressdetails=1&email=${email}`;
            
            const response = await fetch(url);

            if (!response.ok) throw new Error('Search failed');
            
            const data = await response.json();
            searchCache.set(address.trim().toLowerCase(), data); // Store in cache

            processResult(data);
        } catch (e) {
            console.error(e);
            setError('Failed to fetch coordinates.');
        } finally {
            // Enforce 1-second delay to respect Nominatim policy (max 1 req/sec)
            setTimeout(() => {
                setLoading(false);
            }, 1000);
        }
    };

    const processResult = (data: any[]) => {
        if (data && data.length > 0) {
            const result = data[0];
            
            // Determine the best name to display
            let displayName = result.name || result.display_name.split(',')[0]; // Default to place name or first part of display name

            // If address details are available, try to format as "Number Street" if it's a specific address
            if (result.address) {
                const { road, house_number } = result.address;
                if (road && house_number) {
                    displayName = `${house_number} ${road}`;
                } else if (road) {
                    displayName = road;
                }
                // If the user searched for a specific place (e.g., "Te Papa"), result.name usually holds that. 
                // If result.name is empty, we fall back to address. 
                // However, we want to prioritize the specific place name if it exists and isn't just the road name.
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
