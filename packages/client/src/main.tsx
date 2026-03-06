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
import { TestBoardPage } from './pages/TestBoardPage';
import { TestCombatPage } from './pages/TestCombatPage';
import { TestReactionPage } from './pages/TestReactionPage';
import { TestChoicePage } from './pages/TestChoicePage';
import { TestDesignPage } from './pages/TestDesignPage';
import { TestNegotiationPage } from './pages/TestNegotiationPage';
import { TestCardDrawPage } from './pages/TestCardDrawPage';
import { TestDoorKickPage } from './pages/TestDoorKickPage';
import { TestCombatResultPage } from './pages/TestCombatResultPage';
import { TestCardHandPage } from './pages/TestCardHandPage';
import { TestDoppelgangerPage } from './pages/TestDoppelgangerPage';
import { TestDiceRollPage } from './pages/TestDiceRollPage';
import { TestAmbientPage } from './pages/TestAmbientPage';
import { TestVictoryPage } from './pages/TestVictoryPage';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuthStore();

  if (loading) {
    return <div style={{ padding: '32px', color: 'var(--color-text)' }}>Loading...</div>;
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
    return <div style={{ padding: '32px', color: 'var(--color-text)' }}>Loading...</div>;
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
      <Route path="/test-board" element={<TestBoardPage />} />
      <Route path="/test-combat" element={<TestCombatPage />} />
      <Route path="/test-reaction" element={<TestReactionPage />} />
      <Route path="/test-choice" element={<TestChoicePage />} />
      <Route path="/test-design" element={<TestDesignPage />} />
      <Route path="/test-negotiation" element={<TestNegotiationPage />} />
      <Route path="/test-card-draw" element={<TestCardDrawPage />} />
      <Route path="/test-door-kick" element={<TestDoorKickPage />} />
      <Route path="/test-combat-result" element={<TestCombatResultPage />} />
      <Route path="/test-card-hand" element={<TestCardHandPage />} />
      <Route path="/test-doppelganger" element={<TestDoppelgangerPage />} />
      <Route path="/test-dice-roll" element={<TestDiceRollPage />} />
      <Route path="/test-ambient" element={<TestAmbientPage />} />
      <Route path="/test-victory" element={<TestVictoryPage />} />
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
