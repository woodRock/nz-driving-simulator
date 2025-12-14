import React from 'react';
import { useGameStore, SCENARIOS } from '../store/gameStore';

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
        goToMenu
    } = useGameStore();
  
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
              Master the New Zealand Road Code through 5 interactive scenarios.
          </p>
          
          <button onClick={startCareer} style={{ margin: '10px', padding: '15px 40px', fontSize: '1.5em', cursor: 'pointer', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>
            Start Career
          </button>
  
          <div style={{ marginTop: '20px' }}>
              <p>Free Roam:</p>
              <button onClick={() => selectScenario('wellington')} style={{ margin: '5px', padding: '10px 20px', fontSize: '1em', cursor: 'pointer' }}>
              Wellington City
              </button>
          </div>
        </div>
      );
    }
  
    // Success Overlay
    if (levelStatus === 'passed') {
        return (
          <div style={{
              position: 'absolute',
              top: 0, left: 0, width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,100,0,0.8)', color: 'white', zIndex: 20
            }}>
              <h1>SCENARIO PASSED!</h1>
              <p>{message}</p>
              <button onClick={nextLevel} style={{ marginTop: '20px', padding: '15px 30px', fontSize: '1.5em', cursor: 'pointer' }}>
                  {currentLevelIndex < SCENARIOS.length - 1 ? 'Next Level' : 'Finish Career'}
              </button>
            </div>
        );
    }
  
    // Failure Overlay
    if (levelStatus === 'failed') {
      return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(100,0,0,0.8)', color: 'white', zIndex: 20
          }}>
            <h1>SCENARIO FAILED</h1>
            <h2 style={{color: '#ffcdd2'}}>{message}</h2>
            <button onClick={retryLevel} style={{ marginTop: '20px', padding: '15px 30px', fontSize: '1.5em', cursor: 'pointer' }}>
                Retry Scenario
            </button>
            <button onClick={goToMenu} style={{ marginTop: '10px', padding: '10px 20px', fontSize: '1em', cursor: 'pointer' }}>
                Quit to Menu
            </button>
          </div>
      );
  }
  
    // In-Game HUD
    return (
      <div style={{
        position: 'absolute',
        top: 0, left: 0, width: '100%',
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
        <div style={{ pointerEvents: 'auto' }}>
          <button onClick={goToMenu} style={{ padding: '10px', cursor: 'pointer' }}>Menu</button>
        </div>
      </div>
    );
  };
