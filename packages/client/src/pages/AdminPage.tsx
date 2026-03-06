import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { GoldButton } from '../components/GoldButton';

type Tab = 'cards' | 'users' | 'sessions';

interface CardItem {
  id: string;
  name: string;
  type: string;
  deck: string;
  set?: string;
  description: string;
  _file: string;
  [key: string]: unknown;
}

interface UserItem {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
}

interface SessionItem {
  id: string;
  name: string;
  phase: string;
  playerCount: number;
  adminName: string;
}

interface CardSet {
  count: number;
  types: Record<string, number>;
}

export function AdminPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [tab, setTab] = useState<Tab>('cards');
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const res = await fetch('/admin/cards/sets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAuthorized(res.ok);
    } catch {
      setAuthorized(false);
    }
  };

  if (authorized === null) {
    return <div style={{ padding: '32px', color: 'var(--color-text)' }}>Checking admin access...</div>;
  }

  if (!authorized) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-fantasy)' }}>Access Denied</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>You don't have admin privileges.</p>
        <GoldButton onClick={() => navigate('/')}>Back to Lobby</GoldButton>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-fantasy)', margin: 0 }}>
          Admin Panel
        </h1>
        <GoldButton variant="danger" onClick={() => navigate('/')}>Back to Lobby</GoldButton>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {(['cards', 'users', 'sessions'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px',
              background: tab === t ? 'var(--color-gold)' : 'transparent',
              color: tab === t ? 'var(--color-bg)' : 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-fantasy)',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'cards' && <CardsTab token={token!} />}
      {tab === 'users' && <UsersTab token={token!} />}
      {tab === 'sessions' && <SessionsTab token={token!} />}
    </div>
  );
}

