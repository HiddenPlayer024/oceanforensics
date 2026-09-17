import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Polygon, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Target, Crosshair, AlertTriangle, Activity, 
  ChevronRight, Ship, Wifi
} from 'lucide-react';
import mockData from './mockPipelineResponse.json';

// --- UTILITIES ---
const swapCoords = (coords) => {
  if (!coords) return [];
  if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
    return coords.map(ring => ring.map(c => [c[1], c[0]]));
  }
  return coords.map(c => [c[1], c[0]]);
};

// Tactical Custom Markers
const createVesselIcon = (suspect) => {
  const score = suspect.final_score * 100;
  let status = "Low Chances";
  let pillClasses = "bg-green-900/80 text-green-300";
  let dotClasses = "bg-green-400";
  let borderClasses = "border-slate-600";
  
  if (score > 70) {
      status = "High Chances";
      pillClasses = "bg-red-900/80 text-red-200";
      dotClasses = "bg-red-500";
      borderClasses = "border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.3)]";
  } else if (score > 40) {
      status = "Medium Chances";
      pillClasses = "bg-amber-900/80 text-amber-200";
      dotClasses = "bg-amber-400";
      borderClasses = "border-amber-500/70";
  }

  const html = `
    <div class="relative flex flex-col items-center">
      <div class="flex flex-col bg-[#0f172a]/95 backdrop-blur border ${borderClasses} rounded-lg p-2.5 text-white min-w-[140px] shadow-xl">
        <div class="text-xs font-bold mb-1.5 tracking-wide">${suspect.vessel_name}</div>
        <div class="flex items-center gap-1.5 text-[10px] ${pillClasses} rounded-full px-2 py-0.5 w-max font-medium">
          <div class="w-1.5 h-1.5 rounded-full ${dotClasses}"></div>
          ${status}
        </div>
      </div>
      <div class="w-px h-6 bg-white/50"></div>
      <div class="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"></div>
    </div>
  `;

  return L.divIcon({
    className: 'bg-transparent',
    html: html,
    iconSize: [140, 100],
    iconAnchor: [70, 100] // point to the bottom circle
  });
};

const MapController = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 11, { duration: 1.5, easeLinearity: 0.25 });
    }
  }, [target, map]);
  return null;
};

