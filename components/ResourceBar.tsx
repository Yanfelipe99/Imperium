
import React from 'react';
import { Resources, ResourceType, GameSpeed } from '../types';
import { LABELS_PT } from '../constants';
import { Icons } from './Icons';

interface ResourceBarProps {
  resources: Resources;
  population: number;
  netProduction: Partial<Record<ResourceType, number>>;
  maxPop: number;
  gameSpeed: GameSpeed;
  setGameSpeed: (speed: GameSpeed) => void;
  day: number;
  maxStorage: number;
  happiness: number;
}

export const ResourceBar: React.FC<ResourceBarProps> = ({ 
  resources, population, netProduction, maxPop, gameSpeed, setGameSpeed, day, maxStorage, happiness
}) => {
  const rawResources = [
    { type: ResourceType.RAW_WOOD, color: 'text-emerald-500' },
    { type: ResourceType.RAW_STONE, color: 'text-stone-400' },
    { type: ResourceType.IRON_ORE, color: 'text-slate-400' },
    { type: ResourceType.WHEAT, color: 'text-yellow-500' },
  ];

  const processedResources = [
    { type: ResourceType.PLANKS, color: 'text-amber-600' },
    { type: ResourceType.BLOCKS, color: 'text-stone-300' },
    { type: ResourceType.IRON_INGOTS, color: 'text-slate-300' },
    { type: ResourceType.BREAD, color: 'text-orange-400' },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return Math.floor(num).toString();
  };

  const renderResource = (res: {type: ResourceType, color: string}) => {
    const prod = netProduction[res.type] || 0;
    const isNegative = prod < 0;
    
    const isGold = res.type === ResourceType.GOLD;
    const currentAmount = resources[res.type];
    
    // Calculate percentage for visual bar (Gold has no limit)
    const percentage = isGold ? 0 : Math.min(100, (currentAmount / maxStorage) * 100);
    const isCritical = percentage >= 90;
    const isWarning = percentage >= 75;

    // Bar Color Logic
    let barColor = 'bg-stone-600';
    if (isCritical) barColor = 'bg-red-500';
    else if (isWarning) barColor = 'bg-amber-500';
    
    const IconComponent = Icons[res.type];
    
    return (
      <div 
        key={res.type} 
        className={`flex items-center space-x-2 min-w-[90px] group cursor-help relative p-1 rounded transition-all overflow-hidden
          ${isCritical && !isGold ? 'bg-red-950/20 shadow-[inset_0_0_8px_rgba(220,38,38,0.2)]' : 'hover:bg-stone-800/50'}
        `}
        title={!isGold ? `Estoque: ${Math.floor(currentAmount)} / ${maxStorage}` : ''}
      >
        <div className={`${res.color} filter drop-shadow-lg z-10`}>
          <IconComponent size={20} />
        </div>
        <div className="flex flex-col leading-none z-10">
          <span className={`text-[9px] font-bold uppercase tracking-wider opacity-70 ${res.color}`}>{LABELS_PT.resources[res.type]}</span>
          <div className="flex items-baseline space-x-1">
            <span className={`text-sm font-medieval font-bold ${isCritical && !isGold ? 'text-red-400' : 'text-stone-200'}`}>
                {formatNumber(resources[res.type])}
            </span>
            <span className={`text-[10px] font-mono ${isNegative ? 'text-red-400' : 'text-green-500'} ${gameSpeed === 0 ? 'opacity-30' : 'opacity-80'}`}>
            {prod > 0 ? '+' : ''}{(prod * (gameSpeed === 0 ? 0 : 1)).toFixed(0)}
            </span>
          </div>
        </div>

        {/* Progress Bar Background */}
        {!isGold && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-stone-800/80">
                <div 
                    className={`h-full transition-all duration-500 ${barColor}`} 
                    style={{ width: `${percentage}%` }}
                />
            </div>
        )}
      </div>
    );
  };

  const getHappinessIcon = () => {
      if (happiness > 70) return <Icons.Happy size={18} />;
      if (happiness < 40) return <Icons.Sad size={18} />;
      return <Icons.Crown size={18} />;
  }

  const getHappinessColor = () => {
      if (happiness > 70) return 'text-green-500';
      if (happiness < 40) return 'text-red-500';
      return 'text-yellow-500';
  }

  return (
    <div className="h-32 bg-stone-900 border-b-4 border-stone-800 flex items-center px-6 shadow-2xl space-x-6 z-30 relative shrink-0">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-20 pointer-events-none"></div>

      {/* Control Panel */}
      <div className="flex flex-col items-center bg-stone-950/80 p-3 rounded-lg border-2 border-stone-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] z-10">
          <div className="flex items-center space-x-2 mb-2">
             <button
                onClick={() => setGameSpeed(0)}
                className={`w-10 h-10 flex items-center justify-center rounded shadow-md border border-stone-600 transition-all active:translate-y-0.5 ${gameSpeed === 0 ? 'bg-red-900 text-red-100 border-red-700 shadow-[0_0_10px_rgba(185,28,28,0.5)]' : 'bg-stone-800 text-stone-500 hover:bg-stone-700'}`}
                title="Pausar"
             >
                <span className="text-xl font-bold">⏸</span>
             </button>
             <button
                onClick={() => setGameSpeed(1)}
                className={`w-10 h-10 flex items-center justify-center rounded shadow-md border border-stone-600 transition-all active:translate-y-0.5 ${gameSpeed === 1 ? 'bg-amber-700 text-amber-100 border-amber-600 shadow-[0_0_10px_rgba(180,83,9,0.5)]' : 'bg-stone-800 text-stone-500 hover:bg-stone-700'}`}
                title="Velocidade Normal"
             >
                <span className="text-xl font-bold">▶</span>
             </button>
             <button
                onClick={() => setGameSpeed(5)}
                className={`w-10 h-10 flex items-center justify-center rounded shadow-md border border-stone-600 transition-all active:translate-y-0.5 ${gameSpeed === 5 ? 'bg-green-800 text-green-100 border-green-600 shadow-[0_0_10px_rgba(21,128,61,0.5)]' : 'bg-stone-800 text-stone-500 hover:bg-stone-700'}`}
                title="Velocidade Rápida"
             >
                <span className="text-xl font-bold">⏭</span>
             </button>
          </div>
          <div className="flex items-center space-x-2 bg-black/40 px-3 py-1 rounded border border-stone-800 w-full justify-center">
             <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Dia</span>
             <div className="h-4 w-px bg-stone-700"></div>
             <span className="text-lg font-medieval text-amber-500 font-bold min-w-[30px] text-center">{day}</span>
          </div>
      </div>

      <div className="h-20 w-0.5 bg-stone-800 shadow-sm shrink-0"></div>

      {/* Stats Main */}
      <div className="flex flex-col space-y-3 z-10 shrink-0 min-w-[150px]">
          {/* Pop */}
          <div className="flex items-center space-x-3">
             <div className="text-stone-300 p-1.5 bg-stone-800 rounded shadow-sm">
               <Icons.Pop size={18} />
             </div>
             <div>
                <span className="text-[10px] text-stone-500 block uppercase font-bold tracking-wider">População</span>
                <span className="text-base font-bold text-stone-200">{Math.floor(population)} / {maxPop}</span>
             </div>
          </div>
          
          {/* Happiness & Gold */}
          <div className="flex space-x-4">
             {/* Gold */}
             <div className="flex items-center space-x-2">
                 <div className="text-yellow-500 p-1 bg-stone-800 rounded shadow-sm">
                    <Icons.gold size={14} />
                 </div>
                 <div>
                    <span className="text-[9px] text-stone-500 block uppercase font-bold tracking-wider">Ouro</span>
                    <span className="text-sm font-bold text-yellow-500">{formatNumber(resources[ResourceType.GOLD])}</span>
                 </div>
             </div>

             {/* Happiness Indicator */}
             <div className="flex items-center space-x-2" title="Satisfação Popular">
                 <div className={`${getHappinessColor()} p-1 bg-stone-800 rounded shadow-sm`}>
                    {getHappinessIcon()}
                 </div>
                 <div>
                    <span className="text-[9px] text-stone-500 block uppercase font-bold tracking-wider">Satisfação</span>
                    <span className={`text-sm font-bold ${getHappinessColor()}`}>{Math.floor(happiness)}%</span>
                 </div>
             </div>
          </div>
      </div>

      <div className="h-20 w-0.5 bg-stone-800 shadow-sm shrink-0"></div>

      {/* Resource Grid */}
      <div className="flex flex-col space-y-2 z-10 overflow-x-auto custom-scrollbar pb-1 w-full pl-2">
         {/* Top Row: Raw */}
         <div className="flex space-x-4 border-b border-stone-800/50 pb-2">
            {rawResources.map(renderResource)}
         </div>
         {/* Bottom Row: Processed */}
         <div className="flex space-x-4 pt-1">
            {processedResources.map(renderResource)}
         </div>
      </div>
      
      {/* Storage Indicator */}
      <div className="absolute top-2 right-2 text-[10px] text-stone-600 font-mono flex items-center gap-1 bg-stone-950/80 px-2 py-1 rounded-bl-lg border-l border-b border-stone-800">
         <Icons.Castle size={12} />
         <span>Max Estoque: {formatNumber(maxStorage)}</span>
      </div>
    </div>
  );
};
