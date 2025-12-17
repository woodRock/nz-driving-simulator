import React, { useEffect, useState } from 'react'; // Import useState
import { useGameStore, SCENARIOS } from '../store/gameStore';
import { WaypointManager } from './WaypointManager';
import { Minimap } from './UI/Minimap';

export const UI: React.FC = () => {
    const {
        currentScenario, 
        levelStatus, 
        currentLevelIndex, 
        message, 
        startCareer,
        nextLevel,
        retryLevel,
        selectScenario,
        goToMenu,
        isPaused,         // Get isPaused state
        togglePause,      // Get togglePause action
        mapType,
        setMapType
    } = useGameStore();

    const [showControls, setShowControls] = useState(false); // New state for controls visibility

    // Keyboard event listener for game controls
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Prevent interference with input fields if any in the future
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (currentScenario === 'menu' || showControls) return; // Don't handle shortcuts in main menu or if controls are open

            switch (event.key) {
                case 'Escape':
                    if (showControls) {
                        setShowControls(false); // Close controls menu if open
                    } else if (isPaused) { // If paused (and controls not open), resume
                        togglePause();
                    } else if (levelStatus === 'playing') { // If playing, pause
                        togglePause();
                    }
                    break;
                case 'Enter':
                    if (levelStatus === 'passed' && !isPaused) { // Only proceed if passed and not paused
                        nextLevel();
                    }
                    break;
                case 'r':
                case 'R':
                    if (levelStatus === 'failed' || (levelStatus === 'playing' && isPaused)) { // Retry if failed or currently playing (from pause)
                        retryLevel();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentScenario, levelStatus, isPaused, showControls, nextLevel, retryLevel, togglePause]); // Dependencies for useEffect
  
    // Main Menu
    if (currentScenario === 'menu') {
      return (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', color: 'white', zIndex: 10
        }}>
          <h1>NZ Driving Simulator</h1>
          <p style={{ maxWidth: '600px', textAlign: 'center', marginBottom: '20px' }}>
              Master the New Zealand Road Code through interactive scenarios.
          </p>
          
          <button onClick={startCareer} style={{ margin: '10px', padding: '15px 40px', fontSize: '1.5em', cursor: 'pointer', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>
            Start Career
          </button>
  
          <div style={{ marginTop: '20px' }}>
              <p>Free Roam:</p>
              <div style={{ marginBottom: '10px' }}>
                  <label htmlFor="mapType" style={{ marginRight: '10px' }}>Map Layer:</label>
                  <select 
                    id="mapType" 
                    value={mapType} 
                    onChange={(e) => setMapType(e.target.value as 'osm' | 'satellite')}
                    style={{ padding: '5px' }}
                  >
                      <option value="satellite">Satellite (Photo)</option>
                      <option value="osm">OpenStreetMap (Standard)</option>
                  </select>
              </div>
              <button onClick={() => selectScenario('wellington')} style={{ margin: '5px', padding: '10px 20px', fontSize: '1em', cursor: 'pointer' }}>
              Wellington City
              </button>
          </div>
        </div>
      );
    } else if (isPaused) { // Pause Overlay
        if (showControls) {
            return (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.8)', color: 'white', zIndex: 30
                }}>
                    <h1>CONTROLS</h1>
                    <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', fontSize: '1.2em' }}>
                        <li style={{ marginBottom: '10px' }}><strong>W:</strong> Accelerate</li>
                        <li style={{ marginBottom: '10px' }}><strong>S:</strong> Brake / Reverse</li>
                        <li style={{ marginBottom: '10px' }}><strong>A:</strong> Steer Left</li>
                        <li style={{ marginBottom: '10px' }}><strong>D:</strong> Steer Right</li>
                        <li style={{ marginBottom: '10px' }}><strong>Q:</strong> Indicate Left</li>
                        <li style={{ marginBottom: '10px' }}><strong>E:</strong> Indicate Right</li>
                        <li style={{ marginBottom: '10px' }}><strong>Esc:</strong> Pause / Resume</li>
                        <li style={{ marginBottom: '10px' }}><strong>Enter:</strong> Next Level (when Passed)</li>
                        <li style={{ marginBottom: '10px' }}><strong>R:</strong> Restart Scenario</li>
                    </ul>
                    <button onClick={() => setShowControls(false)} style={{ margin: '10px', padding: '15px 30px', fontSize: '1.5em', cursor: 'pointer' }}>
                        Back to Pause Menu
                    </button>
                </div>
            );
        }

        return (
            <div style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.8)', color: 'white', zIndex: 30 // Higher zIndex than other overlays
            }}>
                <h1>PAUSED</h1>
                <p>Press 'Esc' to resume, 'R' to restart, or choose an option below.</p>
                
                {/* Map Type Selector in Pause Menu (Only for Wellington Scenario ideally, but okay globally) */}
                {currentScenario === 'wellington' && (
                    <div style={{ margin: '10px' }}>
                        <label htmlFor="pauseMapType" style={{ marginRight: '10px' }}>Map Layer:</label>
                        <select 
                            id="pauseMapType" 
                            value={mapType} 
                            onChange={(e) => setMapType(e.target.value as 'osm' | 'satellite')}
                            style={{ padding: '5px', fontSize: '1em' }}
                        >
                            <option value="satellite">Satellite (Photo)</option>
                            <option value="osm">OpenStreetMap (Standard)</option>
                        </select>
                    </div>
                )}

                {/* Waypoint Manager (Wellington Only) */}
                {currentScenario === 'wellington' && (
                    <div style={{ marginBottom: '20px' }}>
                        <WaypointManager />
                    </div>
                )}

                <button onClick={togglePause} style={{ margin: '10px', padding: '15px 30px', fontSize: '1.5em', cursor: 'pointer' }}>
                    Resume
                </button>
                <button onClick={retryLevel} style={{ margin: '10px', padding: '10px 20px', fontSize: '1em', cursor: 'pointer' }}>
                    Restart Scenario
                </button>
                <button onClick={() => setShowControls(true)} style={{ margin: '10px', padding: '10px 20px', fontSize: '1em', cursor: 'pointer' }}>
                    Controls
                </button>
                <button onClick={goToMenu} style={{ margin: '10px', padding: '10px 20px', fontSize: '1em', cursor: 'pointer' }}>
                    Quit to Menu
                </button>
            </div>
        );
    } else if (levelStatus === 'passed') { // Success Overlay
        return (
          <div style={{
              position: 'absolute',
              top: 0, left: 0, width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,100,0,0.8)', color: 'white', zIndex: 20
            }}>
              <h1>SCENARIO PASSED!</h1>
              <p>{message}</p>
              <p>Press 'Enter' to continue.</p>
              <button onClick={nextLevel} style={{ marginTop: '20px', padding: '15px 30px', fontSize: '1.5em', cursor: 'pointer' }}>
                  {currentLevelIndex < SCENARIOS.length - 1 ? 'Next Level' : 'Finish Career'}
              </button>
            </div>
        );
    } else if (levelStatus === 'failed') { // Failure Overlay
      return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(100,0,0,0.8)', color: 'white', zIndex: 20
          }}>
            <h1>SCENARIO FAILED</h1>
            <h2 style={{color: '#ffcdd2'}}>{message}</h2>
            <p>Press 'R' to retry, or choose an option below.</p>
            <button onClick={retryLevel} style={{ marginTop: '20px', padding: '15px 30px', fontSize: '1.5em', cursor: 'pointer' }}>
                Retry Scenario
            </button>
            <button onClick={goToMenu} style={{ marginTop: '10px', padding: '10px 20px', fontSize: '1em', cursor: 'pointer' }}>
                Quit to Menu
            </button>
          </div>
      );
  } else if (levelStatus === 'playing') { // At this point, currentScenario is definitely ScenarioId
        return (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            padding: '20px',
            boxSizing: 'border-box',
            color: 'white',
            pointerEvents: 'none',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <div>
              {/* Level Indicator */}
              {currentScenario !== 'wellington' && (
                  <h2 style={{ background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '5px' }}>
                      Scenario {currentLevelIndex + 1}/{SCENARIOS.length}: {SCENARIOS[currentLevelIndex]?.title}
                  </h2>
              )}
              <h3 style={{ background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '5px' }}>
                      {message}
                  </h3>
                </div>
                
                {/* Minimap (Wellington Only) */}
                {currentScenario === 'wellington' && <Minimap />}

                <div style={{ pointerEvents: 'auto' }}>
                  <button onClick={togglePause} style={{ padding: '10px', cursor: 'pointer' }}>Pause</button>
                </div>
              </div>
            );
        }
        
        // Fallback or if no UI should be displayed (e.g., during loading, though not explicitly handled here)
        return null;
    };
