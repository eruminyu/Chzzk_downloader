import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { LiveMonitor } from './pages/LiveMonitor';
import { VODDownloader } from './pages/VODDownloader';
import { Settings } from './pages/Settings';
import { ViewType, Channel, DownloadTask, SystemStats } from './types';

// Mock Data Generators
const initialChannels: Channel[] = [
  { id: 'c1', name: 'hanryang', displayName: 'Hanryang1125', isLive: true, isRecording: true, viewers: 12500, category: 'Just Chatting', uptime: '02:15:44', thumbnailUrl: 'https://picsum.photos/400/225?random=1' },
  { id: 'c2', name: 'ralo', displayName: 'Ralo', isLive: true, isRecording: false, viewers: 8400, category: 'League of Legends', uptime: '00:45:12', thumbnailUrl: 'https://picsum.photos/400/225?random=2' },
  { id: 'c3', name: 'paka', displayName: 'Paka', isLive: false, isRecording: false, viewers: 0, category: 'Offline', uptime: '', thumbnailUrl: 'https://picsum.photos/400/225?random=3' },
  { id: 'c4', name: 'dopa', displayName: 'Dopa', isLive: true, isRecording: true, viewers: 15600, category: 'Talk', uptime: '04:12:00', thumbnailUrl: 'https://picsum.photos/400/225?random=4' },
];

const initialTasks: DownloadTask[] = [
  { id: 't1', title: '[Replay] 2024-05-20 Handongsook IRL', url: '...', thumbnailUrl: 'https://picsum.photos/200/112?random=5', progress: 100, status: 'completed', size: '4.2 GB', speed: '0 MB/s' },
  { id: 't2', title: 'Funny Clip Compilation', url: '...', thumbnailUrl: 'https://picsum.photos/200/112?random=6', progress: 45, status: 'downloading', size: '1.1 GB', speed: '12.5 MB/s' },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [tasks, setTasks] = useState<DownloadTask[]>(initialTasks);
  const [stats, setStats] = useState<SystemStats>({
    cpuUsage: 12,
    ramUsage: 34,
    diskFree: '550 GB',
    diskTotal: '1 TB',
    diskUsagePercent: 45,
    activeThreads: 8,
    isLoggedIn: false, // Default state
    engineStatus: 'ready'
  });

  // Simulate System Stats Updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        cpuUsage: Math.floor(Math.random() * 20) + 10,
        ramUsage: Math.min(prev.ramUsage + (Math.random() > 0.5 ? 1 : -1), 90),
        activeThreads: 8 + Math.floor(Math.random() * 3),
        // Simulate login occurring after some time or kept false for testing
        isLoggedIn: true 
      }));

      // Simulate Download Progress
      setTasks(prevTasks => prevTasks.map(task => {
        if (task.status === 'downloading') {
          const newProgress = Math.min(task.progress + Math.random() * 2, 100);
          return {
            ...task,
            progress: newProgress,
            status: newProgress >= 100 ? 'completed' : 'downloading',
            speed: newProgress >= 100 ? '0 MB/s' : `${(Math.random() * 5 + 10).toFixed(1)} MB/s`
          };
        }
        return task;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleRecord = (id: string) => {
    setChannels(prev => prev.map(ch => 
      ch.id === id ? { ...ch, isRecording: !ch.isRecording } : ch
    ));
  };

  const handleRemoveChannel = (id: string) => {
    setChannels(prev => prev.filter(ch => ch.id !== id));
  };

  const handleAddChannel = (name: string) => {
    const newChannel: Channel = {
      id: Date.now().toString(),
      name,
      displayName: name,
      isLive: false, // Default to offline when added initially
      isRecording: false,
      viewers: 0,
      category: 'Pending',
      uptime: '',
      thumbnailUrl: `https://picsum.photos/400/225?random=${Date.now()}`
    };
    setChannels(prev => [...prev, newChannel]);
  };

  const handleAddDownloadTask = (url: string) => {
    const newTask: DownloadTask = {
      id: Date.now().toString(),
      url,
      title: `Analysis Result - ${new Date().toLocaleTimeString()}`,
      thumbnailUrl: `https://picsum.photos/200/112?random=${Date.now()}`,
      progress: 0,
      status: 'downloading',
      size: 'Analyzing...',
      speed: 'Starting...'
    };
    setTasks(prev => [newTask, ...prev]);
  };

  return (
    <div className="flex min-h-screen bg-chzzk-bg text-gray-200 font-sans selection:bg-chzzk selection:text-black overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="flex-1 overflow-auto h-screen pb-20 md:pb-0">
        {/* Adjusted padding: p-4 for mobile, p-8 for desktop */}
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {currentView === 'dashboard' && <Dashboard stats={stats} />}
          {currentView === 'live' && (
            <LiveMonitor 
              channels={channels} 
              onToggleRecord={handleToggleRecord} 
              onRemoveChannel={handleRemoveChannel}
              onAddChannel={handleAddChannel}
            />
          )}
          {currentView === 'vod' && (
            <VODDownloader tasks={tasks} onAddTask={handleAddDownloadTask} />
          )}
          {currentView === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
};

export default App;