// --- MAIN APP ---
export default function App() {
  const [data, setData] = useState(mockData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTarget, setActiveTarget] = useState([18.43, 72.62]);

  // Input states
  const [date, setDate] = useState("2024-03-15");
  const [minLon, setMinLon] = useState(72.4);
  const [minLat, setMinLat] = useState(18.2);
  const [maxLon, setMaxLon] = useState(72.8);
  const [maxLat, setMaxLat] = useState(18.6);

  const executePipeline = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const response = await axios.post('/api/run-pipeline', {
        region: { min_lon: parseFloat(minLon), min_lat: parseFloat(minLat), max_lon: parseFloat(maxLon), max_lat: parseFloat(maxLat) },
        date: date
      });
      if (response.data.status === "error") {
        setError(response.data);
      } else {
        setData(response.data);
        if (response.data.detection?.geometry?.centroid) {
           setActiveTarget([response.data.detection.geometry.centroid.lat, response.data.detection.geometry.centroid.lon]);
        }
      }
    } catch (err) {
      console.error(err);
      setError({ failed_stage: "NETWORK_ERROR", message: "Failed to connect to API cluster." });
    }
    setLoading(false);
  };

  const loadMock = () => {
    setError(null);
    setData(mockData);
    setActiveTarget([18.43, 72.62]);
  };

  const rankedSuspects = data?.ranked_suspects 
    ? [...data.ranked_suspects].sort((a, b) => b.final_score - a.final_score)
    : [];

  return (
    <div className="flex h-screen w-full bg-[#05080f] font-sans overflow-hidden select-none">
      
      {/* MAIN MAP AREA */}
      <main className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-[500] bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white tracking-widest text-sm font-semibold">ANALYZING SATELLITE IMAGERY...</p>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-red-950/90 border border-red-500 p-4 rounded-xl shadow-xl flex items-start gap-3 w-96">
            <AlertTriangle className="text-red-500 w-6 h-6 shrink-0" />
            <div>
              <h3 className="text-red-100 text-xs font-bold tracking-widest mb-1 uppercase">PIPELINE FAILURE // {error.failed_stage || 'UNKNOWN'}</h3>
              <p className="text-red-300 text-xs">{error.message}</p>
            </div>
          </div>
        )}

        <MapContainer center={[18.43, 72.62]} zoom={11} className="w-full h-full z-0 outline-none" zoomControl={false}>
          <MapController target={activeTarget} />
          {/* High-res Satellite Imagery */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
          />
          
          {/* Spill Detection */}
          {data?.detection?.polygon && (
            <Polygon 
              positions={swapCoords(data.detection.polygon.coordinates)} 
              pathOptions={{ 
                color: '#f97316', 
                weight: 2, 
                fillColor: '#ea580c', 
                fillOpacity: 0.4,
                className: 'spill-glow'
              }} 
            />
          )}

          {/* Hindcast Origin */}
          {data?.hindcast?.origin_probability_area && (
            <Polygon 
              positions={swapCoords(data.hindcast.origin_probability_area.coordinates)} 
              pathOptions={{ color: '#ef4444', weight: 1, fillColor: '#ef4444', fillOpacity: 0.15, dashArray: "5,5" }} 
            />
          )}

          {/* Forward Forecast */}
          {data?.hindcast?.forward_forecast_path && (
            <Polygon 
              positions={swapCoords(data.hindcast.forward_forecast_path.coordinates)} 
              pathOptions={{ color: '#06b6d4', weight: 2, fillOpacity: 0, dashArray: "8,8" }} 
            />
          )}

          {/* Suspect Markers */}
          {rankedSuspects.map((suspect) => (
            <Marker 
              key={suspect.mmsi} 
              position={[suspect.last_known_position.lat, suspect.last_known_position.lon]}
              icon={createVesselIcon(suspect)}
            />
          ))}
        </MapContainer>

        {/* TOP LEFT CONTROLS */}
        <div className="absolute top-6 left-6 z-[400]">
          <div className="bg-[#0f172a]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="text-white text-xs font-semibold flex items-center gap-2 mb-1">
              <Crosshair className="w-4 h-4 text-blue-400"/> PIPELINE PARAMETERS
            </div>
            <div className="flex gap-2">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-xs px-3 py-2 rounded-lg outline-none text-white w-full font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.1" value={minLon} onChange={e => setMinLon(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-xs px-3 py-2 rounded-lg outline-none text-white w-24 font-mono" placeholder="Min Lon" />
              <input type="number" step="0.1" value={maxLon} onChange={e => setMaxLon(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-xs px-3 py-2 rounded-lg outline-none text-white w-24 font-mono" placeholder="Max Lon" />
              <input type="number" step="0.1" value={minLat} onChange={e => setMinLat(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-xs px-3 py-2 rounded-lg outline-none text-white w-24 font-mono" placeholder="Min Lat" />
              <input type="number" step="0.1" value={maxLat} onChange={e => setMaxLat(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-xs px-3 py-2 rounded-lg outline-none text-white w-24 font-mono" placeholder="Max Lat" />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={loadMock} className="flex-1 bg-slate-700/80 hover:bg-slate-600 text-white text-[10px] uppercase font-bold py-2 rounded-lg transition-colors">
                Mock
              </button>
              <button onClick={executePipeline} disabled={loading} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                {loading ? 'Running...' : 'Execute Scan'} <Target className="w-3.5 h-3.5"/>
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM LEGEND */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] bg-[#0f172a]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-2xl text-slate-200 text-xs flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 bg-orange-500/40 border border-orange-500 rounded-full flex items-center justify-center"></div>
            <span>Oil spill (detected)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 border-t-2 border-cyan-400 border-dashed"></div>
            <span>Drift path (modelled)</span>
          </div>
          <div className="flex items-center gap-2">
            <Ship className="w-3.5 h-3.5 text-slate-300" />
            <span>Ship (identified)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border border-red-500 rounded flex items-center justify-center text-red-500">
               <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </div>
            <span>Ship (AIS missing)</span>
          </div>
        </div>
      </main>

      {/* RIGHT PROFESSIONAL PANEL */}
      <aside className="w-[550px] bg-white flex flex-col z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] border-l border-slate-200">
        
        {/* Header */}
        <div className="flex items-center gap-4 p-6 bg-[#f8fafc] border-b border-slate-200">
          <div className="bg-[#1e293b] p-3 rounded-xl shadow-md">
            <Ship className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Suspect Vessels</h2>
            <p className="text-sm text-slate-500 font-medium">Ranked by Chances of Being the Culprit</p>
          </div>
        </div>

        {/* Table Header */}
        <div className="flex bg-[#1e293b] text-white text-[11px] uppercase tracking-wider font-semibold px-6 py-3 shadow-inner">
          <div className="w-12">Rank</div>
          <div className="flex-1 pl-2">Vessel</div>
          <div className="w-24 text-center">Chances</div>
          <div className="flex-1 pl-6">Key Reasons</div>
        </div>

        {/* Suspects List */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {rankedSuspects.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No suspect vessels detected in this region.</div>
          ) : (
            rankedSuspects.map((suspect, idx) => {
              const score = suspect.final_score * 100;
              let status = "Low";
              let rowColors = "bg-[#f0fdf4] border-[#bbf7d0]";
              let rankBg = "bg-[#22c55e]";
              let scoreColor = "text-[#15803d]";
              let pillColors = "bg-[#dcfce7] text-[#166534]";

              if (score > 70) {
                  status = "High";
                  rowColors = "bg-[#fef2f2] border-[#fecaca]";
                  rankBg = "bg-[#ef4444]";
                  scoreColor = "text-[#b91c1c]";
                  pillColors = "bg-[#fee2e2] text-[#991b1b]";
              } else if (score > 40) {
                  status = "Medium";
                  rowColors = "bg-[#fffbeb] border-[#fde68a]";
                  rankBg = "bg-[#f59e0b]";
                  scoreColor = "text-[#b45309]";
                  pillColors = "bg-[#fef3c7] text-[#92400e]";
              }

              return (
                <div 
                  key={suspect.mmsi} 
                  onClick={() => setActiveTarget([suspect.last_known_position.lat, suspect.last_known_position.lon])}
                  className={`flex items-center px-6 py-4 border-b cursor-pointer transition-colors hover:brightness-95 ${rowColors}`}
                >
                  {/* Rank */}
                  <div className="w-12">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${rankBg}`}>
                      {idx + 1}
                    </div>
                  </div>
                  
                  {/* Vessel */}
                  <div className="flex-1 flex items-center gap-3 pl-2">
                    <div className="w-12 h-10 bg-white border border-slate-200 rounded flex items-center justify-center shadow-sm">
                      <Ship className="text-slate-400 w-5 h-5"/>
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm leading-tight">{suspect.vessel_name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">(MMSI: {suspect.mmsi})</div>
                    </div>
                  </div>

                  {/* Chances */}
                  <div className="w-24 flex flex-col items-center justify-center border-l border-r border-black/5 px-2">
                    <div className="text-2xl font-extrabold flex items-baseline">
                      <span className={scoreColor}>{score.toFixed(0)}</span>
                      <span className="text-[10px] text-slate-400 font-semibold ml-0.5">/100</span>
                    </div>
                    <div className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full mt-1 ${pillColors}`}>
                      {status}
                    </div>
                  </div>

                  {/* Key Reasons */}
                  <div className="flex-1 pl-6 text-[10px] text-slate-600 font-medium space-y-1.5">
                    <div className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-slate-400"></span> Kinematic Match ({(suspect.kinematic_score*100).toFixed(0)}%)</div>
                    {suspect.went_dark_hours_ago > 0 && <div className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-slate-400"></span> No AIS signal ({suspect.went_dark_hours_ago}h gap)</div>}
                    <div className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-slate-400"></span> Size Match SAR ({(suspect.size_match_score*100).toFixed(0)}%)</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Top Suspect Detailed View */}
        {rankedSuspects[0] && (
          <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-10">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs bg-[#ef4444] shadow-sm">1</div>
                <div className="font-bold text-slate-900 text-sm">{rankedSuspects[0].vessel_name} <span className="text-slate-400 font-normal ml-1">(Top Match)</span></div>
              </div>
              <button className="text-[10px] uppercase font-bold text-slate-600 border border-slate-300 rounded-full px-4 py-1.5 hover:bg-slate-50 transition-colors flex items-center gap-1">
                View Details <ChevronRight className="w-3 h-3"/>
              </button>
            </div>
            
            <div className="text-xs font-bold text-slate-800 mb-3">Why this vessel is flagged?</div>
            
            <div className="flex justify-between mb-5 bg-[#f8fafc] rounded-lg border border-slate-100 p-3">
              <div className="flex items-start gap-2.5">
                 <div className="bg-red-100 p-1.5 rounded-full mt-0.5"><Target className="text-red-500 w-3.5 h-3.5 shrink-0" /></div>
                 <div className="text-[10px] text-slate-600">In KRS projection zone<br/><span className="font-bold text-slate-800">({(rankedSuspects[0].kinematic_score*100).toFixed(0)}%)</span></div>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div className="flex items-start gap-2.5">
                 <div className="bg-red-100 p-1.5 rounded-full mt-0.5"><Wifi className="text-red-500 w-3.5 h-3.5 shrink-0" /></div>
                 <div className="text-[10px] text-slate-600">No AIS signal<br/><span className="font-bold text-slate-800">({rankedSuspects[0].went_dark_hours_ago} hours)</span></div>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div className="flex items-start gap-2.5">
                 <div className="bg-red-100 p-1.5 rounded-full mt-0.5"><Activity className="text-red-500 w-3.5 h-3.5 shrink-0" /></div>
                 <div className="text-[10px] text-slate-600">Size match with SAR<br/><span className="font-bold text-slate-800">({(rankedSuspects[0].size_match_score*100).toFixed(0)}%)</span></div>
              </div>
            </div>
            
            {rankedSuspects[0].final_score > 0.7 && (
              <div className="bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] text-xs font-medium p-3 flex items-center gap-2.5 rounded-lg shadow-sm">
                <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
                High likelihood. Needs manual verification.
              </div>
            )}
          </div>
        )}
      </aside>

    </div>
  );
}
