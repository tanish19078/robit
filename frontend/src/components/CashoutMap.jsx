import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { get } from "../api";

export default function CashoutMap({ topCell }) {
  const [terminals, setTerminals] = useState([]);

  useEffect(() => {
    get("/api/terminals").then((d) => setTerminals(d.terminals || [])).catch(() => {});
  }, []);

  return (
    <div className="map-container">
      <MapContainer center={[28.6315, 77.2167]} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        {terminals.map((t) => {
          const hot = topCell && t.h3_r8 === topCell;
          return (
            <CircleMarker
              key={t.terminal_id}
              center={[t.lat, t.lon]}
              radius={hot ? 10 : 5}
              pathOptions={{ color: hot ? "#ff5a5a" : "#4da3ff", fillOpacity: 0.8 }}
            >
              <Popup>
                <strong>{t.terminal_id}</strong> ({t.type})<br />
                Cell: {t.h3_r8}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
