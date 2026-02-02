import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Activity, Trophy, Calendar as CalendarIcon, RefreshCw, 
  Moon, Sun, Trash2, ExternalLink, ArrowLeft, Edit2, TrendingUp,
  Github, Code, Terminal, Award, Link as LinkIcon, AlertCircle
} from 'lucide-react';

// --- API UTILITIES ---

// Helper: Convert UNIX timestamp to Local YYYY-MM-DD
// Added safety check to prevent crashes on invalid dates
const getLocalDate = (timestamp) => {
  if (!timestamp || isNaN(timestamp)) return new Date().toLocaleDateString('en-CA');
  try {
    return new Date(timestamp * 1000).toLocaleDateString('en-CA'); 
  } catch (e) {
    return new Date().toLocaleDateString('en-CA');
  }
};

// 1. Codeforces Fetcher
const fetchCodeforcesData = async (handle) => {
  try {
    const response = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=500`);
    const data = await response.json();
    if (data.status !== "OK") throw new Error("User not found");
    
    const dailySolved = {};
    const totalUnique = new Set();
    
    data.result.forEach(sub => {
      if (sub.verdict === "OK") {
        const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
        totalUnique.add(problemId);
        
        // Safety check for creationTimeSeconds
        if (sub.creationTimeSeconds) {
            const date = getLocalDate(sub.creationTimeSeconds);
            if (!dailySolved[date]) {
              dailySolved[date] = new Set();
            }
            dailySolved[date].add(problemId);
        }
      }
    });

    const history = Object.keys(dailySolved).map(date => ({
      date,
      count: dailySolved[date].size
    }));
    
    return {
      totalSolved: totalUnique.size,
      history: history
    };
  } catch (err) {
    console.error("CF Fetch error:", err);
    return null;
  }
};

// 2. LeetCode Fetcher
const fetchLeetCodeData = async (handle) => {
  try {
    const response = await fetch(`https://leetcode-stats-api.herokuapp.com/${handle}`);
    const data = await response.json();

    if (data.status !== "success") throw new Error("User not found or API error");

    const history = Object.entries(data.submissionCalendar || {}).map(([ts, count]) => ({
      date: getLocalDate(parseInt(ts)),
      count: count
    }));

    return {
      totalSolved: data.totalSolved,
      history: history
    };
  } catch (err) {
    console.error("LC Fetch error:", err);
    return null;
  }
};

const extractHandle = (input, platform) => {
  if (!input) return '';
  const cleanInput = input.trim();
  
  if (platform === 'LeetCode') {
    const match = cleanInput.match(/leetcode\.com\/(?:u\/)?([^\/]+)/);
    return match ? match[1] : cleanInput;
  }
  
  if (platform === 'Codeforces') {
    const match = cleanInput.match(/codeforces\.com\/profile\/([^\/]+)/);
    return match ? match[1] : cleanInput;
  }
  
  return cleanInput;
};

// --- DATE UTILS ---

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
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  
  const startOfWeek = getStartOfWeek();
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  
  return date.getTime() >= startOfWeek.getTime() && date.getTime() < endOfWeek.getTime();
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
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 shadow-lg",
    secondary: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600",
    outline: "border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-500",
    danger: "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20",
    ghost: "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
  };
  return <button type={type} onClick={onClick} className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled}>{children}</button>;
};

const PlatformBadge = ({ type }) => {
  if (type === 'LeetCode') return <span className="text-[10px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/20">LeetCode</span>;
  if (type === 'Codeforces') return <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">Codeforces</span>;
  return null;
};

// --- VIEWS ---

