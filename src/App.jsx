import React, { useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import mockData from './mockPipelineResponse.json';
import Chatbot from './Chatbot';
import './App.css';

// Dynamic icon generator based on final_score
const getMarkerIcon = (score) => {
  let color = 'var(--accent-green)'; // high (green)
  if (score < 0.6) color = 'var(--accent-red)'; // low (red)
  else if (score < 0.8) color = 'var(--accent-orange)'; // medium (orange)

  return L.divIcon({
    className: 'custom-marker-icon',
    html: `<div class="custom-marker" style="background-color: ${color};"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const swapPolygonCoords = (polygonCoordinates) => {
  if (!polygonCoordinates || polygonCoordinates.length === 0) return [];
  return polygonCoordinates[0].map(point => [point[1], point[0]]);
};

// Map UI selection to Backend Bounding Box Coordinates
const REGIONS = {
  mumbai: { min_lon: 72.5, min_lat: 18.0, max_lon: 73.5, max_lat: 19.0 },
  chennai: { min_lon: 80.2, min_lat: 13.0, max_lon: 80.5, max_lat: 13.3 },
  kochi: { min_lon: 76.1, min_lat: 9.8, max_lon: 76.3, max_lat: 10.1 }
};

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // UI States
  const [showReachableZones, setShowReachableZones] = useState(false);
  const [date, setDate] = useState('2024-03-15');
  const [regionKey, setRegionKey] = useState('mumbai');
  const [useLiveBackend, setUseLiveBackend] = useState(false); // Demo-Day Safety

  // Chatbot State
  const [activeContext, setActiveContext] = useState(null);
  const [chatHistory, setChatHistory] = useState([
    { sender: 'bot', text: 'Hello! I am your AI assistant. Click or hover on map items or the suspect list to learn more about the analysis.', id: Date.now() }
  ]);

  const handleInteract = (type, itemData) => {
    setActiveContext({ type, data: itemData, timestamp: Date.now() });
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    // DEMO-DAY SAFETY FALLBACK
    // If backend is down or taking too long, this instantly renders local static demo data.
    if (!useLiveBackend) {
      setTimeout(() => {
        if (mockData.status === 'error') {
          setError(mockData.message);
        } else {
          setData(mockData);
        }
        setLoading(false);
      }, 800);
      return;
    }

    // LIVE RENDER BACKEND CALL
    try {
      // NOTE: Update this URL with your exact Render backend URL, or use an environment variable
      const API_URL = import.meta.env.VITE_API_URL || 'https://pro-back-h78m.onrender.com/api/run-pipeline';
      
      const payload = {
        region: REGIONS[regionKey],
        date: date
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'error') {
        setError(result.message || 'The backend pipeline reported an error.');
      } else {
        setData(result);
      }
    } catch (err) {
      setError(`Failed to connect to backend: ${err.message}. Try unchecking "Use Live Backend" to load fallback data.`);
    } finally {
      setLoading(false);
    }
  };

  const center = data ? 
    [data.detection.geometry.centroid.lat, data.detection.geometry.centroid.lon] : 
    [18.43, 72.62]; // Default center

  const getScoreClass = (score) => {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <h2>🌊 Ocean Forensics</h2>
        
        <div className="control-panel">
          <h3>Analysis Parameters</h3>
          
          <div className="control-group">
            <label>Region of Interest</label>
            <select value={regionKey} onChange={e => setRegionKey(e.target.value)}>
              <option value="mumbai">Mumbai Coast (Demo)</option>
              <option value="chennai">Chennai Coast</option>
              <option value="kochi">Kochi Coast</option>
            </select>
          </div>

          <div className="control-group">
            <label>Analysis Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="control-group" style={{flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '10px', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', border: '1px solid var(--accent-blue)'}}>
            <input 
              type="checkbox" 
              checked={useLiveBackend}
              onChange={(e) => setUseLiveBackend(e.target.checked)}
              id="live-backend"
              style={{cursor: 'pointer'}}
            />
            <label htmlFor="live-backend" style={{margin: 0, cursor: 'pointer', color: 'var(--accent-blue)', fontWeight: 'bold'}}>
              Use Live API (Render)
            </label>
          </div>

          <button onClick={runAnalysis} disabled={loading} className="run-btn">
            {loading ? 'Processing Pipeline...' : 'Run Analysis'}
          </button>
          
          <div className="control-group" style={{marginTop: '16px', flexDirection: 'row', alignItems: 'center', gap: '8px', marginBottom: 0}}>
            <input 
              type="checkbox" 
              checked={showReachableZones}
              onChange={(e) => setShowReachableZones(e.target.checked)}
              id="reachable-zones"
              style={{cursor: 'pointer'}}
            />
            <label htmlFor="reachable-zones" style={{margin: 0, cursor: 'pointer', fontSize: '0.9rem'}}>Show Reachable Zones</label>
          </div>
        </div>

        {error && (
          <div className="error-box" style={{backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '16px', borderRadius: '8px', border: '1px solid var(--accent-red)', color: '#fca5a5', marginBottom: '24px'}}>
            <h4 style={{margin: '0 0 8px 0', color: 'var(--accent-red)'}}>Pipeline Error</h4>
            <p style={{margin: 0, fontSize: '0.9rem'}}>{error}</p>
          </div>
        )}

        {data && (
          <div className="results-panel">
            <h3 style={{color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginTop: 0}}>Detection Info</h3>
            <div 
              style={{display: 'flex', justifyContent: 'space-between', marginBottom: '24px', backgroundColor: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', cursor: 'pointer'}}
              onMouseEnter={() => handleInteract('detection', data.detection)}
              onClick={() => handleInteract('detection', data.detection)}
            >
              <div>
                <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px'}}>Confidence</div>
                <div style={{fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-green)'}}>{(data.detection.confidence * 100).toFixed(1)}%</div>
              </div>
              <div style={{textAlign: 'right'}}>
                <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px'}}>Est. Area</div>
                <div style={{fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--text-main)'}}>{data.detection.geometry.area_km2} <span style={{fontSize: '1rem'}}>km²</span></div>
              </div>
            </div>
            
            <h3 style={{color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px'}}>Ranked Suspects</h3>
            <ul className="suspect-list">
              {data.ranked_suspects.map((suspect, idx) => (
                <li 
                  key={suspect.mmsi} 
                  className="suspect-item"
                  style={{cursor: 'pointer'}}
                  onMouseEnter={() => handleInteract('suspect', suspect)}
                  onClick={() => handleInteract('suspect', suspect)}
                >
                  <div className="suspect-header">
                    <strong style={{fontSize: '1.1rem'}}>#{idx + 1} {suspect.vessel_name}</strong>
                    <span className={`score ${getScoreClass(suspect.final_score)}`}>{(suspect.final_score * 100).toFixed(0)}% Match</span>
                  </div>
                  <div className="suspect-details">
                    <div><strong>Type</strong> {suspect.vessel_type}</div>
                    <div><strong>MMSI</strong> {suspect.mmsi}</div>
                    <div><strong>Speed</strong> {suspect.last_known_speed_knots} kts</div>
                    <div><strong>Dark Time</strong> {suspect.went_dark_hours_ago} hrs</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className="map-area">
        <MapContainer center={center} zoom={10} scrollWheelZoom={true} style={{ height: "100%", width: "100%", background: 'var(--bg-dark)' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles"
          />
          
          {data && (
             <>
               <Polygon 
                 positions={swapPolygonCoords(data.detection.polygon.coordinates)} 
                 pathOptions={{ color: 'var(--accent-red)', fillColor: 'var(--accent-red)', fillOpacity: 0.3, weight: 2 }}
                 eventHandlers={{
                   click: () => handleInteract('detection', data.detection),
                   mouseover: () => handleInteract('detection', data.detection)
                 }}
               >
                 <Popup>Spill Detection Area<br/>Confidence: {(data.detection.confidence * 100).toFixed(1)}%</Popup>
               </Polygon>

               <Polygon 
                 positions={swapPolygonCoords(data.hindcast.origin_probability_area.coordinates)} 
                 pathOptions={{ color: 'var(--accent-orange)', fillColor: 'var(--accent-orange)', fillOpacity: 0.25, weight: 2 }}
                 eventHandlers={{
                   click: () => handleInteract('origin', null),
                   mouseover: () => handleInteract('origin', null)
                 }}
               >
                 <Popup>Estimated Origin Probability Area</Popup>
               </Polygon>
               
               <Polygon 
                 positions={swapPolygonCoords(data.hindcast.forward_forecast_path.coordinates)} 
                 pathOptions={{ color: 'var(--accent-purple)', fillColor: 'var(--accent-purple)', fillOpacity: 0.2, dashArray: '6, 6', weight: 2 }}
                 eventHandlers={{
                   click: () => handleInteract('forecast', null),
                   mouseover: () => handleInteract('forecast', null)
                 }}
               >
                 <Popup>Forward Forecast Path</Popup>
               </Polygon>

               {data.ranked_suspects.map(suspect => (
                 <React.Fragment key={suspect.mmsi}>
                   <Marker 
                     position={[suspect.last_known_position.lat, suspect.last_known_position.lon]}
                     icon={getMarkerIcon(suspect.final_score)}
                     eventHandlers={{
                       click: () => handleInteract('suspect', suspect),
                       mouseover: () => handleInteract('suspect', suspect)
                     }}
                   >
                     <Popup>
                       <div style={{padding: '5px'}}>
                         <strong style={{fontSize: '1.1rem'}}>{suspect.vessel_name}</strong><br/>
                         <div style={{margin: '5px 0', padding: '3px 8px', borderRadius: '4px', background: 'var(--bg-dark)', color: 'white', display: 'inline-block'}}>
                           Score: {(suspect.final_score * 100).toFixed(1)}%
                         </div><br/>
                         <small>Last Seen: {new Date(suspect.last_known_timestamp).toLocaleString()}</small>
                       </div>
                     </Popup>
                   </Marker>
                   
                   {showReachableZones && (
                     <Polygon 
                       positions={swapPolygonCoords(suspect.reachable_zone.coordinates)} 
                       pathOptions={{ color: 'var(--accent-blue)', fillColor: 'var(--accent-blue)', fillOpacity: 0.1, weight: 1, dashArray: '4, 4' }} 
                     >
                       <Popup>{suspect.vessel_name} Reachable Zone</Popup>
                     </Polygon>
                   )}
                 </React.Fragment>
               ))}
             </>
          )}
        </MapContainer>
        
        {data && (
          <div className="map-legend">
            <div className="legend-item"><span className="legend-color" style={{backgroundColor: 'var(--accent-red)'}}></span> Spill Detection</div>
            <div className="legend-item"><span className="legend-color" style={{backgroundColor: 'var(--accent-orange)'}}></span> Origin Probability</div>
            <div className="legend-item"><span className="legend-color" style={{backgroundColor: 'var(--accent-purple)'}}></span> Forward Forecast</div>
            {showReachableZones && <div className="legend-item"><span className="legend-color" style={{backgroundColor: 'var(--accent-blue)', opacity: 0.3}}></span> Reachable Zones</div>}
          </div>
        )}
      </div>
      
      <Chatbot 
        activeContext={activeContext}
        chatHistory={chatHistory}
        setChatHistory={setChatHistory}
      />
    </div>
  );
}

export default App;
