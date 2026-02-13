import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { HardDrive, Cpu, Zap, Activity, ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { SystemStats } from '../types';

interface DashboardProps {
  stats: SystemStats;
}

const mockChartData = Array.from({ length: 20 }, (_, i) => ({
  time: `${i}:00`,
  cpu: Math.floor(Math.random() * 30) + 10,
  ram: Math.floor(Math.random() * 20) + 30,
}));

const diskData = [
  { name: 'Used', value: 450 },
  { name: 'Free', value: 550 },
];

const COLORS = ['#334155', '#00FFA3'];

export const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">System Overview</h2>
          <p className="text-gray-400 text-sm">Real-time resource monitoring and status</p>
        </div>
        <div className="flex items-center space-x-3 bg-gray-900 px-4 py-2 rounded-lg border border-gray-800">
           <div className={`w-2 h-2 rounded-full ${stats.isLoggedIn ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
           <span className="text-xs font-bold text-gray-300">
             {stats.isLoggedIn ? 'Chzzk Logged In (19+)' : 'Guest Mode (No 1080p)'}
           </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-chzzk-card p-5 rounded-xl border border-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">CPU Usage</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">{stats.cpuUsage}%</h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Cpu className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${stats.cpuUsage}%` }}></div>
          </div>
        </div>

        <div className="bg-chzzk-card p-5 rounded-xl border border-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">RAM Usage</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">{stats.ramUsage}%</h3>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${stats.ramUsage}%` }}></div>
          </div>
        </div>

        <div className="bg-chzzk-card p-5 rounded-xl border border-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">Disk Space</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">{stats.diskFree}</h3>
              <p className="text-xs text-gray-500">of {stats.diskTotal} Total</p>
            </div>
            <div className="p-2 bg-chzzk/10 rounded-lg">
              <HardDrive className="w-5 h-5 text-chzzk" />
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-chzzk transition-all duration-500" style={{ width: `${stats.diskUsagePercent}%` }}></div>
          </div>
        </div>

        <div className="bg-chzzk-card p-5 rounded-xl border border-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">Active Workers</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">{stats.activeThreads}</h3>
              <p className="text-xs text-gray-500">Async Event Loop</p>
            </div>
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Activity className="w-5 h-5 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Service Health & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           {/* Chart */}
           <div className="bg-chzzk-card p-6 rounded-xl border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-6">Resource History</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="time" stroke="#64748b" tick={{fontSize: 12}} />
                  <YAxis stroke="#64748b" tick={{fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" name="CPU %" />
                  <Area type="monotone" dataKey="ram" stroke="#a855f7" fillOpacity={1} fill="url(#colorRam)" name="RAM %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Storage Donut */}
          <div className="bg-chzzk-card p-6 rounded-xl border border-gray-800 flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-4">Storage Breakdown</h3>
            <div className="flex-1 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={diskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {diskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-white">45%</span>
              </div>
            </div>
          </div>

          {/* Service Status Panel */}
          <div className="bg-chzzk-card p-6 rounded-xl border border-gray-800">
             <h3 className="text-lg font-semibold text-white mb-4">Service Status</h3>
             <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="bg-green-500/10 p-2 rounded-lg">
                      <ShieldCheck className="w-5 h-5 text-green-500" />
                   </div>
                   <div>
                     <div className="text-sm font-bold text-white">Auth Manager</div>
                     <div className="text-xs text-gray-500">Cookies Validated</div>
                   </div>
                 </div>
                 <CheckCircle className="w-4 h-4 text-green-500" />
               </div>

               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="bg-blue-500/10 p-2 rounded-lg">
                      <Activity className="w-5 h-5 text-blue-500" />
                   </div>
                   <div>
                     <div className="text-sm font-bold text-white">Live Engine</div>
                     <div className="text-xs text-gray-500">Streamlink Pipe Active</div>
                   </div>
                 </div>
                 <CheckCircle className="w-4 h-4 text-green-500" />
               </div>

               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="bg-chzzk/10 p-2 rounded-lg">
                      <Cpu className="w-5 h-5 text-chzzk" />
                   </div>
                   <div>
                     <div className="text-sm font-bold text-white">Python 3.14</div>
                     <div className="text-xs text-gray-500">JIT Optimized</div>
                   </div>
                 </div>
                 <CheckCircle className="w-4 h-4 text-green-500" />
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};