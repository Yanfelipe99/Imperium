
import React from 'react';
import { Icons } from './Icons';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'overview', label: 'Visão Geral', icon: Icons.Castle },
    { id: 'buildings', label: 'Construções', icon: Icons.Hammer },
    { id: 'comercio', label: 'Comércio', icon: Icons.Cart },
    { id: 'technology', label: 'Tecnologias', icon: Icons.Beaker },
    { id: 'army', label: 'Exército', icon: Icons.Sword },
    { id: 'finance', label: 'Finanças', icon: Icons.Balance },
    { id: 'map', label: 'Vizinhos', icon: Icons.Map },
  ];

  return (
    <div className="w-72 h-screen flex flex-col flex-shrink-0 select-none relative z-20 bg-stone-900 border-r-4 border-stone-800 shadow-2xl">
      {/* Decorative texture overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-10 pointer-events-none"></div>

      <div className="p-8 border-b-4 border-stone-800 bg-stone-950/50 text-center relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-700 to-transparent opacity-50"></div>
        <h1 className="text-3xl font-black text-amber-500 tracking-widest drop-shadow-md">IMPERIUM</h1>
        <div className="w-16 h-1 bg-amber-800 mx-auto my-2 rounded-full"></div>
        <p className="text-xs text-stone-500 uppercase tracking-widest font-bold">Gestor Medieval</p>
      </div>

      <nav className="flex-1 p-6 space-y-4 relative">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full group flex items-center space-x-4 px-4 py-4 rounded-sm transition-all duration-300 border-2 relative overflow-hidden ${
              activeTab === item.id
                ? 'bg-gradient-to-r from-stone-800 to-stone-900 border-amber-700/60 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                : 'bg-stone-900/50 border-stone-800 text-stone-500 hover:bg-stone-800 hover:text-stone-300 hover:border-stone-700'
            }`}
          >
            {/* Active Indicator */}
            {activeTab === item.id && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 shadow-[0_0_10px_orange]"></div>
            )}
            
            <div className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110 drop-shadow-lg text-amber-500' : 'grayscale group-hover:grayscale-0'}`}>
              <item.icon size={28} />
            </div>
            <span className="font-medieval font-bold tracking-wide text-lg">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t-2 border-stone-800 text-xs text-center text-stone-600 bg-stone-950/30">
        <p className="font-medieval opacity-50">v2.0.1 · PT-BR</p>
      </div>
    </div>
  );
};
