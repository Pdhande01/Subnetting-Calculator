import { useState, useEffect } from 'react';
import { 
  Network, 
  Layers, 
  HelpCircle, 
  Terminal, 
  BookOpen, 
  Sun, 
  Moon, 
  History, 
  Check, 
  AlertCircle,
  Menu,
  X,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import components
import { DashboardTab } from './components/DashboardTab';
import { VlsmTab } from './components/VlsmTab';
import { UtilityTab } from './components/UtilityTab';
import { PracticeTab } from './components/PracticeTab';
import { GuideTab } from './components/GuideTab';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'vlsm' | 'utilities' | 'quizzes' | 'guide'>('home');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('subnet_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // History storage
  const [savedHistory, setSavedHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('subnet_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync theme
  useEffect(() => {
    const bodyClass = document.body.classList;
    if (theme === 'light') {
      bodyClass.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      bodyClass.remove('light');
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('subnet_theme', theme);
  }, [theme]);

  // Load URL sharing parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const sharedIp = searchParams.get('ip');
    const sharedCidr = searchParams.get('cidr');
    if (sharedIp && sharedCidr) {
      setActiveTab('dashboard');
      showToast('Calculation loaded from shared link!', 'success');
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'info' | 'error') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const handleClearHistory = () => {
    setSavedHistory([]);
    localStorage.removeItem('subnet_history');
    showToast('Calculation history cleared.', 'info');
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigationItems = [
    { id: 'dashboard', label: 'FLSM Calculator', icon: Network },
    { id: 'vlsm', label: 'VLSM Calculator', icon: Layers },
    { id: 'utilities', label: 'Tools & Radix', icon: Terminal },
    { id: 'quizzes', label: 'Practice Quiz', icon: HelpCircle },
    { id: 'guide', label: 'Edu Guide', icon: BookOpen },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col relative select-none font-sans bg-slate-950 text-slate-100 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 light:bg-slate-50 light:text-slate-900">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 cyber-grid cyber-grid-anim pointer-events-none z-0"></div>

      {/* App Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-4 py-3.5 flex items-center justify-between no-print dark:bg-slate-950/80 dark:border-slate-900 light:bg-white/80 light:border-slate-200">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => handleTabChange('home')}>
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg text-slate-950 shadow-cyan-glow">
            <Network size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
              SubnetMaster
            </h1>
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Cyber IP Engine</span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
                    : 'text-slate-400 hover:text-slate-250 border border-transparent'
                }`}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Theme Toggler */}
          <button 
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:text-white transition-all text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 light:border-slate-200 light:bg-slate-100 light:hover:bg-slate-200"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Mobile Menu Toggler */}
          <button 
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="lg:hidden p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-850 text-slate-400 dark:border-slate-800 light:border-slate-200 light:bg-slate-100"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden absolute top-[57px] left-0 w-full z-30 border-b border-slate-900 bg-slate-950 p-4 shadow-xl space-y-2 no-print dark:bg-slate-950 dark:border-slate-900 light:bg-white light:border-slate-200"
          >
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full p-3 rounded-lg text-sm font-semibold flex items-center gap-2.5 transition-all ${
                    isActive 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25' 
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Layout Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 z-10 flex flex-col lg:flex-row gap-6 relative">
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {/* HERO Tab */}
            {activeTab === 'home' && (
              <motion.section 
                key="home"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="text-center py-16 px-4 max-w-3xl mx-auto space-y-8 select-text"
              >
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 inline-block animate-pulse">
                    v1.0 Fully Client-Side Calc
                  </span>
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 leading-tight">
                    Advanced IPv4 Subnet Calculator
                  </h1>
                  <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
                    Calculate subnet masks, host ranges, CIDR blocks, network IDs, broadcast addresses, gateways, and visualize subnet divisions instantly. Perfect for system admins, security teams, and networking students.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                  <button 
                    onClick={() => handleTabChange('dashboard')}
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-all active:scale-95 shadow-cyan-glow-lg flex items-center justify-center gap-2"
                  >
                    <Network size={16} className="stroke-[2.5]" />
                    Start Calculating
                  </button>
                  <button 
                    onClick={() => handleTabChange('guide')}
                    className="w-full sm:w-auto px-8 py-3.5 border border-slate-700 bg-slate-900/40 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <BookOpen size={16} />
                    Learn Subnetting
                  </button>
                </div>

                {/* Subnetting summary grid illustration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-10 text-left select-none no-print">
                  <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl">
                    <h3 className="font-bold text-xs text-cyan-400 uppercase">Interactive Bits</h3>
                    <p className="text-slate-500 text-[11px] mt-1">Configure subnet structures by toggling mask bits inside a real-time binary partitioner.</p>
                  </div>
                  <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl">
                    <h3 className="font-bold text-xs text-purple-400 uppercase">VLSM Allocator</h3>
                    <p className="text-slate-500 text-[11px] mt-1">Submit variable-sized host lists to automatically compute sorted subnet boundaries with no waste.</p>
                  </div>
                  <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl">
                    <h3 className="font-bold text-xs text-emerald-400 uppercase">Practice Quiz</h3>
                    <p className="text-slate-500 text-[11px] mt-1">Challenge your knowledge against dynamically generated subnetwork exams to improve speeds.</p>
                  </div>
                </div>
              </motion.section>
            )}

            {/* CALCULATOR Tab */}
            {activeTab === 'dashboard' && (
              <motion.div key="calc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DashboardTab onNotify={showToast} savedHistory={savedHistory} setSavedHistory={setSavedHistory} />
              </motion.div>
            )}

            {/* VLSM Tab */}
            {activeTab === 'vlsm' && (
              <motion.div key="vlsm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <VlsmTab onNotify={showToast} />
              </motion.div>
            )}

            {/* UTILITIES Tab */}
            {activeTab === 'utilities' && (
              <motion.div key="util" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <UtilityTab />
              </motion.div>
            )}

            {/* QUIZZES Tab */}
            {activeTab === 'quizzes' && (
              <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PracticeTab onNotify={showToast} />
              </motion.div>
            )}

            {/* GUIDE Tab */}
            {activeTab === 'guide' && (
              <motion.div key="guide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <GuideTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar History Drawer (visible on screens >= lg, hidden on print) */}
        {activeTab !== 'home' && (
          <aside className="hidden lg:block w-72 shrink-0 space-y-4 no-print">
            <div className="glass-card p-4 border-slate-800 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-3.5">
                <div className="flex items-center gap-1.5">
                  <History size={15} className="text-cyan-400" />
                  <h3 className="font-bold text-xs text-slate-350">Calculation History</h3>
                </div>
                {savedHistory.length > 0 && (
                  <button 
                    onClick={handleClearHistory}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-850 transition-all"
                    title="Clear History"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                {savedHistory.length > 0 ? (
                  savedHistory.map((item) => (
                    <div 
                      key={item.id}
                      className="p-2.5 rounded border border-slate-900/60 bg-slate-950/40 hover:border-slate-850 hover:bg-slate-900/10 cursor-pointer text-xs space-y-1 font-mono transition-all"
                      onClick={() => {
                        // Dynamically update dashboard states via loading parameters
                        // (we can load history parameters by triggering state change)
                        const params = new URL(window.location.href);
                        params.searchParams.set('ip', item.ipAddress);
                        params.searchParams.set('cidr', item.cidr.toString());
                        window.history.replaceState({}, '', params.toString());
                        
                        // Force reload parameters in components by triggering activeTab reload
                        setActiveTab('home');
                        setTimeout(() => setActiveTab('dashboard'), 20);
                        showToast(`Restored: ${item.ipAddress}/${item.cidr}`, 'info');
                      }}
                    >
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span className="font-semibold">{item.timestamp}</span>
                        <span className="text-purple-400">/{item.cidr}</span>
                      </div>
                      <div className="font-bold text-slate-200 select-all truncate">{item.ipAddress}</div>
                      <div className="text-[9px] text-slate-500 truncate">Net: {item.networkAddress}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-600 text-xs">
                    <History size={20} className="mx-auto text-slate-800 mb-1" />
                    <span>No saved calculations. Click "Save History" on Dashboard.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Practice shortcut card */}
            <div className="glass-card p-4 border-slate-800 text-xs space-y-2.5 shadow-sm">
              <h4 className="font-bold text-slate-350 flex items-center gap-1.5">
                <HelpCircle size={14} className="text-purple-400" />
                Network Exam Practice
              </h4>
              <p className="text-slate-500 leading-normal text-[11px]">
                Ready to test your memory? Toggle the Practice tab to solve mental subnet calculations and build up streaks!
              </p>
              <button 
                onClick={() => handleTabChange('quizzes')}
                className="w-full py-1.5 bg-purple-500/10 border border-purple-500/35 hover:bg-purple-500/20 text-purple-300 font-semibold rounded text-[11px] transition-all"
              >
                Launch Quiz Panel
              </button>
            </div>
          </aside>
        )}
      </main>

      {/* Floating Toast Notification Box */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none no-print">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`p-3.5 rounded-lg border shadow-xl flex items-start gap-2.5 pointer-events-auto ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
                  : toast.type === 'error'
                  ? 'bg-red-950/90 border-red-500/40 text-red-300'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300'
              }`}
            >
              {toast.type === 'error' ? (
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
              ) : (
                <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
              )}
              <span className="text-xs font-semibold leading-tight">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer Section */}
      <footer className="w-full border-t border-slate-900/80 bg-slate-950 px-4 py-8 text-xs text-slate-500 mt-10 z-10 no-print dark:bg-slate-950 dark:border-slate-900 light:bg-white light:border-slate-200">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-cyan-500/10 text-cyan-400 rounded">
                <Network size={12} />
              </div>
              <span className="font-bold text-slate-300">SubnetMaster</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Advanced subnetworking calculations computed completely client-side in security tool visual aesthetic. Free and offline ready.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-350 mb-2.5">Subnetting Basics</h4>
            <ul className="space-y-1.5 text-[11px] text-slate-600">
              <li><button onClick={() => handleTabChange('guide')} className="hover:text-cyan-400 text-left">What is Subnetting?</button></li>
              <li><button onClick={() => handleTabChange('guide')} className="hover:text-cyan-400 text-left">Understanding CIDR</button></li>
              <li><button onClick={() => handleTabChange('guide')} className="hover:text-cyan-400 text-left">Broadcast vs Network ID</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-350 mb-2.5">Tools Directory</h4>
            <ul className="space-y-1.5 text-[11px] text-slate-600">
              <li><button onClick={() => handleTabChange('dashboard')} className="hover:text-cyan-400 text-left">FLSM Mask Splitter</button></li>
              <li><button onClick={() => handleTabChange('vlsm')} className="hover:text-cyan-400 text-left">VLSM Optimal Allocator</button></li>
              <li><button onClick={() => handleTabChange('utilities')} className="hover:text-cyan-400 text-left">Host Capacity Calc</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-350 mb-2.5">About Project</h4>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Built using React, TypeScript, and Tailwind CSS. Save locally or generate sharing URL parameters.
            </p>
            <span className="block text-[10px] text-slate-700 mt-2 font-mono">Environment: Client-Side Node-Vite</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-900/60 pt-4 mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-750 dark:border-slate-900">
          <span>&copy; 2026 SubnetMaster. Advanced IP Routing Utility.</span>
          <div className="flex gap-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-cyan-400">GitHub Repository</a>
            <a href="#" className="hover:text-cyan-400">Documentation</a>
            <a href="#" className="hover:text-cyan-400">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
