import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Activity, Trophy, Calendar as CalendarIcon, RefreshCw, 
  Moon, Sun, Trash2, ExternalLink, ArrowLeft, Edit2, TrendingUp,
  Github, Code, Terminal, Award, ChevronDown
} from 'lucide-react';

// --- UTILITIES ---

const getStartOfWeek = () => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay(); 
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isDateInCurrentWeek = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const startOfWeek = getStartOfWeek();
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  
  const dateTime = date.getTime();
  return dateTime >= startOfWeek.getTime() && dateTime < endOfWeek.getTime();
};

// --- MOCK DATA ---
const mockFetchUserProfile = async (handle, platform) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: Date.now(),
        username: handle, 
        handle: handle,
        platform: platform,
        totalSolved: Math.floor(Math.random() * 50) + 10,
        streak: Math.floor(Math.random() * 5) + 1,
        history: Array.from({ length: 14 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (i + 1));
          return Math.random() > 0.5 
            ? { date: date.toISOString().split('T')[0], count: Math.floor(Math.random() * 3) + 1 } 
            : null;
        }).filter(Boolean),
        manualLogs: []
      });
    }, 800); 
  });
};

// --- COMPONENTS ---

const Card = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-emerald-500/30' : ''} ${className}`}
  >
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, size = "md", type = "button" }) => {
  const baseStyle = "rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 shadow-lg",
    secondary: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600",
    outline: "border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-500",
    danger: "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20",
    ghost: "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
  };

  return (
    <button type={type} onClick={onClick} className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

const PlatformIcon = ({ platform }) => {
  switch (platform) {
    case 'GitHub': return <Github size={14} />;
    case 'Codeforces': return <Terminal size={14} />;
    case 'HackerRank': return <Code size={14} />;
    default: return <Activity size={14} />; 
  }
};

const WeeklyLeaderboard = ({ users }) => {
  const rankedUsers = useMemo(() => {
    return users.map(user => {
      const weeklyCount = (user.history || [])
        .filter(h => isDateInCurrentWeek(h.date))
        .reduce((acc, curr) => acc + curr.count, 0);
      return { ...user, weeklyCount };
    }).sort((a, b) => b.weeklyCount - a.weeklyCount);
  }, [users]);

  return (
    <Card className="p-0 overflow-hidden mb-8 border-none ring-1 ring-slate-200 dark:ring-slate-700">
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Trophy className="text-amber-500" size={18} /> Weekly Rankings
        </h3>
        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Sunday Reset</span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {rankedUsers.map((user, idx) => (
          <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                idx === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
              }`}>
                {idx + 1}
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{user.username}</div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                   <PlatformIcon platform={user.platform} /> {user.platform}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-lg font-black text-emerald-500">{user.weeklyCount}</span>
              <span className="text-[9px] uppercase font-bold text-slate-400">Points</span>
            </div>
          </div>
        ))}
        {users.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">Add a rival to start the race!</div>}
      </div>
    </Card>
  );
};

const ProfileView = ({ user, onBack, onUpdateUser, onDeleteUser }) => {
  if (!user) return null;
  const [timeframe, setTimeframe] = useState('Month');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: user.username, handle: user.handle });

  const filteredHistory = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (timeframe === 'Week') cutoff.setDate(now.getDate() - 7);
    if (timeframe === 'Month') cutoff.setDate(now.getDate() - 30);
    if (timeframe === 'Year') cutoff.setDate(now.getDate() - 365);

    return (user.history || [])
      .filter(h => new Date(h.date) >= cutoff)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [user.history, timeframe]);

  const saveProfile = () => {
    onUpdateUser(user.id, { username: editForm.username, handle: editForm.handle });
    setIsEditing(false);
  };

  const weeklyScore = useMemo(() => {
    return (user.history || []).filter(h => isDateInCurrentWeek(h.date)).reduce((a, b) => a + b.count, 0);
  }, [user.history]);

  return (
    <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-emerald-500 mb-6 transition-colors text-sm font-medium">
        <ArrowLeft size={16} /> Dashboard
      </button>

      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-emerald-500/20">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              {isEditing ? (
                <div className="space-y-2">
                  <input 
                    className="block text-xl font-bold bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editForm.username}
                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                  />
                  <input 
                    className="block text-sm font-mono bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1 text-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editForm.handle}
                    onChange={(e) => setEditForm({...editForm, handle: e.target.value})}
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{user.username}</h1>
                  <div className="flex items-center gap-2 text-slate-500">
                    <PlatformIcon platform={user.platform} /> 
                    <span className="font-mono text-sm">@{user.handle}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Button onClick={saveProfile} size="sm">Save Changes</Button>
            ) : (
              <Button onClick={() => setIsEditing(true)} variant="secondary" size="sm"><Edit2 size={14}/> Edit</Button>
            )}
            <Button onClick={() => onDeleteUser(user.id)} variant="danger" size="sm" className="bg-red-500/10"><Trash2 size={14}/></Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Solved', val: user.totalSolved, color: 'text-slate-800 dark:text-white' },
          { label: 'Weekly Score', val: weeklyScore, color: 'text-emerald-500' },
          { label: 'Streak', val: `${user.streak}d`, color: 'text-orange-500' },
          { label: 'Platform', val: user.platform, color: 'text-slate-400', isLabel: true },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">{s.label}</div>
            <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-bold flex items-center gap-2"><CalendarIcon size={18} className="text-emerald-500"/> Activity Log</h3>
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            {['Week', 'Month', 'Year'].map(t => (
              <button key={t} onClick={() => setTimeframe(t)} className={`px-4 py-1.5 text-xs rounded-md transition-all ${timeframe === t ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-500 font-bold' : 'text-slate-500'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {filteredHistory.length === 0 ? <div className="py-12 text-center text-slate-500 text-sm">No submissions recorded for this period.</div> : 
            filteredHistory.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="text-xs font-mono text-slate-500">{h.date}</div>
                  <div className="font-bold text-sm">Solved {h.count} problem{h.count > 1 ? 's' : ''}</div>
                </div>
                {h.count > 2 && <Award size={16} className="text-amber-500" />}
              </div>
            ))
          }
        </div>
      </Card>
    </div>
  );
};

const UserCard = ({ user, onClick, onLog }) => {
  const weeklyPoints = useMemo(() => {
    return (user.history || [])
      .filter(h => isDateInCurrentWeek(h.date))
      .reduce((acc, curr) => acc + curr.count, 0);
  }, [user.history]);

  return (
    <Card onClick={() => onClick(user)} className="p-5 group relative">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-emerald-500 transition-colors">{user.username}</h4>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-bold tracking-tight">
              <PlatformIcon platform={user.platform} /> {user.platform}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-emerald-500">{weeklyPoints}</div>
          <div className="text-[9px] text-slate-400 uppercase font-bold">This Week</div>
        </div>
      </div>
      
      <div className="flex gap-1 h-6 items-end mb-4 bg-slate-50 dark:bg-slate-900/50 rounded p-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i < weeklyPoints ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} style={{ height: '100%' }} />
        ))}
      </div>

      <Button 
        onClick={(e) => { e.stopPropagation(); onLog(user.id); }} 
        variant="secondary" 
        className="w-full text-xs h-9 font-bold"
      >
        <Plus size={14} /> Log Progress
      </Button>
    </Card>
  );
};

