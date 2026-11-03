import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import { LoadingCard } from './components/ui/primitives';

const Landing = lazy(() => import('./pages/Landing'));
const IncidentQueue = lazy(() => import('./pages/IncidentQueue'));
const IncidentDetail = lazy(() => import('./pages/IncidentDetail'));
const FederationDemo = lazy(() => import('./pages/FederationDemo'));
const Architecture = lazy(() => import('./pages/Architecture'));

export default function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content">
        <Suspense
          fallback={
            <div className="page">
              <LoadingCard title="Loading console" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/incidents" element={<IncidentQueue />} />
            <Route path="/incidents/:id" element={<IncidentDetail />} />
            <Route path="/federation" element={<FederationDemo />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route
              path="*"
              element={
                <div className="page">
                  <h1 className="page-title">Page not found</h1>
                  <Link to="/">Return to console</Link>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
