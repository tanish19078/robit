import { Link, NavLink } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';

const LINKS = [
  ['/', 'Overview'],
  ['/incidents', 'Incident queue'],
  ['/federation', 'Federation'],
  ['/architecture', 'Architecture'],
];

export default function Navbar() {
  const { theme, resolved, cycle } = useTheme();
  const label = theme === 'system' ? `System theme, ${resolved}` : `${theme} theme`;
  return (
    <header className="nav">
      <Link className="nav-brand" to="/" aria-label="PRAHARI home">
        <span className="brand-mark" aria-hidden="true">
          P
        </span>
        <span>PRAHARI</span>
        <span className="sim-badge">SIMULATION</span>
      </Link>
      <nav className="nav-links" aria-label="Main navigation">
        {LINKS.map(([to, text]) => (
          <NavLink key={to} to={to} end={to === '/'} className="nav-link">
            {text}
          </NavLink>
        ))}
      </nav>
      <button
        className="btn btn-ghost btn-sm theme-toggle"
        type="button"
        onClick={cycle}
        aria-label={`Theme: ${label}. Activate to change theme`}
        title={`Theme: ${label}`}
      >
        <span aria-hidden="true">{resolved === 'dark' ? '☾' : '☼'}</span>
        <span className="theme-label">{theme}</span>
      </button>
    </header>
  );
}
