import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './theme.css';
import { LobbyPage } from './pages/LobbyPage';
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/game/:roomId" element={<GamePage />} />
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
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
