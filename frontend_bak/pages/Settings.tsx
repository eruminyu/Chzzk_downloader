import React, { useState } from 'react';
import { Save, FolderOpen, Terminal, Shield, Key, CheckCircle, AlertCircle, RefreshCw, Lock } from 'lucide-react';

export const Settings: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [nidAut, setNidAut] = useState('');
  const [nidSes, setNidSes] = useState('');

  const handleTestLogin = () => {
    if (!nidAut || !nidSes) return;
    setAuthStatus('checking');
    
    // Simulate API Check
    setTimeout(() => {
      // Mock validation logic
      setAuthStatus('valid');
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <p className="text-gray-400 text-sm">System configuration, Authentication, and Remote Control.</p>
        </div>
        <button className="bg-chzzk hover:bg-chzzk-dark text-black font-bold py-3 px-8 rounded-lg flex items-center justify-center space-x-2 transition-transform active:scale-95 shadow-lg shadow-chzzk/20">
           <Save className="w-5 h-5" />
           <span>Save All Changes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Authentication Manager (Priority High) */}
        <div className="lg:col-span-2 bg-chzzk-card border border-chzzk/30 rounded-xl p-6 shadow-[0_0_20px_rgba(0,255,163,0.05)]">
          <div className="flex items-center space-x-2 mb-4 text-white">
            <Key className="w-5 h-5 text-chzzk" />
            <h3 className="font-bold text-lg">Chzzk Authentication</h3>
          </div>
          
          <div className="bg-gray-900/50 rounded-lg p-4 mb-6 border border-gray-800">
             <div className="flex gap-3">
               <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
               <div className="text-sm text-gray-300">
                 <p className="font-bold text-white mb-1">Why do I need this?</p>
                 <p>Login cookies (<span className="font-mono text-blue-300 bg-blue-900/30 px-1 rounded">NID_AUT</span>, <span className="font-mono text-blue-300 bg-blue-900/30 px-1 rounded">NID_SES</span>) are required to download <strong>1080p (Original)</strong> quality and access <strong>19+ (Age Restricted)</strong> content. Your cookies are stored locally and never shared.</p>
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">NID_AUT Cookie</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input 
                    type="password" 
                    value={nidAut}
                    onChange={(e) => setNidAut(e.target.value)}
                    placeholder="Paste NID_AUT cookie value..."
                    className="w-full pl-10 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chzzk transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">NID_SES Cookie</label>
                <div className="relative">
                   <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                   <input 
                      type="password"
                      value={nidSes}
                      onChange={(e) => setNidSes(e.target.value)} 
                      placeholder="Paste NID_SES cookie value..."
                      className="w-full pl-10 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chzzk transition-colors"
                    />
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-end space-y-4">
               <div className="bg-gray-900 rounded-lg p-4 flex-1 flex flex-col items-center justify-center border border-gray-800">
                  {authStatus === 'idle' && (
                    <div className="text-center text-gray-500">
                       <Shield className="w-10 h-10 mx-auto mb-2 opacity-50" />
                       <p className="text-sm">Enter cookies and click Test Login</p>
                    </div>
                  )}
                  {authStatus === 'checking' && (
                    <div className="text-center text-chzzk">
                       <RefreshCw className="w-10 h-10 mx-auto mb-2 animate-spin" />
                       <p className="text-sm font-bold">Verifying Session...</p>
                    </div>
                  )}
                  {authStatus === 'valid' && (
                    <div className="text-center text-green-400 animate-in zoom-in">
                       <CheckCircle className="w-10 h-10 mx-auto mb-2" />
                       <p className="text-sm font-bold">Login Successful!</p>
                       <p className="text-xs text-gray-500 mt-1">Adult Access: Granted</p>
                    </div>
                  )}
               </div>
               <button 
                onClick={handleTestLogin}
                disabled={authStatus === 'checking' || !nidAut || !nidSes}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors border border-gray-600 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Test Login
               </button>
            </div>
          </div>
        </div>

        {/* Core Engine Settings */}
        <div className="bg-chzzk-card border border-gray-800 rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-6 text-gray-300">
            <Terminal className="w-5 h-5" />
            <h3 className="font-bold text-lg">Engine Configuration</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Download Directory</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  defaultValue="C:\Users\Admin\Videos\Chzzk"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chzzk"
                />
                <button className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg">
                  <FolderOpen className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Smart Installer Status */}
            <div className="bg-black/20 rounded-lg p-3 border border-gray-700 mt-4">
               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Environment Check (Auto-Detected)</p>
               <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-300 font-mono">Python 3.14 (JIT)</span>
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Ready</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300 font-mono">FFmpeg (GPL)</span>
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Ready</span>
               </div>
            </div>

            <div className="pt-2">
               <label className="flex items-center space-x-2 cursor-pointer group">
                 <input type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-chzzk focus:ring-0 transition-colors" defaultChecked />
                 <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Enable Hardware Acceleration (NVENC/QSV)</span>
               </label>
            </div>
          </div>
        </div>

        {/* Discord Bot Settings */}
        <div className="bg-chzzk-card border border-gray-800 rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-6 text-purple-400">
            <Shield className="w-5 h-5" />
            <h3 className="font-bold text-lg">Remote Commander</h3>
          </div>

          <div className="space-y-4">
             <div className="bg-purple-500/5 border border-purple-500/20 p-3 rounded-lg text-xs text-gray-300 mb-4">
               Control your downloader from anywhere using Discord. Setup your own bot and paste the token below.
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-400 mb-1">Bot Token</label>
               <input 
                  type="password" 
                  placeholder="MTEy..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                />
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-400 mb-1">Owner ID (Admin)</label>
               <input 
                  type="text" 
                  placeholder="User ID for admin access"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                />
             </div>

             <div className="flex justify-end pt-2">
                <button className="text-xs text-purple-400 hover:text-purple-300 underline">Test Connection</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};