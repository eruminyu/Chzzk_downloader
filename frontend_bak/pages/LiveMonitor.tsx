import React, { useState } from 'react';
import { Play, Pause, Trash2, Plus, Users, Clock, AlertCircle, Signal } from 'lucide-react';
import { Channel } from '../types';

interface LiveMonitorProps {
  channels: Channel[];
  onToggleRecord: (id: string) => void;
  onRemoveChannel: (id: string) => void;
  onAddChannel: (channelName: string) => void;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({ channels, onToggleRecord, onRemoveChannel, onAddChannel }) => {
  const [newChannelInput, setNewChannelInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChannelInput.trim()) {
      onAddChannel(newChannelInput.trim());
      setNewChannelInput('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Live Monitor</h2>
          <p className="text-gray-400 text-sm">Conductor Engine Status: <span className="text-chzzk font-mono">ACTIVE (Python 3.14)</span></p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-chzzk hover:bg-chzzk-dark text-black px-4 py-2 rounded-lg font-bold transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Channel</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-chzzk-card border border-chzzk/30 p-4 rounded-xl animate-in slide-in-from-top-4">
          <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <input
              type="text"
              value={newChannelInput}
              onChange={(e) => setNewChannelInput(e.target.value)}
              placeholder="Enter Chzzk Channel ID or URL..."
              className="flex-1 bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-chzzk"
              autoFocus
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 sm:flex-none text-sm bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">
                Monitor
              </button>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="flex-1 sm:flex-none text-sm text-gray-400 hover:text-white px-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {channels.map((channel) => (
          <div key={channel.id} className="group bg-chzzk-card border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all duration-300 flex flex-col">
            {/* Thumbnail Header */}
            <div className="relative h-40 bg-gray-900 overflow-hidden">
               {channel.isLive ? (
                 <>
                   <img src={channel.thumbnailUrl} alt={channel.displayName} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                   <div className="absolute top-2 left-2 flex gap-2">
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                        <Signal className="w-3 h-3" /> LIVE
                      </span>
                      {channel.isRecording && (
                        <span className="bg-chzzk text-black text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          REC
                        </span>
                      )}
                   </div>
                 </>
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-gray-900/50">
                   <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
                   <span className="text-sm font-semibold">OFFLINE</span>
                 </div>
               )}
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                   <h3 className="font-bold text-white text-lg truncate pr-2">{channel.displayName}</h3>
                   <p className="text-xs text-gray-400 font-mono truncate">{channel.category}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 mb-6">
                <div className="bg-gray-900/50 p-2 rounded flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-300 font-mono">{channel.isLive ? channel.viewers.toLocaleString() : '-'}</span>
                </div>
                <div className="bg-gray-900/50 p-2 rounded flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-gray-300 font-mono">{channel.isLive ? channel.uptime : '-'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-auto flex space-x-2">
                <button
                  onClick={() => onToggleRecord(channel.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-bold transition-all ${
                    channel.isRecording
                      ? 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white'
                      : 'bg-chzzk/10 text-chzzk border border-chzzk/20 hover:bg-chzzk hover:text-black'
                  }`}
                  disabled={!channel.isLive}
                >
                  {channel.isRecording ? (
                    <>
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse mr-1"></div>
                      <span>Stop Rec</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      <span>Auto Rec</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => onRemoveChannel(channel.id)}
                  className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-red-500/10 hover:text-red-500 border border-transparent hover:border-red-500/50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Placeholder Card */}
        <button
          onClick={() => setIsAdding(true)}
          className="bg-chzzk-card/50 border border-gray-800 border-dashed rounded-xl flex flex-col items-center justify-center p-8 hover:bg-chzzk-card hover:border-chzzk/50 transition-all group min-h-[300px]"
        >
          <div className="w-16 h-16 rounded-full bg-gray-800 group-hover:bg-chzzk/20 flex items-center justify-center mb-4 transition-colors">
            <Plus className="w-8 h-8 text-gray-500 group-hover:text-chzzk" />
          </div>
          <h3 className="text-gray-400 font-bold group-hover:text-white">Add Channel</h3>
        </button>
      </div>
    </div>
  );
};