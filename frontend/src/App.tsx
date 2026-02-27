import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OrgProvider } from './context/OrgContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { OrgLayout } from './components/OrgLayout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Invite } from './pages/Invite';
import { PublicStatusPage } from './pages/PublicStatusPage';
import { OrgList } from './pages/OrgList';
import { Dashboard } from './pages/Dashboard';
import { StatusPage } from './pages/StatusPage';
import { History } from './pages/History';
import { Notifications } from './pages/Notifications';
import { Incidents } from './pages/Incidents';
import { Settings } from './pages/Settings';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/invite/:token" element={<Invite />} />
          <Route path="/status/:orgSlug" element={<PublicStatusPage />} />
          <Route
            path="/orgs"
            element={
              <ProtectedRoute>
                <OrgProvider>
                  <Outlet />
                </OrgProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<AppShell><OrgList /></AppShell>} />
            <Route path=":orgId" element={<OrgLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="status" element={<StatusPage />} />
              <Route path="endpoints/:endpointId/history" element={<History />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="incidents" element={<Incidents />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