// --- MAIN APP ---

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedUserId, setSelectedUserId] = useState(null);
  
  // Load from localStorage
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('code_rivals_users');
      return saved ? JSON.parse(saved) : [
        {
          id: 1,
          username: 'YourName',
          handle: 'dev_user',
          platform: 'LeetCode',
          totalSolved: 10,
          streak: 1,
          history: [{ date: new Date().toISOString().split('T')[0], count: 2 }], 
          manualLogs: []
        }
      ];
    } catch (e) {
      return [];
    }
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('code_rivals_users', JSON.stringify(users));
  }, [users]);

  const [isAdding, setIsAdding] = useState(false);
  const [newUserHandle, setNewUserHandle] = useState('');
  const [newUserPlatform, setNewUserPlatform] = useState('LeetCode');
  const [isLoading, setIsLoading] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logUserId, setLogUserId] = useState(null);
  const [newLogTitle, setNewLogTitle] = useState('');

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserHandle) return;
    setIsLoading(true);
    try {
      const data = await mockFetchUserProfile(newUserHandle, newUserPlatform);
      setUsers(prev => [...prev, data]);
      setNewUserHandle('');
      setIsAdding(false);
    } catch (err) { alert("Error syncing"); } 
    finally { setIsLoading(false); }
  };

  const submitLog = () => {
    if (!newLogTitle || logUserId === null) return;
    const today = new Date().toISOString().split('T')[0];

    setUsers(prevUsers => {
      return prevUsers.map(u => {
        if (u.id === logUserId) {
          const newHistory = [...(u.history || [])];
          const existingIdx = newHistory.findIndex(h => h.date === today);
          
          if (existingIdx >= 0) {
            newHistory[existingIdx] = { 
              ...newHistory[existingIdx], 
              count: (newHistory[existingIdx].count || 0) + 1 
            };
          } else {
            newHistory.push({ date: today, count: 1 });
          }

          return {
            ...u,
            totalSolved: (u.totalSolved || 0) + 1,
            history: newHistory,
            manualLogs: [...(u.manualLogs || []), { title: newLogTitle, date: today }]
          };
        }
        return u;
      });
    });

    setLogModalOpen(false);
    setNewLogTitle('');
  };

  return (
    <div className={`min-h-screen transition-all duration-500 font-sans ${darkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveView('dashboard')}>
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
              <Activity size={18} />
            </div>
            <span className="font-black text-lg tracking-tighter uppercase">Code<span className="text-emerald-500">Rivals</span></span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-emerald-500 transition-colors">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {activeView === 'dashboard' ? (
          <div className="animate-in fade-in duration-700">
            <WeeklyLeaderboard users={users} />

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500"/> Active Rivals</h2>
              <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "secondary" : "primary"} size="sm">
                {isAdding ? 'Close' : <><Plus size={16} /> New Rival</>}
              </Button>
            </div>

            {isAdding && (
              <Card className="mb-8 p-5 border-emerald-500/20 bg-emerald-500/[0.02] animate-in slide-in-from-top-2">
                <form onSubmit={handleAddUser} className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Handle / Username</label>
                    <input 
                      placeholder="e.g. neal_wu" 
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newUserHandle}
                      onChange={e => setNewUserHandle(e.target.value)}
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Platform</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newUserPlatform}
                        onChange={e => setNewUserPlatform(e.target.value)}
                      >
                        <option value="LeetCode">LeetCode</option>
                        <option value="Codeforces">Codeforces</option>
                        <option value="HackerRank">HackerRank</option>
                        <option value="GitHub">GitHub</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full md:w-auto h-[38px]" disabled={isLoading}>
                      {isLoading ? 'Syncing...' : 'Add Rival'}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {users.map(u => (
                <UserCard 
                  key={u.id} 
                  user={u} 
                  onClick={(user) => { setSelectedUserId(user.id); setActiveView('profile'); }} 
                  onLog={(id) => { setLogUserId(id); setLogModalOpen(true); }}
                />
              ))}
            </div>
          </div>
        ) : (
          <ProfileView 
            user={users.find(u => u.id === selectedUserId)} 
            onBack={() => setActiveView('dashboard')} 
            onUpdateUser={(id, up) => setUsers(prev => prev.map(u => u.id === id ? {...u, ...up} : u))}
            onDeleteUser={(id) => { setUsers(prev => prev.filter(u => u.id !== id)); setActiveView('dashboard'); }}
          />
        )}
      </main>

      {/* Log Modal */}
      {logModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-lg mb-4">Log Problem Solved</h3>
            <p className="text-xs text-slate-500 mb-4">This adds 1 point to your weekly ranking.</p>
            <input 
              autoFocus
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 mb-4 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Reverse Linked List"
              value={newLogTitle}
              onChange={e => setNewLogTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitLog()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setLogModalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={submitLog}>Add Point</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}