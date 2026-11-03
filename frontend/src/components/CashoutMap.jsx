import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { get } from "../api";

function FitForecast({ cells, victim }) {
  const map = useMap();
  useEffect(() => {
    const points = cells.flatMap((cell) => cell.boundary || []);
    if (points.length) map.fitBounds(points, { padding: [24, 24], maxZoom: 14 });
    else if (victim) map.setView(victim, 13);
  }, [cells, map, victim]);
  return null;
}

export default function CashoutMap({ cells = [], victimLat, victimLon }) {
  const [terminals, setTerminals] = useState([]);
  useEffect(() => { let active = true; get("/api/terminals").then((data) => { if (active) setTerminals(data.terminals || []); }).catch(() => {}); return () => { active = false; }; }, []);

  const victim = useMemo(() => Number.isFinite(Number(victimLat)) && Number.isFinite(Number(victimLon)) ? [Number(victimLat), Number(victimLon)] : [28.6285, 77.2137], [victimLat, victimLon]);
  const cellIds = new Set(cells.map((cell) => cell.h3_cell));
  const bounds = useMemo(() => cells.flatMap((cell) => cell.boundary || []), [cells]);
  const initial = bounds.length ? bounds : [victim];

  return (
    <div className="map" role="region" aria-label="Predicted cash-out H3 cells and nearby terminals">
      <MapContainer bounds={initial} boundsOptions={{ padding: [24, 24] }} scrollWheelZoom={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <FitForecast cells={cells} victim={victim} />
        {cells.map((cell, index) => <Polygon key={cell.h3_cell} positions={cell.boundary || []} pathOptions={{ color: index === 0 ? "#b94d27" : "#2a78d6", weight: index === 0 ? 3 : 1.5, fillColor: index === 0 ? "#ec835a" : "#2a78d6", fillOpacity: index === 0 ? 0.30 : 0.10 + Math.min(cell.probability || 0, 0.3) }}><Popup><strong>{index === 0 ? "Most likely cash-out cell" : `Rank ${index + 1}`}</strong><br />{cell.h3_cell}<br />Probability: {Math.round((cell.probability || 0) * 100)}%<br />Nearby terminals: {cell.nearby_cashout_points}</Popup></Polygon>)}
        {terminals.map((terminal) => <CircleMarker key={terminal.terminal_id} center={[terminal.lat, terminal.lon]} radius={cellIds.has(terminal.h3_r8) ? 4 : 3} pathOptions={{ color: "#047857", fillColor: "#10b981", fillOpacity: 0.8, weight: 1 }}><Popup><strong>{terminal.terminal_id}</strong> · {terminal.type}<br />Cell: {terminal.h3_r8}</Popup></CircleMarker>)}
        <CircleMarker center={victim} radius={6} pathOptions={{ color: "#1a1a19", fillColor: "#ffffff", fillOpacity: 1, weight: 2 }}><Popup>Complaint origin</Popup></CircleMarker>
      </MapContainer>
    </div>
  );
}
