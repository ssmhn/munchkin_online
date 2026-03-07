import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './theme.css';
import { useAuthStore } from './stores/useAuthStore';
import { AuthPage } from './pages/AuthPage';
import { LobbyPage } from './pages/LobbyPage';
import { RoomPage } from './pages/RoomPage';
import { JoinPage } from './pages/JoinPage';
import { GamePage } from './pages/GamePage';
import { AdminPage } from './pages/AdminPage';
const isDev = import.meta.env.DEV;

// Lazy-load test pages only in development
const TestBoardPage = isDev ? React.lazy(() => import('./pages/TestBoardPage').then(m => ({ default: m.TestBoardPage }))) : null;
const TestCombatPage = isDev ? React.lazy(() => import('./pages/TestCombatPage').then(m => ({ default: m.TestCombatPage }))) : null;
const TestReactionPage = isDev ? React.lazy(() => import('./pages/TestReactionPage').then(m => ({ default: m.TestReactionPage }))) : null;
const TestChoicePage = isDev ? React.lazy(() => import('./pages/TestChoicePage').then(m => ({ default: m.TestChoicePage }))) : null;
const TestDesignPage = isDev ? React.lazy(() => import('./pages/TestDesignPage').then(m => ({ default: m.TestDesignPage }))) : null;
const TestNegotiationPage = isDev ? React.lazy(() => import('./pages/TestNegotiationPage').then(m => ({ default: m.TestNegotiationPage }))) : null;
const TestCardDrawPage = isDev ? React.lazy(() => import('./pages/TestCardDrawPage').then(m => ({ default: m.TestCardDrawPage }))) : null;
const TestDoorKickPage = isDev ? React.lazy(() => import('./pages/TestDoorKickPage').then(m => ({ default: m.TestDoorKickPage }))) : null;
const TestCombatResultPage = isDev ? React.lazy(() => import('./pages/TestCombatResultPage').then(m => ({ default: m.TestCombatResultPage }))) : null;
const TestCardHandPage = isDev ? React.lazy(() => import('./pages/TestCardHandPage').then(m => ({ default: m.TestCardHandPage }))) : null;
const TestDoppelgangerPage = isDev ? React.lazy(() => import('./pages/TestDoppelgangerPage').then(m => ({ default: m.TestDoppelgangerPage }))) : null;
const TestDiceRollPage = isDev ? React.lazy(() => import('./pages/TestDiceRollPage').then(m => ({ default: m.TestDiceRollPage }))) : null;
const TestAmbientPage = isDev ? React.lazy(() => import('./pages/TestAmbientPage').then(m => ({ default: m.TestAmbientPage }))) : null;
const TestVictoryPage = isDev ? React.lazy(() => import('./pages/TestVictoryPage').then(m => ({ default: m.TestVictoryPage }))) : null;

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuthStore();

  if (loading) {
    return <div className="p-8 text-munch-text">Loading...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AuthRedirect() {
  const { token, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && token) {
      // Check for pending invite redirect
      const pendingInvite = sessionStorage.getItem('pendingInvite');
      if (pendingInvite) {
        sessionStorage.removeItem('pendingInvite');
        navigate(pendingInvite, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [token, loading, navigate]);

  if (loading) {
    return <div className="p-8 text-munch-text">Loading...</div>;
  }

  if (token) {
    return null;
  }

  return <AuthPage />;
}

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<AuthRedirect />} />
      <Route path="/join/:roomId" element={<JoinPage />} />
      <Route path="/" element={<AuthGuard><LobbyPage /></AuthGuard>} />
      <Route path="/room/:roomId" element={<AuthGuard><RoomPage /></AuthGuard>} />
      <Route path="/game/:roomId" element={<AuthGuard><GamePage /></AuthGuard>} />
      <Route path="/admin" element={<AuthGuard><AdminPage /></AuthGuard>} />
      {isDev && (
        <>
          <Route path="/test-board" element={<React.Suspense fallback={null}>{TestBoardPage && <TestBoardPage />}</React.Suspense>} />
          <Route path="/test-combat" element={<React.Suspense fallback={null}>{TestCombatPage && <TestCombatPage />}</React.Suspense>} />
          <Route path="/test-reaction" element={<React.Suspense fallback={null}>{TestReactionPage && <TestReactionPage />}</React.Suspense>} />
          <Route path="/test-choice" element={<React.Suspense fallback={null}>{TestChoicePage && <TestChoicePage />}</React.Suspense>} />
          <Route path="/test-design" element={<React.Suspense fallback={null}>{TestDesignPage && <TestDesignPage />}</React.Suspense>} />
          <Route path="/test-negotiation" element={<React.Suspense fallback={null}>{TestNegotiationPage && <TestNegotiationPage />}</React.Suspense>} />
          <Route path="/test-card-draw" element={<React.Suspense fallback={null}>{TestCardDrawPage && <TestCardDrawPage />}</React.Suspense>} />
          <Route path="/test-door-kick" element={<React.Suspense fallback={null}>{TestDoorKickPage && <TestDoorKickPage />}</React.Suspense>} />
          <Route path="/test-combat-result" element={<React.Suspense fallback={null}>{TestCombatResultPage && <TestCombatResultPage />}</React.Suspense>} />
          <Route path="/test-card-hand" element={<React.Suspense fallback={null}>{TestCardHandPage && <TestCardHandPage />}</React.Suspense>} />
          <Route path="/test-doppelganger" element={<React.Suspense fallback={null}>{TestDoppelgangerPage && <TestDoppelgangerPage />}</React.Suspense>} />
          <Route path="/test-dice-roll" element={<React.Suspense fallback={null}>{TestDiceRollPage && <TestDiceRollPage />}</React.Suspense>} />
          <Route path="/test-ambient" element={<React.Suspense fallback={null}>{TestAmbientPage && <TestAmbientPage />}</React.Suspense>} />
          <Route path="/test-victory" element={<React.Suspense fallback={null}>{TestVictoryPage && <TestVictoryPage />}</React.Suspense>} />
        </>
      )}
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