const ProfileView = ({ user, onBack, onUpdateUser, onDeleteUser }) => {
  // HOOKS MUST BE AT THE TOP - Unconditional
  const [timeframe, setTimeframe] = useState('Month');
  const [isEditing, setIsEditing] = useState(false);
  
  // Initialize state with user data (safe access)
  const [editName, setEditName] = useState(user?.username || '');
  const [lcHandle, setLcHandle] = useState(user?.handles?.leetcode || '');
  const [cfHandle, setCfHandle] = useState(user?.handles?.codeforces || '');
  const [isSyncing, setIsSyncing] = useState(false);

  const combinedHistory = useMemo(() => {
    if (!user) return [];
    const historyMap = {};
    
    const merge = (hist) => {
      if (!hist) return;
      hist.forEach(entry => {
        historyMap[entry.date] = (historyMap[entry.date] || 0) + entry.count;
      });
    };

    merge(user.data?.leetcode?.history);
    merge(user.data?.codeforces?.history);

    const now = new Date();
    const cutoff = new Date();
    if (timeframe === 'Week') cutoff.setDate(now.getDate() - 7);
    if (timeframe === 'Month') cutoff.setDate(now.getDate() - 30);
    if (timeframe === 'Year') cutoff.setDate(now.getDate() - 365);

    return Object.keys(historyMap)
      .filter(dateStr => {
         const [y, m, d] = dateStr.split('-').map(Number);
         return new Date(y, m - 1, d) >= cutoff;
      })
      .sort((a, b) => new Date(b) - new Date(a))
      .map(date => ({ date, count: historyMap[date] }));
  }, [user, timeframe]);

  if (!user) return null; // Safe to return null after hooks if user is missing

  const saveProfile = async () => {
    setIsSyncing(true);
    const updates = { 
      username: editName,
      handles: { leetcode: extractHandle(lcHandle, 'LeetCode'), codeforces: extractHandle(cfHandle, 'Codeforces') },
      data: { ...user.data }
    };

    if (updates.handles.leetcode && updates.handles.leetcode !== user.handles?.leetcode) {
      const data = await fetchLeetCodeData(updates.handles.leetcode);
      if (data) updates.data.leetcode = data;
    }
    if (updates.handles.codeforces && updates.handles.codeforces !== user.handles?.codeforces) {
      const data = await fetchCodeforcesData(updates.handles.codeforces);
      if (data) updates.data.codeforces = data;
    }

    onUpdateUser(user.id, updates);
    setIsEditing(false);
    setIsSyncing(false);
  };

  const manualSync = async () => {
    setIsSyncing(true);
    const updates = { data: { ...user.data } };
    
    if (user.handles?.leetcode) {
      const data = await fetchLeetCodeData(user.handles.leetcode);
      if (data) updates.data.leetcode = data;
    }
    if (user.handles?.codeforces) {
      const data = await fetchCodeforcesData(user.handles.codeforces);
      if (data) updates.data.codeforces = data;
    }
    
    onUpdateUser(user.id, updates);
    setIsSyncing(false);
  };

  const totalSolved = (user.data?.leetcode?.totalSolved || 0) + (user.data?.codeforces?.totalSolved || 0);

  return (
    <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-emerald-500 mb-6 transition-colors text-sm font-medium">
        <ArrowLeft size={16} /> Dashboard
      </button>

      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-3xl font-bold shadow-lg shadow-emerald-500/20">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3 max-w-xs">
                  <input 
                    className="w-full text-lg font-bold bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Display Name"
                  />
                  <div className="relative">
                     <input 
                      className="w-full text-sm font-mono bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 pl-8 outline-none focus:ring-2 focus:ring-yellow-500"
                      value={lcHandle}
                      onChange={(e) => setLcHandle(e.target.value)}
                      placeholder="LeetCode Handle/URL"
                    />
                    <Activity size={14} className="absolute left-2.5 top-2 text-slate-400" />
                  </div>
                  <div className="relative">
                    <input 
                      className="w-full text-sm font-mono bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 pl-8 outline-none focus:ring-2 focus:ring-blue-500"
                      value={cfHandle}
                      onChange={(e) => setCfHandle(e.target.value)}
                      placeholder="Codeforces Handle/URL"
                    />
                    <Terminal size={14} className="absolute left-2.5 top-2 text-slate-400" />
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{user.username}</h1>
                  <div className="flex flex-wrap gap-2">
                    {user.handles?.leetcode && (
                      <div className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        <PlatformBadge type="LeetCode" />
                        <span className="font-mono text-slate-600 dark:text-slate-300">{user.handles.leetcode}</span>
                      </div>
                    )}
                    {user.handles?.codeforces && (
                      <div className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        <PlatformBadge type="Codeforces" />
                        <span className="font-mono text-slate-600 dark:text-slate-300">{user.handles.codeforces}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-row md:flex-col items-end gap-2">
            {isEditing ? (
              <Button onClick={saveProfile} size="sm" disabled={isSyncing}>{isSyncing ? 'Saving...' : 'Save Profile'}</Button>
            ) : (
              <>
                 <Button onClick={manualSync} variant="outline" size="sm" disabled={isSyncing}>
                    <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /> Sync Data
                 </Button>
                 <div className="flex gap-2">
                    <Button onClick={() => setIsEditing(true)} variant="secondary" size="sm"><Edit2 size={14}/> Edit</Button>
                    <Button onClick={() => onDeleteUser(user.id)} variant="danger" size="sm" className="bg-red-500/10"><Trash2 size={14}/></Button>
                 </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Total Solved</div>
            <div className="text-3xl font-black text-slate-800 dark:text-white">{totalSolved}</div>
        </Card>
        <Card className="p-4 text-center">
             <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">LC Solved</div>
             <div className="text-xl font-bold text-yellow-500">{user.data?.leetcode?.totalSolved || 0}</div>
        </Card>
        <Card className="p-4 text-center">
             <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">CF Solved</div>
             <div className="text-xl font-bold text-blue-500">{user.data?.codeforces?.totalSolved || 0}</div>
        </Card>
        <Card className="p-4 text-center">
             <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Activity</div>
             <div className="text-xl font-medium text-slate-500">{combinedHistory.length} days</div>
        </Card>
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
        <div className="space-y-2">
          {combinedHistory.length === 0 ? <div className="py-12 text-center text-slate-500 text-sm">No activity found. Try syncing or check handles.</div> : 
            combinedHistory.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="text-xs font-mono text-slate-500 w-20">{h.date}</div>
                  <div className="font-bold text-sm">Solved {h.count} problem{h.count > 1 ? 's' : ''}</div>
                </div>
                {h.count >= 3 && <Award size={16} className="text-amber-500" />}
              </div>
            ))
          }
        </div>
      </Card>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', leetcode: '', codeforces: '' });
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize state structure
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('code_rivals_users_v2'); 
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  useEffect(() => {
    localStorage.setItem('code_rivals_users_v2', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.name) return;
    setIsLoading(true);

    const userObj = {
      id: Date.now(),
      username: newUser.name,
      handles: {
        leetcode: extractHandle(newUser.leetcode, 'LeetCode'),
        codeforces: extractHandle(newUser.codeforces, 'Codeforces')
      },
      data: {}
    };

    if (userObj.handles.leetcode) {
      userObj.data.leetcode = await fetchLeetCodeData(userObj.handles.leetcode);
    }
    if (userObj.handles.codeforces) {
      userObj.data.codeforces = await fetchCodeforcesData(userObj.handles.codeforces);
    }

    setUsers(prev => [...prev, userObj]);
    setNewUser({ name: '', leetcode: '', codeforces: '' });
    setIsAdding(false);
    setIsLoading(false);
  };

  const updateUser = (id, updates) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const deleteUser = (id) => {
    setUsers(users.filter(u => u.id !== id));
    setActiveView('dashboard');
  };

  const calculateWeeklyScore = (user) => {
    let score = 0;
    const sumWeekly = (history) => {
      if (!history) return 0;
      return history
        .filter(h => isDateInCurrentWeek(h.date))
        .reduce((acc, curr) => acc + curr.count, 0);
    };
    score += sumWeekly(user.data?.leetcode?.history);
    score += sumWeekly(user.data?.codeforces?.history);
    return score;
  };

  const rankedUsers = useMemo(() => {
    return users.map(user => ({
      ...user,
      weeklyScore: calculateWeeklyScore(user)
    })).sort((a, b) => b.weeklyScore - a.weeklyScore);
  }, [users]);

  // Resolve user before render to prevent hook violation
  const selectedUser = users.find(u => u.id === selectedUserId);

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
            {/* Leaderboard */}
            <Card className="p-0 overflow-hidden mb-8 border-none ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <Trophy className="text-amber-500" size={18} /> Weekly Rankings
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {rankedUsers.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No rivals yet. Add a user to start.</div>
                ) : (
                  rankedUsers.map((user, idx) => (
                    <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => { setSelectedUserId(user.id); setActiveView('profile'); }}>
                      <div className="flex items-center gap-4">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{idx + 1}</div>
                        <div>
                          <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{user.username}</div>
                          <div className="flex gap-2 mt-0.5">
                             {user.handles?.leetcode && <PlatformBadge type="LeetCode" />}
                             {user.handles?.codeforces && <PlatformBadge type="Codeforces" />}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-emerald-500">{user.weeklyScore}</div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Points</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500"/> Rivals</h2>
              <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "secondary" : "primary"} size="sm">
                {isAdding ? 'Close' : <><Plus size={16} /> Add User</>}
              </Button>
            </div>

            {isAdding && (
              <Card className="mb-8 p-6 border-emerald-500/20 bg-emerald-500/[0.02]">
                <form onSubmit={handleAddUser} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Name</label>
                    <input 
                      placeholder="e.g. My Rival" 
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
                      value={newUser.name} 
                      onChange={e => setNewUser({...newUser, name: e.target.value})} 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">LeetCode Handle / URL</label>
                      <input 
                        placeholder="leetcode.com/username" 
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-500" 
                        value={newUser.leetcode} 
                        onChange={e => setNewUser({...newUser, leetcode: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Codeforces Handle / URL</label>
                      <input 
                        placeholder="codeforces.com/profile/handle" 
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                        value={newUser.codeforces} 
                        onChange={e => setNewUser({...newUser, codeforces: e.target.value})} 
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="mt-2 w-full md:w-auto self-end">
                    {isLoading ? 'Fetching Data...' : 'Create Profile'}
                  </Button>
                </form>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {users.map(u => (
                <Card 
                  key={u.id} 
                  className="p-5 cursor-pointer hover:border-emerald-500/50 group"
                  onClick={() => { setSelectedUserId(u.id); setActiveView('profile'); }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold">{u.username[0].toUpperCase()}</div>
                      <div>
                        <h4 className="font-bold group-hover:text-emerald-500 transition-colors">{u.username}</h4>
                        <div className="flex gap-1 mt-1">
                           {u.handles?.leetcode && <PlatformBadge type="LeetCode" />}
                           {u.handles?.codeforces && <PlatformBadge type="Codeforces" />}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-700/50 pt-3">
                    <div className="text-xs text-slate-400">
                      Total: <span className="font-bold text-slate-600 dark:text-slate-200">{(u.data?.leetcode?.totalSolved || 0) + (u.data?.codeforces?.totalSolved || 0)}</span>
                    </div>
                    <div className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                      View Profile <ArrowLeft className="rotate-180" size={10} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          selectedUser ? (
            <ProfileView 
              user={selectedUser} 
              onBack={() => setActiveView('dashboard')} 
              onUpdateUser={updateUser}
              onDeleteUser={deleteUser}
            />
          ) : (
             <div className="p-12 text-center text-slate-500">
                <AlertCircle className="mx-auto mb-2 text-slate-400" />
                User not found. 
                <button onClick={() => setActiveView('dashboard')} className="text-emerald-500 font-bold ml-1 hover:underline">Go Back</button>
             </div>
          )
        )}
      </main>
    </div>
  );
}