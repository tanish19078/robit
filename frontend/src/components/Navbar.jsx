import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span>PRAHARI</span>
        <span className="sim-badge">SIMULATION</span>
      </div>
      <div className="navbar-links">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/incidents">Incidents</NavLink>
        <NavLink to="/federation">Federation</NavLink>
        <NavLink to="/architecture">Architecture</NavLink>
      </div>
    </nav>
  );
}
