import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Activity, Trophy, Calendar as CalendarIcon, RefreshCw, 
  Moon, Sun, Trash2, ExternalLink, ArrowLeft, Edit2, TrendingUp,
  Github, Code, Terminal, Award, ChevronDown
} from 'lucide-react';

// --- PROXY & API UTILITIES ---

const CORS_PROXY = "https://api.allorigins.win/get?url=";

const fetchCodeforcesData = async (handle) => {
  try {
    const response = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=100`);
    const data = await response.json();
    if (data.status !== "OK") throw new Error("User not found");
    
    // Count unique solved problems (verdict OK)
    const solvedSet = new Set();
    const historyMap = {};
    
    data.result.forEach(sub => {
      if (sub.verdict === "OK") {
        const problemId = `${sub.problem.contestId}${sub.problem.index}`;
        solvedSet.add(problemId);
        
        const date = new Date(sub.creationTimeSeconds * 1000).toISOString().split('T')[0];
        historyMap[date] = (historyMap[date] || 0) + 1;
      }
    });

    const history = Object.keys(historyMap).map(date => ({ date, count: historyMap[date] }));
    
    return {
      totalSolved: solvedSet.size,
      history: history
    };
  } catch (err) {
    console.error("CF Fetch error:", err);
    return null;
  }
};

const fetchLeetCodeData = async (handle) => {
  try {
    const query = JSON.stringify({
      query: `
        query userPublicProfile($username: String!) {
          matchedUser(username: $username) {
            submitStats {
              acSubmissionNum {
                difficulty
                count
              }
            }
          }
        }
      `,
      variables: { username: handle }
    });

    const targetUrl = encodeURIComponent(`https://leetcode.com/graphql`);
    const response = await fetch(`${CORS_PROXY}${targetUrl}&method=POST&body=${encodeURIComponent(query)}`);
    const rawData = await response.json();
    const data = JSON.parse(rawData.contents);

    if (!data.data.matchedUser) throw new Error("User not found");

    const totalSolved = data.data.matchedUser.submitStats.acSubmissionNum.find(d => d.difficulty === "All").count;
    
    return {
      totalSolved: totalSolved,
      history: [] // LeetCode doesn't provide easy daily breakdown via public GraphQL without auth
    };
  } catch (err) {
    console.error("LC Fetch error:", err);
    return null;
  }
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
  const date = new Date(dateStr);
  const startOfWeek = getStartOfWeek();
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  return date.getTime() >= startOfWeek.getTime() && date.getTime() < endOfWeek.getTime();
};

// --- COMPONENTS ---

const Card = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-emerald-500/30' : ''} ${className}`}>
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

const PlatformIcon = ({ platform }) => {
  switch (platform) {
    case 'GitHub': return <Github size={14} />;
    case 'Codeforces': return <Terminal size={14} />;
    case 'HackerRank': return <Code size={14} />;
    default: return <Activity size={14} />; 
  }
};

// --- MAIN APP ---

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newUserHandle, setNewUserHandle] = useState('');
  const [newUserPlatform, setNewUserPlatform] = useState('LeetCode');
  const [isLoading, setIsLoading] = useState(false);
  
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('code_rivals_users');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  useEffect(() => {
    localStorage.setItem('code_rivals_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const syncUser = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    let updatedData = null;
    if (user.platform === 'Codeforces') updatedData = await fetchCodeforcesData(user.handle);
    if (user.platform === 'LeetCode') updatedData = await fetchLeetCodeData(user.handle);

    if (updatedData) {
      setUsers(prev => prev.map(u => u.id === userId ? {
        ...u,
        totalSolved: updatedData.totalSolved,
        history: updatedData.history.length > 0 ? updatedData.history : u.history
      } : u));
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserHandle) return;
    setIsLoading(true);
    
    let data = null;
    if (newUserPlatform === 'Codeforces') data = await fetchCodeforcesData(newUserHandle);
    if (newUserPlatform === 'LeetCode') data = await fetchLeetCodeData(newUserHandle);

    if (data) {
      const newUser = {
        id: Date.now(),
        username: newUserHandle,
        handle: newUserHandle,
        platform: newUserPlatform,
        totalSolved: data.totalSolved,
        streak: 0,
        history: data.history || [],
        manualLogs: []
      };
      setUsers(prev => [...prev, newUser]);
      setNewUserHandle('');
      setIsAdding(false);
    } else {
      alert("Could not fetch data for this handle. Please check the spelling.");
    }
    setIsLoading(false);
  };

  const rankedUsers = useMemo(() => {
    return users.map(user => {
      const weeklyCount = (user.history || [])
        .filter(h => isDateInCurrentWeek(h.date))
        .reduce((acc, curr) => acc + curr.count, 0);
      const manualCount = (user.manualLogs || [])
        .filter(l => isDateInCurrentWeek(l.date)).length;
      return { ...user, weeklyScore: weeklyCount + manualCount };
    }).sort((a, b) => b.weeklyScore - a.weeklyScore);
  }, [users]);

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
            {/* Leaderboard Card */}
            <Card className="p-0 overflow-hidden mb-8 border-none ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <Trophy className="text-amber-500" size={18} /> Weekly Rankings
                </h3>
                <Button variant="ghost" size="sm" onClick={() => users.forEach(u => syncUser(u.id))}>
                  <RefreshCw size={14} /> Refresh All
                </Button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {rankedUsers.map((user, idx) => (
                  <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{idx + 1}</div>
                      <div>
                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{user.username}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1"><PlatformIcon platform={user.platform} /> {user.platform}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-emerald-500">{user.weeklyScore}</div>
                      <div className="text-[9px] uppercase font-bold text-slate-400">Points</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500"/> Rivals</h2>
              <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "secondary" : "primary"} size="sm">
                {isAdding ? 'Close' : <><Plus size={16} /> Add Rival</>}
              </Button>
            </div>

            {isAdding && (
              <Card className="mb-8 p-5 border-emerald-500/20 bg-emerald-500/[0.02]">
                <form onSubmit={handleAddUser} className="flex flex-col md:flex-row gap-4">
                  <input placeholder="Platform Handle" className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" value={newUserHandle} onChange={e => setNewUserHandle(e.target.value)} />
                  <select className="w-full md:w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm" value={newUserPlatform} onChange={e => setNewUserPlatform(e.target.value)}>
                    <option value="LeetCode">LeetCode</option>
                    <option value="Codeforces">Codeforces</option>
                  </select>
                  <Button type="submit" disabled={isLoading}>{isLoading ? 'Fetching...' : 'Connect'}</Button>
                </form>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {users.map(u => (
                <Card key={u.id} className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold">{u.username[0]}</div>
                      <div>
                        <h4 className="font-bold">{u.username}</h4>
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight flex items-center gap-1"><PlatformIcon platform={u.platform} /> {u.platform}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setUsers(prev => prev.filter(user => user.id !== u.id))}><Trash2 size={14}/></Button>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-xs text-slate-400">Total Solved: <span className="font-bold text-slate-600 dark:text-slate-200">{u.totalSolved}</span></div>
                    <Button variant="outline" size="sm" onClick={() => syncUser(u.id)}><RefreshCw size={12} /> Sync</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}