// --- Cards Tab ---
function CardsTab({ token }: { token: string }) {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [sets, setSets] = useState<Record<string, CardSet>>({});
  const [filterSet, setFilterSet] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CardItem | null>(null);
  const [editJson, setEditJson] = useState('');
  const [creating, setCreating] = useState(false);
  const [createJson, setCreateJson] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchSets(); }, []);
  useEffect(() => { fetchCards(); }, [filterSet, filterType, search]);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchSets = async () => {
    const res = await fetch('/admin/cards/sets', { headers });
    if (res.ok) { const data = await res.json(); setSets(data.sets); }
  };

  const fetchCards = async () => {
    const params = new URLSearchParams();
    if (filterSet) params.set('set', filterSet);
    if (filterType) params.set('type', filterType);
    if (search) params.set('search', search);
    const res = await fetch(`/admin/cards?${params}`, { headers });
    if (res.ok) { const data = await res.json(); setCards(data.cards); }
  };

  const saveCard = async () => {
    setError('');
    try {
      const parsed = JSON.parse(editJson);
      const res = await fetch(`/admin/cards/${editing!.id}`, {
        method: 'PUT', headers, body: JSON.stringify(parsed),
      });
      if (res.ok) { setEditing(null); fetchCards(); fetchSets(); }
      else { const d = await res.json(); setError(d.error); }
    } catch (e: any) { setError(e.message); }
  };

  const createCard = async () => {
    setError('');
    try {
      const parsed = JSON.parse(createJson);
      const res = await fetch('/admin/cards', {
        method: 'POST', headers, body: JSON.stringify(parsed),
      });
      if (res.ok) { setCreating(false); setCreateJson(''); fetchCards(); fetchSets(); }
      else { const d = await res.json(); setError(d.error); }
    } catch (e: any) { setError(e.message); }
  };

  const deleteCard = async (id: string) => {
    if (!confirm(`Delete card "${id}"?`)) return;
    const res = await fetch(`/admin/cards/${id}`, { method: 'DELETE', headers });
    if (res.ok) { fetchCards(); fetchSets(); }
  };

  const cardTypes = ['MONSTER', 'EQUIPMENT', 'ONE_SHOT', 'CURSE', 'RACE', 'CLASS', 'MODIFIER', 'SPECIAL'];

  return (
    <div>
      {/* Sets overview */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {Object.entries(sets).map(([name, info]) => (
          <div
            key={name}
            onClick={() => setFilterSet(filterSet === name ? '' : name)}
            style={{
              padding: '8px 14px',
              background: filterSet === name ? 'var(--color-gold)' : 'var(--color-surface)',
              color: filterSet === name ? 'var(--color-bg)' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <strong>{name}</strong> ({info.count} cards)
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={selectStyle}
        >
          <option value="">All types</option>
          {cardTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
        />
        <GoldButton onClick={() => { setCreating(true); setCreateJson(JSON.stringify({ id: '', name: '', deck: 'DOOR', type: 'MONSTER', set: 'base', description: '', effects: [] }, null, 2)); }}>
          + New Card
        </GoldButton>
      </div>

      {error && <div style={{ color: 'var(--color-danger)', marginBottom: '8px', fontSize: '13px' }}>{error}</div>}

      {/* Create modal */}
      {creating && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={modalTitle}>Create Card</h3>
            <textarea value={createJson} onChange={(e) => setCreateJson(e.target.value)} style={textareaStyle} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <GoldButton onClick={createCard}>Create</GoldButton>
              <GoldButton variant="danger" onClick={() => setCreating(false)}>Cancel</GoldButton>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={modalTitle}>Edit: {editing.name}</h3>
            <textarea value={editJson} onChange={(e) => setEditJson(e.target.value)} style={textareaStyle} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <GoldButton onClick={saveCard}>Save</GoldButton>
              <GoldButton variant="danger" onClick={() => setEditing(null)}>Cancel</GoldButton>
            </div>
          </div>
        </div>
      )}

      {/* Card list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ ...rowStyle, fontWeight: 700, color: 'var(--color-gold)', background: 'none', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ width: '200px' }}>ID</span>
          <span style={{ width: '200px' }}>Name</span>
          <span style={{ width: '100px' }}>Type</span>
          <span style={{ width: '80px' }}>Set</span>
          <span style={{ width: '60px' }}>Deck</span>
          <span style={{ flex: 1 }}>Actions</span>
        </div>
        {cards.map((card) => (
          <div key={card.id} style={rowStyle}>
            <span style={{ width: '200px', fontSize: '12px', color: 'var(--color-text-muted)' }}>{card.id}</span>
            <span style={{ width: '200px', color: 'var(--color-text)' }}>{card.name}</span>
            <span style={{ width: '100px', fontSize: '12px', color: 'var(--color-text-muted)' }}>{card.type}</span>
            <span style={{ width: '80px', fontSize: '12px', color: 'var(--color-gold)' }}>{card.set || '-'}</span>
            <span style={{ width: '60px', fontSize: '12px', color: 'var(--color-text-muted)' }}>{card.deck}</span>
            <span style={{ flex: 1, display: 'flex', gap: '4px' }}>
              <GoldButton onClick={() => { setEditing(card); setEditJson(JSON.stringify(card, null, 2)); }}>Edit</GoldButton>
              <GoldButton variant="danger" onClick={() => deleteCard(card.id)}>Del</GoldButton>
            </span>
          </div>
        ))}
        {cards.length === 0 && (
          <div style={{ color: 'var(--color-text-muted)', padding: '16px' }}>No cards found.</div>
        )}
      </div>
    </div>
  );
}

// --- Users Tab ---
function UsersTab({ token }: { token: string }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const res = await fetch('/admin/users', { headers });
    if (res.ok) { const data = await res.json(); setUsers(data.users); }
  };

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    await fetch(`/admin/users/${userId}`, {
      method: 'PUT', headers, body: JSON.stringify({ isAdmin: !isAdmin }),
    });
    fetchUsers();
  };

  const deleteUser = async (userId: string, name: string) => {
    if (!confirm(`Delete user "${name}"?`)) return;
    await fetch(`/admin/users/${userId}`, { method: 'DELETE', headers });
    fetchUsers();
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ ...rowStyle, fontWeight: 700, color: 'var(--color-gold)', background: 'none', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ width: '250px' }}>Email</span>
          <span style={{ width: '150px' }}>Name</span>
          <span style={{ width: '80px' }}>Admin</span>
          <span style={{ width: '180px' }}>Registered</span>
          <span style={{ flex: 1 }}>Actions</span>
        </div>
        {users.map((u) => (
          <div key={u.id} style={rowStyle}>
            <span style={{ width: '250px', color: 'var(--color-text)', fontSize: '13px' }}>{u.email}</span>
            <span style={{ width: '150px', color: 'var(--color-text)' }}>{u.name}</span>
            <span style={{ width: '80px', color: u.isAdmin ? 'var(--color-gold)' : 'var(--color-text-muted)' }}>
              {u.isAdmin ? 'Yes' : 'No'}
            </span>
            <span style={{ width: '180px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {new Date(u.createdAt).toLocaleDateString()}
            </span>
            <span style={{ flex: 1, display: 'flex', gap: '4px' }}>
              <GoldButton onClick={() => toggleAdmin(u.id, u.isAdmin)}>
                {u.isAdmin ? 'Revoke Admin' : 'Make Admin'}
              </GoldButton>
              <GoldButton variant="danger" onClick={() => deleteUser(u.id, u.name)}>Delete</GoldButton>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Sessions Tab ---
function SessionsTab({ token }: { token: string }) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    const res = await fetch('/admin/sessions', { headers });
    if (res.ok) { const data = await res.json(); setSessions(data.sessions); }
  };

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <GoldButton onClick={fetchSessions}>Refresh</GoldButton>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ ...rowStyle, fontWeight: 700, color: 'var(--color-gold)', background: 'none', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ width: '200px' }}>Room Name</span>
          <span style={{ width: '120px' }}>Phase</span>
          <span style={{ width: '100px' }}>Players</span>
          <span style={{ width: '150px' }}>Admin</span>
        </div>
        {sessions.map((s) => (
          <div key={s.id} style={rowStyle}>
            <span style={{ width: '200px', color: 'var(--color-text)' }}>{s.name}</span>
            <span style={{ width: '120px', color: s.phase === 'PLAYING' ? 'var(--color-gold)' : 'var(--color-text-muted)' }}>{s.phase}</span>
            <span style={{ width: '100px', color: 'var(--color-text)' }}>{s.playerCount}</span>
            <span style={{ width: '150px', color: 'var(--color-text-muted)' }}>{s.adminName}</span>
          </div>
        ))}
        {sessions.length === 0 && (
          <div style={{ color: 'var(--color-text-muted)', padding: '16px' }}>No active sessions.</div>
        )}
      </div>
    </div>
  );
}

// --- Styles ---
const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: '13px',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  background: 'var(--color-surface)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '13px',
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const modalContent: React.CSSProperties = {
  background: 'var(--color-surface)',
  padding: '24px',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  width: '600px',
  maxHeight: '80vh',
};

const modalTitle: React.CSSProperties = {
  color: 'var(--color-gold)',
  fontFamily: 'var(--font-fantasy)',
  margin: 0,
};

const textareaStyle: React.CSSProperties = {
  padding: '10px',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: '12px',
  fontFamily: 'monospace',
  minHeight: '300px',
  resize: 'vertical',
  outline: 'none',
};
