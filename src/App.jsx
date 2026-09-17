import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Radar, Target, Crosshair, AlertTriangle, ShieldAlert, Activity, 
  ChevronRight, Ship, Database, Wifi, Clock, ActivitySquare 
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import mockData from './mockPipelineResponse.json';

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const swapCoords = (coords) => {
  if (!coords) return [];
  if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
    return coords.map(ring => ring.map(c => [c[1], c[0]]));
  }
  return coords.map(c => [c[1], c[0]]);
};

// Tactical Custom Markers
const createPulseIcon = (score) => {
  const isHigh = score > 0.7;
  return L.divIcon({
    className: 'bg-transparent',
    html: `<div class="w-4 h-4 ${isHigh ? 'marker-pulse-high' : 'marker-pulse-med'} shadow-lg shadow-black"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10]
  });
};

// FlyTo Component
const MapController = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 13, { duration: 1.5, easeLinearity: 0.25 });
    }
  }, [target, map]);
  return null;
};

// --- MAIN APP ---
export default function App() {
  const [data, setData] = useState(mockData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [activeTarget, setActiveTarget] = useState(null);
  const [time, setTime] = useState(new Date().toUTCString());

  const [layers, setLayers] = useState({
    spill: true,
    hindcast: true,
    forecast: true,
    reachable: false,
    suspects: true
  });

  // Dynamic Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toUTCString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const executePipeline = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const response = await axios.post('/api/run-pipeline', {
        region: { min_lon: 72.4, min_lat: 18.2, max_lon: 72.8, max_lat: 18.6 },
        date: "2024-03-15"
      });
      if (response.data.status === "error") {
        setError(response.data);
      } else {
        setData(response.data);
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
  };

  const rankedSuspects = data?.ranked_suspects 
    ? [...data.ranked_suspects].sort((a, b) => b.final_score - a.final_score)
    : [];

  return (
    <div className="flex flex-col h-screen w-full bg-[#090D16] text-slate-300 font-mono overflow-hidden select-none">
      
      {/* HEADER BAR */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#05080f] border-b border-[#1e293b] z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-cyan-500 w-5 h-5" />
            <h1 className="text-sm font-bold tracking-widest text-slate-100">
              MARITIME SURVEILLANCE & ATTRIBUTION COMMAND <span className="text-cyan-600">//</span> NTRO-OSD
            </h1>
          </div>
          <div className="h-4 w-px bg-slate-800 mx-2"></div>
          <div className="flex items-center gap-2 text-[10px] tracking-wider text-green-400 bg-green-950/30 px-2 py-1 border border-green-900/50">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            SYSTEM READY
          </div>
          <div className="flex items-center gap-2 text-[10px] tracking-wider text-cyan-400 bg-cyan-950/30 px-2 py-1 border border-cyan-900/50">
            <Wifi className="w-3 h-3" />
            SAR STREAM CONNECTED
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            {time}
          </div>
          <div className="flex gap-2">
            <button onClick={loadMock} className="px-3 py-1 text-[10px] uppercase tracking-wider border border-slate-700 hover:bg-slate-800 transition-colors">
              Load Cached Demo
            </button>
            <button 
              onClick={executePipeline}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-1 text-[10px] uppercase tracking-wider bg-cyan-950/60 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-900/80 transition-colors disabled:opacity-50"
            >
              <Target className="w-3.5 h-3.5" />
              Execute Pipeline
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* MAP CANVAS */}
        <main className="flex-1 relative bg-[#090D16]">
          {loading && (
            <div className="absolute inset-0 z-[500] bg-[#090D16]/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="radar-sweep mb-4"></div>
              <p className="text-cyan-400 tracking-[0.2em] text-xs animate-pulse">EXECUTING TACTICAL SCAN...</p>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-red-950/90 border border-red-500 p-4 shadow-[0_0_20px_rgba(239,68,68,0.3)] backdrop-blur-md flex items-start gap-3 w-96">
              <AlertTriangle className="text-red-500 w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-red-100 text-xs font-bold tracking-widest mb-1 uppercase">PIPELINE FAILURE // {error.failed_stage || 'UNKNOWN'}</h3>
                <p className="text-red-400/80 text-[10px] leading-relaxed">{error.message}</p>
              </div>
            </div>
          )}

          <MapContainer center={[18.43, 72.62]} zoom={11} className="w-full h-full z-0 outline-none" zoomControl={false}>
            <MapController target={activeTarget} />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              attribution="&copy; Esri, HERE, Garmin, FAO, NOAA, USGS, EPA"
            />
            
            {/* Reachable Zones */}
            {layers.reachable && data?.ranked_suspects?.map(s => s.reachable_zone && (
              <Polygon 
                key={`rz-${s.mmsi}`}
                positions={swapCoords(s.reachable_zone.coordinates)} 
                pathOptions={{ color: '#8B5CF6', weight: 1, fillColor: '#8B5CF6', fillOpacity: 0.1, dashArray: "4,4" }} 
              />
            ))}

            {/* Spill Detection */}
            {layers.spill && data?.detection?.polygon && (
              <Polygon 
                positions={swapCoords(data.detection.polygon.coordinates)} 
                pathOptions={{ color: '#EF4444', weight: 2, fillColor: '#EF4444', fillOpacity: 0.35 }} 
              />
            )}

            {/* Hindcast Origin */}
            {layers.hindcast && data?.hindcast?.origin_probability_area && (
              <Polygon 
                positions={swapCoords(data.hindcast.origin_probability_area.coordinates)} 
                pathOptions={{ color: '#F59E0B', weight: 2, fillColor: '#F59E0B', fillOpacity: 0.25, dashArray: "5,5" }} 
              />
            )}

            {/* Forward Forecast */}
            {layers.forecast && data?.hindcast?.forward_forecast_path && (
              <Polygon 
                positions={swapCoords(data.hindcast.forward_forecast_path.coordinates)} 
                pathOptions={{ color: '#06B6D4', weight: 2, fillColor: '#06B6D4', fillOpacity: 0.15 }} 
              />
            )}

            {/* Suspect Markers */}
            {layers.suspects && rankedSuspects.map((suspect) => (
              <Marker 
                key={suspect.mmsi} 
                position={[suspect.last_known_position.lat, suspect.last_known_position.lon]}
                icon={createPulseIcon(suspect.final_score)}
              >
                <Popup>
                  <div className="p-1 uppercase">
                    <strong className="text-cyan-400 block mb-1 text-xs border-b border-[#1e293b] pb-1">
                      {suspect.vessel_name}
                    </strong>
                    <div className="text-[10px] space-y-1 text-slate-400">
                      <p>MMSI: <span className="text-slate-200">{suspect.mmsi}</span></p>
                      <p>THREAT: <span className={suspect.final_score > 0.7 ? "text-red-400" : "text-amber-400"}>{(suspect.final_score*100).toFixed(1)}%</span></p>
                      <p>SPD: <span className="text-slate-200">{suspect.last_known_speed_knots} KT</span></p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* TELEMETRY HUD (Floating Overlays) */}
          {data?.detection && (
            <div className="absolute top-4 left-4 z-[400] bg-[#090d16]/90 border border-[#1e293b] backdrop-blur-md p-3 w-64 shadow-xl">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1e293b]">
                <Radar className="w-4 h-4 text-red-500" />
                <h3 className="text-xs tracking-widest text-slate-200">SPILL DETECTED</h3>
              </div>
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between"><span className="text-slate-500">ID</span><span className="text-slate-300">{data.detection.detection_id}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">TIME (UTC)</span><span className="text-slate-300">{data.detection.timestamp.substring(11, 19)}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">CONFIDENCE</span>
                  <span className="bg-red-950/50 text-red-400 px-1.5 border border-red-900/50">{(data.detection.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between"><span className="text-slate-500">AREA</span><span className="text-slate-300">{data.detection.geometry.area_km2.toFixed(1)} KM²</span></div>
                <div className="flex justify-between"><span className="text-slate-500">PERIMETER</span><span className="text-slate-300">{data.detection.geometry.perimeter_km.toFixed(1)} KM</span></div>
              </div>
            </div>
          )}

          {data?.hindcast && (
            <div className="absolute top-4 left-72 z-[400] bg-[#090d16]/90 border border-[#1e293b] backdrop-blur-md p-3 w-64 shadow-xl">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1e293b]">
                <ActivitySquare className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs tracking-widest text-slate-200">HINDCAST ORIGIN</h3>
              </div>
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between"><span className="text-slate-500">START (UTC)</span><span className="text-slate-300">{data.hindcast.estimated_origin_time_window.start.substring(11, 19)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">END (UTC)</span><span className="text-slate-300">{data.hindcast.estimated_origin_time_window.end.substring(11, 19)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ENSEMBLE RUNS</span><span className="text-cyan-400">100 (MONTE CARLO)</span></div>
              </div>
            </div>
          )}

          {/* FLOATING TACTICAL LEGEND & CONTROLS */}
          <div className="absolute bottom-6 left-4 z-[400] bg-[#090d16]/90 border border-[#1e293b] backdrop-blur-md p-3 w-56 shadow-xl">
            <h3 className="text-[10px] tracking-[0.2em] text-slate-500 mb-3 border-b border-[#1e293b] pb-2">LAYER CONTROLS</h3>
            <div className="space-y-2.5 text-[10px] tracking-wider">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={layers.spill} onChange={() => setLayers(p => ({...p, spill: !p.spill}))} className="accent-red-500" />
                <div className="w-3 h-3 bg-[#EF4444]/30 border border-[#EF4444]"></div>
                <span className="group-hover:text-slate-100 transition-colors">DETECTION MASK</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={layers.hindcast} onChange={() => setLayers(p => ({...p, hindcast: !p.hindcast}))} className="accent-amber-500" />
                <div className="w-3 h-3 bg-[#F59E0B]/30 border border-[#F59E0B] border-dashed"></div>
                <span className="group-hover:text-slate-100 transition-colors">ORIGIN AREA</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={layers.forecast} onChange={() => setLayers(p => ({...p, forecast: !p.forecast}))} className="accent-cyan-500" />
                <div className="w-3 h-3 bg-[#06B6D4]/20 border border-[#06B6D4]"></div>
                <span className="group-hover:text-slate-100 transition-colors">DRIFT FORECAST</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={layers.reachable} onChange={() => setLayers(p => ({...p, reachable: !p.reachable}))} className="accent-purple-500" />
                <div className="w-3 h-3 bg-[#8B5CF6]/20 border border-[#8B5CF6] border-dotted"></div>
                <span className="group-hover:text-slate-100 transition-colors">REACHABLE ZONES</span>
              </label>
            </div>
          </div>
        </main>

        {/* RIGHT COLLAPSIBLE SIDEBAR: ATTRIBUTION DOSSIER */}
        <aside className="w-[420px] bg-[#05080f] border-l border-[#1e293b] flex flex-col z-20 shadow-[-10px_0_20px_rgba(0,0,0,0.5)]">
          <div className="p-4 border-b border-[#1e293b] bg-slate-900/20">
            <h2 className="text-sm font-bold tracking-widest text-slate-100 flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-cyan-500" />
              ATTRIBUTION DOSSIER
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">
              Targets Analysed: <span className="text-cyan-400">{rankedSuspects.length}</span>
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {rankedSuspects.length === 0 ? (
              <div className="text-center text-slate-600 text-[10px] mt-10 tracking-[0.2em]">NO THREATS ACQUIRED</div>
            ) : (
              rankedSuspects.map((suspect, idx) => {
                const isHighThreat = suspect.final_score > 0.7;
                return (
                  <div key={suspect.mmsi} className={cn(
                    "bg-[#090d16] border p-4 transition-all relative overflow-hidden group",
                    isHighThreat ? "border-red-900/50 hover:border-red-500/50" : "border-amber-900/30 hover:border-amber-500/50"
                  )}>
                    {/* Background glow logic */}
                    <div className={cn(
                      "absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 pointer-events-none rounded-full",
                      isHighThreat ? "bg-red-500" : "bg-amber-500"
                    )}></div>

                    {/* Header */}
                    <div className="flex justify-between items-start mb-4 relative">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-[9px] px-1 py-0.5", isHighThreat ? "bg-red-950 text-red-500" : "bg-amber-950 text-amber-500")}>
                            TGT-{idx+1}
                          </span>
                          <h3 className="font-bold text-sm tracking-wider text-slate-100 uppercase group-hover:text-white">{suspect.vessel_name}</h3>
                        </div>
                        <p className="text-[10px] text-slate-500 tracking-widest">MMSI: {suspect.mmsi} // {suspect.vessel_type}</p>
                      </div>
                      <div className="text-right">
                        <div className={cn("text-xl font-bold tracking-tighter", isHighThreat ? "text-red-400" : "text-amber-400")}>
                          {(suspect.final_score * 100).toFixed(1)}%
                        </div>
                        <div className="text-[8px] text-slate-500 uppercase tracking-widest">THREAT MATCH</div>
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-4 text-[10px]">
                      <div className="bg-[#05080f] p-2 border border-[#1e293b]">
                        <span className="text-slate-600 block mb-1">SPEED</span>
                        <span className="text-slate-300">{suspect.last_known_speed_knots} KT</span>
                      </div>
                      <div className="bg-[#05080f] p-2 border border-[#1e293b]">
                        <span className="text-slate-600 block mb-1">HDG</span>
                        <span className="text-slate-300">{suspect.last_known_heading_deg}°</span>
                      </div>
                      <div className="bg-red-950/20 p-2 border border-red-900/30">
                        <span className="text-red-500/70 block mb-1">AIS DARK</span>
                        <span className="text-red-400">{suspect.went_dark_hours_ago} HR</span>
                      </div>
                    </div>

                    {/* Progress Bar overall */}
                    <div className="mb-4">
                      <div className="flex justify-between text-[9px] text-slate-500 mb-1 tracking-widest">
                        <span>ATTRIBUTION CONFIDENCE</span>
                        <span>{suspect.final_score.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-1 bg-[#1e293b] rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-1000", isHighThreat ? "bg-red-500 shadow-[0_0_10px_red]" : "bg-amber-500")}
                          style={{ width: `${suspect.final_score * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Score Breakdown (Collapsible-style but always open for dashboard) */}
                    <div className="space-y-2 mb-4 text-[9px] border-t border-[#1e293b] pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1"><Crosshair className="w-3 h-3"/> Kinematic (40%)</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1 bg-[#1e293b]"><div className="h-full bg-cyan-500" style={{width: `${suspect.kinematic_score*100}%`}}></div></div>
                          <span className="text-slate-300 w-6 text-right">{suspect.kinematic_score.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1"><Activity className="w-3 h-3"/> Proximity (30%)</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1 bg-[#1e293b]"><div className="h-full bg-cyan-500" style={{width: `${suspect.proximity_score*100}%`}}></div></div>
                          <span className="text-slate-300 w-6 text-right">{suspect.proximity_score.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1"><Ship className="w-3 h-3"/> Size Match (30%)</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1 bg-[#1e293b]"><div className="h-full bg-cyan-500" style={{width: `${suspect.size_match_score*100}%`}}></div></div>
                          <span className="text-slate-300 w-6 text-right">{suspect.size_match_score.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button 
                      onClick={() => setActiveTarget([suspect.last_known_position.lat, suspect.last_known_position.lon])}
                      className={cn(
                        "w-full py-2 text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-colors border",
                        isHighThreat 
                          ? "bg-red-950/40 text-red-400 border-red-900/50 hover:bg-red-900/60" 
                          : "bg-[#1e293b]/40 text-slate-300 border-[#1e293b] hover:bg-[#1e293b]"
                      )}
                    >
                      <Crosshair className="w-3 h-3" />
                      FOCUS ON MAP
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}
