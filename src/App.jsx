import React, { useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import mockData from './mockPipelineResponse.json';
import Chatbot from './Chatbot';
import './App.css';

// Dynamic icon generator based on final_score
const getMarkerIcon = (score) => {
  let color = '#30d158'; // green
  if (score < 0.6) color = '#ff4d6d';      // red
  else if (score < 0.8) color = '#ff9f0a'; // orange

  return L.divIcon({
    className: 'custom-marker-icon',
    html: `<div class="custom-marker" style="background-color: ${color}; color: ${color};"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const swapPolygonCoords = (polygonCoordinates) => {
  if (!polygonCoordinates || polygonCoordinates.length === 0) return [];
  return polygonCoordinates[0].map(point => [point[1], point[0]]);
};

// Named destinations with bounding boxes
const NAMED_REGIONS = {
  mumbai:  { label: 'Mumbai Coast (Demo)',   min_lon: 72.5, min_lat: 18.0, max_lon: 73.5, max_lat: 19.0 },
  chennai: { label: 'Chennai Coast',          min_lon: 80.2, min_lat: 13.0, max_lon: 80.5, max_lat: 13.3 },
  kochi:   { label: 'Kochi Coast',            min_lon: 76.1, min_lat: 9.8,  max_lon: 76.3, max_lat: 10.1 },
  vizag:   { label: 'Visakhapatnam Harbor',   min_lon: 83.1, min_lat: 17.5, max_lon: 83.5, max_lat: 17.9 },
  gulf:    { label: 'Gulf of Kutch',          min_lon: 68.5, min_lat: 22.0, max_lon: 70.5, max_lat: 23.5 },
};

// Normalise backend response – gracefully handle key variants
const normaliseResponse = (raw) => {
  if (!raw || raw.status === 'error') return raw;
  return {
    ...raw,
    // Support both 'ranked_suspects' and 'suspects'
    ranked_suspects: raw.ranked_suspects ?? raw.suspects ?? [],
    // Support both 'hindcast' and 'hindcasting'
    hindcast: raw.hindcast ?? raw.hindcasting ?? null,
  };
};

const getScoreClass = (score) => {
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
};

const getScoreBarColor = (score) => {
  if (score >= 0.8) return 'var(--accent-green)';
  if (score >= 0.6) return 'var(--accent-orange)';
  return 'var(--accent-red)';
};

const getItemAccent = (score) => {
  if (score >= 0.8) return 'var(--accent-green)';
  if (score >= 0.6) return 'var(--accent-orange)';
  return 'var(--accent-red)';
};

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Map display
  const [showReachableZones, setShowReachableZones] = useState(false);
  const [date, setDate] = useState('2024-03-15');

  // Region selection mode: 'named' | 'coords'
  const [regionMode, setRegionMode] = useState('named');
  const [namedRegionKey, setNamedRegionKey] = useState('mumbai');
  const [customCoords, setCustomCoords] = useState({
    min_lon: 72.5, min_lat: 18.0, max_lon: 73.5, max_lat: 19.0
  });

  // Demo-Day Safety toggle
  const [useLiveBackend, setUseLiveBackend] = useState(false);

  // Chatbot
  const [activeContext, setActiveContext] = useState(null);
  const [chatHistory, setChatHistory] = useState([
    { sender: 'bot', text: 'Hello! I am your AI assistant. Click or hover on map items or the suspect list to learn more about the analysis.', id: Date.now() }
  ]);

  const handleInteract = (type, itemData) => {
    setActiveContext({ type, data: itemData, timestamp: Date.now() });
  };

  const getRegionPayload = () => {
    if (regionMode === 'named') {
      const { label: _l, ...bounds } = NAMED_REGIONS[namedRegionKey];
      return bounds;
    }
    return {
      min_lon: parseFloat(customCoords.min_lon),
      min_lat: parseFloat(customCoords.min_lat),
      max_lon: parseFloat(customCoords.max_lon),
      max_lat: parseFloat(customCoords.max_lat),
    };
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    if (!useLiveBackend) {
      setTimeout(() => {
        const normalised = normaliseResponse(mockData);
        if (normalised?.status === 'error') {
          setError(normalised.message);
        } else {
          setData(normalised);
        }
        setLoading(false);
      }, 900);
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://pro-back-h78m.onrender.com/api/run-pipeline';
      const payload = { region: getRegionPayload(), date };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const raw = await response.json();
      const result = normaliseResponse(raw);

      if (result?.status === 'error') {
        setError(result.message || 'The backend pipeline reported an error.');
      } else {
        setData(result);
      }
    } catch (err) {
      setError(`Failed to connect to backend: ${err.message}. Uncheck "Use Live API" to load demo data.`);
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = data
    ? [data.detection.geometry.centroid.lat, data.detection.geometry.centroid.lon]
    : [18.43, 72.62];

  const suspects = data?.ranked_suspects ?? [];

  return (
    <div className="app-container">
      {/* ── SIDEBAR ── */}
      <div className="sidebar">
        {/* Brand Header */}
        <div className="brand-header">
          <div className="brand-logo">
            <div className="brand-icon">🌊</div>
            <div>
              <div className="brand-title">OceanForensics</div>
            </div>
            <span className="status-pill">
              <span className="status-dot"></span>LIVE
            </span>
          </div>
          <div className="brand-subtitle">AI-Powered Oil Spill Attribution</div>
        </div>

        <div className="sidebar-content">

          {/* ── ANALYSIS PARAMETERS PANEL ── */}
          <div className="panel-section">
            <div className="panel-header">
              <span className="panel-header-icon">⚙️</span>
              <h3>Analysis Parameters</h3>
            </div>
            <div className="panel-body">

              {/* Region Mode Toggle */}
              <div className="region-mode-toggle">
                <button
                  className={`mode-btn ${regionMode === 'named' ? 'active' : ''}`}
                  onClick={() => setRegionMode('named')}
                >
                  📍 Named Destination
                </button>
                <button
                  className={`mode-btn ${regionMode === 'coords' ? 'active' : ''}`}
                  onClick={() => setRegionMode('coords')}
                >
                  🔢 Coordinates
                </button>
              </div>

              {/* Named Destination Dropdown */}
              {regionMode === 'named' && (
                <div className="control-group">
                  <label>Region of Interest</label>
                  <select value={namedRegionKey} onChange={e => setNamedRegionKey(e.target.value)}>
                    {Object.entries(NAMED_REGIONS).map(([key, region]) => (
                      <option key={key} value={key}>{region.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Coordinate Inputs */}
              {regionMode === 'coords' && (
                <div className="coords-grid">
                  {[
                    { key: 'min_lon', label: 'Min Lon' },
                    { key: 'min_lat', label: 'Min Lat' },
                    { key: 'max_lon', label: 'Max Lon' },
                    { key: 'max_lat', label: 'Max Lat' },
                  ].map(({ key, label }) => (
                    <div className="coord-input-group" key={key}>
                      <label>{label}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={customCoords[key]}
                        onChange={e => setCustomCoords(prev => ({ ...prev, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Date Picker */}
              <div className="control-group" style={{ marginTop: regionMode === 'coords' ? '12px' : '0' }}>
                <label>Analysis Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>

              {/* Live Backend Toggle */}
              <div className="backend-toggle" onClick={() => setUseLiveBackend(v => !v)}>
                <input
                  type="checkbox"
                  checked={useLiveBackend}
                  onChange={e => setUseLiveBackend(e.target.checked)}
                  id="live-backend"
                  onClick={e => e.stopPropagation()}
                />
                <label htmlFor="live-backend" className="backend-toggle-label">
                  🔗 Use Live API (Render)
                </label>
              </div>

              {/* Run Button */}
              <button
                onClick={runAnalysis}
                disabled={loading}
                className={`run-btn ${loading ? 'loading' : ''}`}
              >
                {loading ? '⏳ Processing Pipeline…' : '▶  Run Analysis'}
              </button>

              {/* Reachable Zones Toggle */}
              <div className="map-toggle" style={{ marginTop: '10px' }}>
                <input
                  type="checkbox"
                  id="reachable-zones"
                  checked={showReachableZones}
                  onChange={e => setShowReachableZones(e.target.checked)}
                />
                <label htmlFor="reachable-zones">Show Reachable Zones</label>
              </div>
            </div>
          </div>

          {/* ── ERROR ── */}
          {error && (
            <div className="error-box">
              <h4>⚠ Pipeline Error</h4>
              <p>{error}</p>
            </div>
          )}

          {/* ── RESULTS ── */}
          {!data && !error && !loading && (
            <div className="empty-state">
              <div className="empty-state-icon">🛰️</div>
              <p className="empty-state-text">
                Configure your analysis parameters above and click <strong>Run Analysis</strong> to begin the pipeline.
              </p>
            </div>
          )}

          {data && (
            <>
              {/* Detection Info */}
              <div className="panel-section">
                <div className="panel-header">
                  <span className="panel-header-icon">🔍</span>
                  <h3>Detection Info</h3>
                </div>
                <div className="panel-body">
                  <div className="detection-stats">
                    <div
                      className="stat-card"
                      onMouseEnter={() => handleInteract('detection', data.detection)}
                      onClick={() => handleInteract('detection', data.detection)}
                    >
                      <div className="stat-label">Confidence</div>
                      <div className="stat-value green">
                        {(data.detection.confidence * 100).toFixed(1)}
                        <span className="stat-unit">%</span>
                      </div>
                    </div>
                    <div
                      className="stat-card"
                      onMouseEnter={() => handleInteract('detection', data.detection)}
                      onClick={() => handleInteract('detection', data.detection)}
                    >
                      <div className="stat-label">Est. Area</div>
                      <div className="stat-value blue">
                        {data.detection.geometry.area_km2}
                        <span className="stat-unit">km²</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ranked Suspects */}
              <div className="panel-section">
                <div className="panel-header">
                  <span className="panel-header-icon">🚢</span>
                  <h3>Ranked Suspects</h3>
                  <span className="suspects-count-badge" style={{ marginLeft: 'auto' }}>
                    {suspects.length} vessel{suspects.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="panel-body" style={{ padding: suspects.length === 0 ? '20px 16px' : '14px 16px' }}>
                  {suspects.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No suspects returned by pipeline.
                    </div>
                  ) : (
                    <ul className="suspect-list">
                      {suspects.map((suspect, idx) => (
                        <li
                          key={suspect.mmsi ?? idx}
                          className="suspect-item"
                          style={{ '--item-accent': getItemAccent(suspect.final_score), animationDelay: `${idx * 60}ms` }}
                          onMouseEnter={() => handleInteract('suspect', suspect)}
                          onClick={() => handleInteract('suspect', suspect)}
                        >
                          <span className="suspect-rank">#{idx + 1}</span>
                          <div className="suspect-header">
                            <div>
                              <div className="suspect-name">{suspect.vessel_name}</div>
                              <div className="suspect-mmsi">MMSI: {suspect.mmsi}</div>
                            </div>
                            <span className={`score-badge ${getScoreClass(suspect.final_score)}`}>
                              {(suspect.final_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="suspect-details">
                            <div className="suspect-detail-item">
                              <span className="suspect-detail-label">Type</span>
                              <span className="suspect-detail-value">{suspect.vessel_type}</span>
                            </div>
                            <div className="suspect-detail-item">
                              <span className="suspect-detail-label">Speed</span>
                              <span className="suspect-detail-value">{suspect.last_known_speed_knots} kts</span>
                            </div>
                            <div className="suspect-detail-item">
                              <span className="suspect-detail-label">Dark Time</span>
                              <span className="suspect-detail-value">{suspect.went_dark_hours_ago} hrs</span>
                            </div>
                            <div className="suspect-detail-item">
                              <span className="suspect-detail-label">Heading</span>
                              <span className="suspect-detail-value">{suspect.last_known_heading_deg ?? '—'}°</span>
                            </div>
                          </div>
                          {/* Score bar */}
                          <div className="score-bar-wrap">
                            <div
                              className="score-bar-fill"
                              style={{
                                width: `${(suspect.final_score * 100).toFixed(0)}%`,
                                background: getScoreBarColor(suspect.final_score)
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── MAP AREA ── */}
      <div className="map-area">
        <MapContainer
          center={mapCenter}
          zoom={10}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: 'var(--bg-dark)' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles"
          />

          {data && (
            <>
              {/* Spill Detection Polygon */}
              <Polygon
                positions={swapPolygonCoords(data.detection.polygon.coordinates)}
                pathOptions={{ color: '#ff4d6d', fillColor: '#ff4d6d', fillOpacity: 0.25, weight: 2 }}
                eventHandlers={{
                  click: () => handleInteract('detection', data.detection),
                  mouseover: () => handleInteract('detection', data.detection)
                }}
              >
                <Popup>
                  <strong>Spill Detection Area</strong><br />
                  Confidence: {(data.detection.confidence * 100).toFixed(1)}%
                </Popup>
              </Polygon>

              {/* Origin Probability Area */}
              {data.hindcast?.origin_probability_area && (
                <Polygon
                  positions={swapPolygonCoords(data.hindcast.origin_probability_area.coordinates)}
                  pathOptions={{ color: '#ff9f0a', fillColor: '#ff9f0a', fillOpacity: 0.2, weight: 2 }}
                  eventHandlers={{
                    click: () => handleInteract('origin', null),
                    mouseover: () => handleInteract('origin', null)
                  }}
                >
                  <Popup>Estimated Origin Probability Area</Popup>
                </Polygon>
              )}

              {/* Forward Forecast Path */}
              {data.hindcast?.forward_forecast_path && (
                <Polygon
                  positions={swapPolygonCoords(data.hindcast.forward_forecast_path.coordinates)}
                  pathOptions={{ color: '#bf5af2', fillColor: '#bf5af2', fillOpacity: 0.15, dashArray: '6, 6', weight: 2 }}
                  eventHandlers={{
                    click: () => handleInteract('forecast', null),
                    mouseover: () => handleInteract('forecast', null)
                  }}
                >
                  <Popup>Forward Forecast Path</Popup>
                </Polygon>
              )}

              {/* Suspect Markers */}
              {suspects.map((suspect, idx) => (
                <React.Fragment key={suspect.mmsi ?? idx}>
                  {suspect.last_known_position?.lat != null && suspect.last_known_position?.lon != null && (
                    <Marker
                      position={[suspect.last_known_position.lat, suspect.last_known_position.lon]}
                      icon={getMarkerIcon(suspect.final_score)}
                      eventHandlers={{
                        click: () => handleInteract('suspect', suspect),
                        mouseover: () => handleInteract('suspect', suspect)
                      }}
                    >
                      <Popup>
                        <div style={{ padding: '4px', minWidth: '160px' }}>
                          <strong style={{ fontSize: '1rem' }}>{suspect.vessel_name}</strong><br />
                          <span style={{ fontSize: '0.8rem', color: '#666' }}>MMSI: {suspect.mmsi}</span><br />
                          <div style={{ marginTop: '6px', padding: '3px 8px', borderRadius: '4px', background: '#1e293b', color: 'white', display: 'inline-block', fontSize: '0.85rem' }}>
                            Score: {(suspect.final_score * 100).toFixed(1)}%
                          </div><br />
                          <small style={{ color: '#888' }}>Last Seen: {new Date(suspect.last_known_timestamp).toLocaleString()}</small>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {showReachableZones && suspect.reachable_zone?.coordinates && (
                    <Polygon
                      positions={swapPolygonCoords(suspect.reachable_zone.coordinates)}
                      pathOptions={{ color: '#00b4d8', fillColor: '#00b4d8', fillOpacity: 0.08, weight: 1, dashArray: '4, 4' }}
                    >
                      <Popup>{suspect.vessel_name} — Reachable Zone</Popup>
                    </Polygon>
                  )}
                </React.Fragment>
              ))}
            </>
          )}
        </MapContainer>

        {/* Loading Overlay */}
        {loading && (
          <div className="loading-overlay">
            <div className="loading-ring"></div>
            <div className="loading-text">Running Pipeline…</div>
          </div>
        )}

        {/* Map Top Banner */}
        {data && (
          <div className="map-overlay-header">
            <div className="map-overlay-dot" style={{ background: 'var(--accent-green)' }}></div>
            <span className="map-overlay-text">
              Analysis Complete · {suspects.length} Vessel{suspects.length !== 1 ? 's' : ''} Flagged
            </span>
          </div>
        )}

        {/* Legend */}
        {data && (
          <div className="map-legend">
            <div className="legend-title">Layer Legend</div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#ff4d6d', opacity: 0.8 }}></span>
              Spill Detection
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#ff9f0a', opacity: 0.8 }}></span>
              Origin Probability
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#bf5af2', opacity: 0.8 }}></span>
              Forward Forecast
            </div>
            {showReachableZones && (
              <div className="legend-item">
                <span className="legend-color" style={{ background: '#00b4d8', opacity: 0.5 }}></span>
                Reachable Zones
              </div>
            )}
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="legend-item" style={{ marginBottom: '4px' }}>
                <span className="legend-color" style={{ background: '#30d158', borderRadius: '50%' }}></span>
                High Match (≥80%)
              </div>
              <div className="legend-item" style={{ marginBottom: '4px' }}>
                <span className="legend-color" style={{ background: '#ff9f0a', borderRadius: '50%' }}></span>
                Medium (60–80%)
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ background: '#ff4d6d', borderRadius: '50%' }}></span>
                Low (&lt;60%)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CHATBOT ── */}
      <Chatbot
        activeContext={activeContext}
        chatHistory={chatHistory}
        setChatHistory={setChatHistory}
      />
    </div>
  );
}

export default App;
