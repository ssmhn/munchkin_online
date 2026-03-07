import { useState, useEffect } from 'react';
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

const inputClasses = "py-2 px-3 bg-munch-bg text-munch-text border border-munch-border rounded-md text-[13px] outline-none";
const selectClasses = `${inputClasses} cursor-pointer`;
const rowClasses = "flex items-center gap-2 py-2 px-3 bg-munch-surface rounded-sm text-[13px]";

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
    return <div className="p-8 text-munch-text">Checking admin access...</div>;
  }

  if (!authorized) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-munch-danger font-fantasy">Access Denied</h2>
        <p className="text-munch-text-muted">You don't have admin privileges.</p>
        <GoldButton onClick={() => navigate('/')}>Back to Lobby</GoldButton>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-munch-gold font-fantasy m-0">
          Admin Panel
        </h1>
        <GoldButton variant="danger" onClick={() => navigate('/')}>Back to Lobby</GoldButton>
      </div>

      <div className="flex gap-2 mb-6">
        {(['cards', 'users', 'sessions'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-2 px-5 border border-munch-border rounded-md font-fantasy font-bold cursor-pointer capitalize ${tab === t ? 'bg-munch-gold text-munch-bg' : 'bg-transparent text-munch-text-muted'}`}
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
      <div className="flex gap-3 flex-wrap mb-4">
        {Object.entries(sets).map(([name, info]) => (
          <div
            key={name}
            onClick={() => setFilterSet(filterSet === name ? '' : name)}
            className={`py-2 px-3.5 border border-munch-border rounded-md cursor-pointer text-[13px] ${filterSet === name ? 'bg-munch-gold text-munch-bg' : 'bg-munch-surface text-munch-text'}`}
          >
            <strong>{name}</strong> ({info.count} cards)
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={selectClasses}
        >
          <option value="">All types</option>
          {cardTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClasses} flex-1 min-w-[200px]`}
        />
        <GoldButton onClick={() => { setCreating(true); setCreateJson(JSON.stringify({ id: '', name: '', deck: 'DOOR', type: 'MONSTER', set: 'base', description: '', effects: [] }, null, 2)); }}>
          + New Card
        </GoldButton>
      </div>

      {error && <div className="text-munch-danger mb-2 text-[13px]">{error}</div>}

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-100">
          <div className="bg-munch-surface p-6 rounded-lg border border-munch-border flex flex-col gap-3 w-[600px] max-h-[80vh]">
            <h3 className="text-munch-gold font-fantasy m-0">Create Card</h3>
            <textarea value={createJson} onChange={(e) => setCreateJson(e.target.value)} className="p-2.5 bg-munch-bg text-munch-text border border-munch-border rounded-md text-xs font-mono min-h-[300px] resize-y outline-none" />
            <div className="flex gap-2">
              <GoldButton onClick={createCard}>Create</GoldButton>
              <GoldButton variant="danger" onClick={() => setCreating(false)}>Cancel</GoldButton>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-100">
          <div className="bg-munch-surface p-6 rounded-lg border border-munch-border flex flex-col gap-3 w-[600px] max-h-[80vh]">
            <h3 className="text-munch-gold font-fantasy m-0">Edit: {editing.name}</h3>
            <textarea value={editJson} onChange={(e) => setEditJson(e.target.value)} className="p-2.5 bg-munch-bg text-munch-text border border-munch-border rounded-md text-xs font-mono min-h-[300px] resize-y outline-none" />
            <div className="flex gap-2">
              <GoldButton onClick={saveCard}>Save</GoldButton>
              <GoldButton variant="danger" onClick={() => setEditing(null)}>Cancel</GoldButton>
            </div>
          </div>
        </div>
      )}

      {/* Card list */}
      <div className="flex flex-col gap-1">
        <div className={`${rowClasses} font-bold text-munch-gold !bg-transparent border-b border-munch-border`}>
          <span className="w-[200px]">ID</span>
          <span className="w-[200px]">Name</span>
          <span className="w-[100px]">Type</span>
          <span className="w-[80px]">Set</span>
          <span className="w-[60px]">Deck</span>
          <span className="flex-1">Actions</span>
        </div>
        {cards.map((card) => (
          <div key={card.id} className={rowClasses}>
            <span className="w-[200px] text-xs text-munch-text-muted">{card.id}</span>
            <span className="w-[200px] text-munch-text">{card.name}</span>
            <span className="w-[100px] text-xs text-munch-text-muted">{card.type}</span>
            <span className="w-[80px] text-xs text-munch-gold">{card.set || '-'}</span>
            <span className="w-[60px] text-xs text-munch-text-muted">{card.deck}</span>
            <span className="flex-1 flex gap-1">
              <GoldButton onClick={() => { setEditing(card); setEditJson(JSON.stringify(card, null, 2)); }}>Edit</GoldButton>
              <GoldButton variant="danger" onClick={() => deleteCard(card.id)}>Del</GoldButton>
            </span>
          </div>
        ))}
        {cards.length === 0 && (
          <div className="text-munch-text-muted p-4">No cards found.</div>
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
      <div className="flex flex-col gap-1">
        <div className={`${rowClasses} font-bold text-munch-gold !bg-transparent border-b border-munch-border`}>
          <span className="w-[250px]">Email</span>
          <span className="w-[150px]">Name</span>
          <span className="w-[80px]">Admin</span>
          <span className="w-[180px]">Registered</span>
          <span className="flex-1">Actions</span>
        </div>
        {users.map((u) => (
          <div key={u.id} className={rowClasses}>
            <span className="w-[250px] text-munch-text text-[13px]">{u.email}</span>
            <span className="w-[150px] text-munch-text">{u.name}</span>
            <span className={`w-[80px] ${u.isAdmin ? 'text-munch-gold' : 'text-munch-text-muted'}`}>
              {u.isAdmin ? 'Yes' : 'No'}
            </span>
            <span className="w-[180px] text-xs text-munch-text-muted">
              {new Date(u.createdAt).toLocaleDateString()}
            </span>
            <span className="flex-1 flex gap-1">
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
      <div className="mb-3">
        <GoldButton onClick={fetchSessions}>Refresh</GoldButton>
      </div>
      <div className="flex flex-col gap-1">
        <div className={`${rowClasses} font-bold text-munch-gold !bg-transparent border-b border-munch-border`}>
          <span className="w-[200px]">Room Name</span>
          <span className="w-[120px]">Phase</span>
          <span className="w-[100px]">Players</span>
          <span className="w-[150px]">Admin</span>
        </div>
        {sessions.map((s) => (
          <div key={s.id} className={rowClasses}>
            <span className="w-[200px] text-munch-text">{s.name}</span>
            <span className={`w-[120px] ${s.phase === 'PLAYING' ? 'text-munch-gold' : 'text-munch-text-muted'}`}>{s.phase}</span>
            <span className="w-[100px] text-munch-text">{s.playerCount}</span>
            <span className="w-[150px] text-munch-text-muted">{s.adminName}</span>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="text-munch-text-muted p-4">No active sessions.</div>
        )}
      </div>
    </div>
  );
}
