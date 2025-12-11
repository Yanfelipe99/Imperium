
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ResourceBar } from './components/ResourceBar';
import { Icons } from './components/Icons';
import { 
  BuildingType, ResourceType, UnitType, BuildingCategory, TaxLevel, PolicyType,
  Resources, Buildings, Troops, Neighbor, LogEntry,
  GameSpeed,
  BiomeType,
  RelationStatus,
  ArmyStance,
  ArmyUpgrades,
  TechCategory,
  ActiveResearch,
  MarketPrice,
  TradeConfig
} from './types';
import { 
  INITIAL_RESOURCES, INITIAL_BUILDINGS, TICK_RATE_MS, 
  BUILDING_COSTS, PRODUCTION_RATES, HOUSE_CAPACITY, TOWN_CENTER_CAPACITY,
  BASE_STORAGE, STORAGE_PER_WAREHOUSE, WALL_DEFENSE_BONUS, SCOUT_COST,
  BREAD_CONSUMPTION_PER_POP, POPULATION_GROWTH_RATE, TAX_RATES, POLICIES, HAPPINESS_MAX, HAPPINESS_MIN, HAPPINESS_STARVATION_PENALTY, HAPPINESS_OVERCROWDING_PENALTY, BIOMES,
  UNIT_COSTS, UNIT_STATS, ENEMY_NAMES, LABELS_PT, COST_SCALING_FACTOR, BUILDING_CATEGORIES, UNIT_LORE,
  TRADE_ROUTE_COST, SPY_COST, GIFT_COST, GIFT_RELATION_BOOST, INSULT_RELATION_PENALTY,
  STANCE_MULTIPLIERS, STANCE_DESCRIPTIONS, UPGRADE_BASE_COST,
  TECHNOLOGIES, RESEARCH_POINT_GENERATION, RESOURCE_BASE_PRICES
} from './constants';

const App: React.FC = () => {
  // --- Game State ---
  const [activeTab, setActiveTab] = useState('overview');
  const [activeBuildingTab, setActiveBuildingTab] = useState<BuildingCategory>(BuildingCategory.EXTRACTION);
  const [gameSpeed, setGameSpeed] = useState<GameSpeed>(1); 
  
  // UI State
  const [panelTab, setPanelTab] = useState<'diplomacy' | 'trade' | 'espionage' | 'war'>('diplomacy');
  const [armyTab, setArmyTab] = useState<'hq' | 'recruit' | 'forge' | 'tactics'>('hq');
  const [techTab, setTechTab] = useState<TechCategory>(TechCategory.ECONOMY);
  const [tradeMenuTab, setTradeMenuTab] = useState<'market' | 'routes' | 'policies'>('market');

  // Core State
  const [resources, setResources] = useState<Resources>(INITIAL_RESOURCES);
  const [buildings, setBuildings] = useState<Buildings>(INITIAL_BUILDINGS);
  const [troops, setTroops] = useState<Troops>({
    [UnitType.LANCER]: 0,
    [UnitType.ARCHER]: 0,
    [UnitType.KNIGHT]: 0
  });
  
  // Trade & Economy State
  const [marketPrices, setMarketPrices] = useState<Record<ResourceType, MarketPrice>>(() => {
      const initial: any = {};
      Object.values(ResourceType).forEach(r => {
          if (r !== ResourceType.GOLD) {
              const base = RESOURCE_BASE_PRICES[r as ResourceType];
              initial[r] = { base, currentBuy: base * 1.2, currentSell: base * 0.8, trend: 'stable' };
          }
      });
      return initial;
  });

  // Technology State
  const [researchPoints, setResearchPoints] = useState(0);
  const [unlockedTechs, setUnlockedTechs] = useState<Set<string>>(new Set());
  const [activeResearch, setActiveResearch] = useState<ActiveResearch | null>(null);

  // Military Advanced State
  const [armyStance, setArmyStance] = useState<ArmyStance>(ArmyStance.BALANCED);
  const [armyUpgrades, setArmyUpgrades] = useState<ArmyUpgrades>({ weapons: 0, armor: 0 });

  const [population, setPopulation] = useState(5);
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [selectedNeighborId, setSelectedNeighborId] = useState<string | null>(null);
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [gameTick, setGameTick] = useState(0);

  // Finance & Policies
  const [taxLevel, setTaxLevel] = useState<TaxLevel>(TaxLevel.NORMAL);
  const [happiness, setHappiness] = useState<number>(100);
  const [activePolicies, setActivePolicies] = useState<Set<PolicyType>>(new Set());
  
  // For UI: Calculated net production last tick
  const [lastTickProduction, setLastTickProduction] = useState<Partial<Record<ResourceType, number>>>({});

  // Derived Stats
  const techHouseBonus = unlockedTechs.has('urban_planning') ? 2 : 0;
  const maxPop = (buildings[BuildingType.HOUSE] * (HOUSE_CAPACITY + techHouseBonus)) + (buildings[BuildingType.TOWN_CENTER] * TOWN_CENTER_CAPACITY);
  const maxStorage = BASE_STORAGE + (buildings[BuildingType.WAREHOUSE] * STORAGE_PER_WAREHOUSE);
  
  const techWallBonus = unlockedTechs.has('stone_walls') ? 1.5 : 1.0;
  const wallBonus = buildings[BuildingType.WALL] * WALL_DEFENSE_BONUS * techWallBonus;
  
  // Revised Power Calculation
  const techAttackBonus = unlockedTechs.has('iron_weapons') ? 0.1 : 0;
  const upgradeMultiplier = 1 + (armyUpgrades.weapons * 0.1) + (armyUpgrades.armor * 0.05) + techAttackBonus;
  const stanceMultiplier = STANCE_MULTIPLIERS[armyStance];
  const policyMultiplier = activePolicies.has(PolicyType.MILITARY_TRAINING) ? 1.1 : 1.0;
  
  const rawPower = (troops[UnitType.LANCER] * UNIT_STATS[UnitType.LANCER].power) +
                   (troops[UnitType.ARCHER] * UNIT_STATS[UnitType.ARCHER].power) +
                   (troops[UnitType.KNIGHT] * UNIT_STATS[UnitType.KNIGHT].power);
  
  const currentPower = (rawPower * upgradeMultiplier * policyMultiplier * stanceMultiplier) + wallBonus;

  const blacksmithDiscount = Math.min(0.5, buildings[BuildingType.BLACKSMITH] * 0.05); // Max 50% discount

  // --- Helpers ---
  const addLog = (message: string, type: 'info' | 'success' | 'danger' | 'warning' = 'info') => {
    const newLog: LogEntry = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString('pt-BR')
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const getBuildingCost = (type: BuildingType, currentLevel: number) => {
    const base = BUILDING_COSTS[type];
    const multiplier = Math.pow(COST_SCALING_FACTOR, currentLevel - (INITIAL_BUILDINGS[type] > 0 ? 1 : 0));
    
    return {
      planks: Math.floor(base.planks * multiplier),
      blocks: Math.floor(base.blocks * multiplier),
      ingots: Math.floor(base.ingots * multiplier),
      gold: Math.floor(base.gold * multiplier),
    };
  };

  const getUnitCost = (type: UnitType) => {
    const base = UNIT_COSTS[type];
    return {
      planks: Math.floor(base.planks * (1 - blacksmithDiscount)),
      ingots: Math.floor(base.ingots * (1 - blacksmithDiscount)),
      bread: Math.floor(base.bread * (1 - blacksmithDiscount)),
      gold: Math.floor(base.gold * (1 - blacksmithDiscount)),
      pop: base.pop
    };
  };

  const getUpgradeCost = (currentLevel: number) => {
      const multiplier = Math.pow(1.5, currentLevel);
      return {
          ingots: Math.floor(UPGRADE_BASE_COST[ResourceType.IRON_INGOTS] * multiplier),
          gold: Math.floor(UPGRADE_BASE_COST[ResourceType.GOLD] * multiplier)
      };
  }

  const generateNeighbors = useCallback(() => {
    const names = [...ENEMY_NAMES].sort(() => 0.5 - Math.random()).slice(0, 8);
    const biomes = Object.values(BiomeType);
    const resourceTypes = [
       ResourceType.RAW_WOOD, ResourceType.RAW_STONE, ResourceType.IRON_ORE, 
       ResourceType.WHEAT, ResourceType.PLANKS, ResourceType.BLOCKS, 
       ResourceType.IRON_INGOTS, ResourceType.BREAD
    ];
    
    const newNeighbors: Neighbor[] = names.map((name, index) => {
        const x = 10 + Math.random() * 80;
        const y = 10 + Math.random() * 80;

        const exports = [resourceTypes[Math.floor(Math.random() * resourceTypes.length)]];
        let imp = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
        while (imp === exports[0]) imp = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
        const imports = [imp];

        return {
          id: `neighbor-${index}`,
          name,
          biome: biomes[Math.floor(Math.random() * biomes.length)] as BiomeType,
          militaryPower: 50 + (index * 120),
          wealth: 500 + (index * 200),
          population: 10 + (index * 5),
          relationScore: Math.floor(Math.random() * 60) - 20, 
          relationStatus: RelationStatus.NEUTRAL,
          distance: 1 + Math.floor(Math.random() * 5),
          tradeRouteActive: false,
          tradeConfig: { importRes: null, exportRes: null },
          exports,
          imports,
          intelLevel: 0,
          lastEspionageTurn: 0,
          x,
          y
        };
    });
    setNeighbors(newNeighbors);
  }, []);

  // Initialize Logic
  useEffect(() => {
    generateNeighbors();
    addLog("Bem-vindo, Lorde! Construa fazendas e minas para iniciar sua economia.", 'info');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Game Loop ---
  useEffect(() => {
    if (gameSpeed === 0) {
        setLastTickProduction({});
        return;
    }

    const intervalRate = Math.floor(TICK_RATE_MS / gameSpeed);
    
    const interval = setInterval(() => {
      setGameTick(t => t + 1);

      // --- Research Logic ---
      const rpGeneration = RESEARCH_POINT_GENERATION + (buildings[BuildingType.CATHEDRAL] * 0.5) + (buildings[BuildingType.TOWN_CENTER] * 0.1);
      setResearchPoints(prev => prev + rpGeneration);

      setActiveResearch(prev => {
          if (!prev || prev.paused) return prev;
          const tech = TECHNOLOGIES[prev.techId];
          const newProgress = prev.progress + 1;
          if (newProgress >= tech.duration) {
              setUnlockedTechs(old => new Set(old).add(prev.techId));
              addLog(`Pesquisa Concluída: ${tech.name}!`, 'success');
              return null;
          }
          return { ...prev, progress: newProgress };
      });

      // --- Market Price Fluctuation (Every ~60 ticks) ---
      if (gameTick % 60 === 0) {
          setMarketPrices(prev => {
              const next = { ...prev };
              (Object.keys(next) as ResourceType[]).forEach(res => {
                  if (res === ResourceType.GOLD) return;
                  const stock = resources[res];
                  // Scarcity Multiplier: High stock -> Low price, Low stock -> High price
                  // Target stock is roughly 200.
                  const scarcity = Math.max(0.5, Math.min(2.5, 200 / (stock + 50)));
                  const randomVar = 0.9 + Math.random() * 0.2; // +/- 10%
                  
                  const newBase = RESOURCE_BASE_PRICES[res] * scarcity * randomVar;
                  
                  const trend = newBase > next[res].currentBuy ? 'up' : newBase < next[res].currentBuy ? 'down' : 'stable';
                  
                  next[res] = {
                      base: RESOURCE_BASE_PRICES[res],
                      currentBuy: Number((newBase * 1.3).toFixed(2)), // Buy price markup
                      currentSell: Number((newBase * 0.7).toFixed(2)), // Sell price markdown
                      trend
                  };
              });
              return next;
          });
      }

      // --- Happiness Logic ---
      setHappiness(prev => {
         let change = 0;
         change += TAX_RATES[taxLevel].happinessChange;
         if (activePolicies.has(PolicyType.RATIONING)) change -= 3;
         if (activePolicies.has(PolicyType.FORCED_LABOR)) change -= 5;
         if (activePolicies.has(PolicyType.FESTIVALS)) change += 3;
         if (unlockedTechs.has('sanitation')) change += 0.1;
         if (population > maxPop) change -= HAPPINESS_OVERCROWDING_PENALTY;
         if (resources.bread <= 0) change -= HAPPINESS_STARVATION_PENALTY;

         if (change === 0) {
            if (prev > 50) change = -0.5;
            if (prev < 50) change = 0.5;
         }

         let newVal = prev + change;
         if (newVal > HAPPINESS_MAX) newVal = HAPPINESS_MAX;
         if (newVal < HAPPINESS_MIN) newVal = HAPPINESS_MIN;
         return newVal;
      });

      setResources(prev => {
        let newRes = { ...prev };
        let productionTrack: Partial<Record<ResourceType, number>> = {};
        const prodMultiplier = activePolicies.has(PolicyType.FORCED_LABOR) ? 1.2 : 1.0;

        // Tech Multipliers
        const cropBonus = (unlockedTechs.has('crop_rotation') ? 0.2 : 0) + (unlockedTechs.has('heavy_plough') ? 0.3 : 0);
        const mineBonus = unlockedTechs.has('deep_mining') ? 0.2 : 0;
        const breadBonus = unlockedTechs.has('heavy_plough') ? 0.3 : 0;

        // --- Production & Industry ---
        const extractionList = [
            { b: BuildingType.LUMBER_HUT, r: ResourceType.RAW_WOOD, bonus: 0 },
            { b: BuildingType.QUARRY, r: ResourceType.RAW_STONE, bonus: mineBonus },
            { b: BuildingType.IRON_MINE, r: ResourceType.IRON_ORE, bonus: mineBonus },
            { b: BuildingType.FARM, r: ResourceType.WHEAT, bonus: cropBonus },
        ];
        extractionList.forEach(({ b, r, bonus }) => {
            const count = buildings[b];
            const output = (PRODUCTION_RATES[b]?.output?.[r] || 0) * count * (prodMultiplier + bonus);
            if (newRes[r] < maxStorage) {
               newRes[r] += output;
               productionTrack[r] = (productionTrack[r] || 0) + output;
            }
        });

        const factories = [
            { b: BuildingType.SAWMILL, in: ResourceType.RAW_WOOD, out: ResourceType.PLANKS, bonus: 0 },
            { b: BuildingType.MASONRY, in: ResourceType.RAW_STONE, out: ResourceType.BLOCKS, bonus: 0 },
            { b: BuildingType.FOUNDRY, in: ResourceType.IRON_ORE, out: ResourceType.IRON_INGOTS, bonus: 0 },
            { b: BuildingType.WINDMILL, in: ResourceType.WHEAT, out: ResourceType.BREAD, bonus: breadBonus },
        ];
        factories.forEach(factory => {
             const count = buildings[factory.b];
             if (count > 0) {
                 const inputNeeded = (PRODUCTION_RATES[factory.b]?.input?.[factory.in] || 0) * count * prodMultiplier;
                 const output = (PRODUCTION_RATES[factory.b]?.output?.[factory.out] || 0) * count * (prodMultiplier + factory.bonus);
                 if (newRes[factory.in] >= inputNeeded && newRes[factory.out] < maxStorage) {
                    newRes[factory.in] -= inputNeeded;
                    newRes[factory.out] += output;
                    productionTrack[factory.in] = (productionTrack[factory.in] || 0) - inputNeeded;
                    productionTrack[factory.out] = (productionTrack[factory.out] || 0) + output;
                 }
             }
        });

        // --- Trade Route Logic ---
        let tradeIncome = 0;
        const guildBonus = unlockedTechs.has('trade_guilds') ? 2 : 0;
        
        neighbors.forEach(n => {
            if (n.tradeRouteActive && n.relationStatus !== RelationStatus.WAR) {
                // Passive Route Income (Taxes/Tariffs)
                tradeIncome += 1 + guildBonus; 

                // Active Import/Export Logic (Per Tick)
                // Import: Buy item from them (Spend Gold, Gain Res)
                if (n.tradeConfig.importRes) {
                    const cost = RESOURCE_BASE_PRICES[n.tradeConfig.importRes] * 1.5; // Import mark-up
                    if (newRes.gold >= cost && newRes[n.tradeConfig.importRes] < maxStorage) {
                        newRes.gold -= cost;
                        newRes[n.tradeConfig.importRes] += 1;
                        productionTrack[ResourceType.GOLD] = (productionTrack[ResourceType.GOLD] || 0) - cost;
                        productionTrack[n.tradeConfig.importRes] = (productionTrack[n.tradeConfig.importRes] || 0) + 1;
                    }
                }
                // Export: Sell item to them (Spend Res, Gain Gold)
                if (n.tradeConfig.exportRes) {
                    const price = RESOURCE_BASE_PRICES[n.tradeConfig.exportRes] * 0.8; // Wholesale price
                    if (newRes[n.tradeConfig.exportRes] >= 1) {
                        newRes[n.tradeConfig.exportRes] -= 1;
                        newRes.gold += price;
                        productionTrack[ResourceType.GOLD] = (productionTrack[ResourceType.GOLD] || 0) + price;
                        productionTrack[n.tradeConfig.exportRes] = (productionTrack[n.tradeConfig.exportRes] || 0) - 1;
                    }
                }
            }
        });
        newRes.gold += tradeIncome;
        productionTrack[ResourceType.GOLD] = (productionTrack[ResourceType.GOLD] || 0) + tradeIncome;


        // Economy & Upkeep
        const tcGold = buildings[BuildingType.TOWN_CENTER] * 10;
        const marketGold = buildings[BuildingType.MARKET] * (15 + guildBonus);
        
        const taxEfficiency = unlockedTechs.has('feudal_code') ? 1.1 : 1.0;
        const taxGold = population * (TAX_RATES[taxLevel].goldPerPop / 60) * taxEfficiency;
        
        newRes.gold += tcGold + marketGold + taxGold;
        productionTrack[ResourceType.GOLD] = (productionTrack[ResourceType.GOLD] || 0) + tcGold + marketGold + taxGold;

        let breadConsumed = population * BREAD_CONSUMPTION_PER_POP;
        if (activePolicies.has(PolicyType.RATIONING)) breadConsumed *= 0.5;
        newRes.bread -= breadConsumed;
        productionTrack[ResourceType.BREAD] = (productionTrack[ResourceType.BREAD] || 0) - breadConsumed;

        if (activePolicies.has(PolicyType.FESTIVALS)) {
            const cost = population / 60;
            newRes.gold -= cost;
            productionTrack[ResourceType.GOLD] -= cost;
        }

        let upkeepMultiplier = activePolicies.has(PolicyType.MILITARY_TRAINING) ? 1.5 : 1.0;
        if (unlockedTechs.has('standing_army')) upkeepMultiplier *= 0.9;

        const upkeepGold = ((troops[UnitType.LANCER] * UNIT_STATS[UnitType.LANCER].upkeepGold +
                           troops[UnitType.ARCHER] * UNIT_STATS[UnitType.ARCHER].upkeepGold +
                           troops[UnitType.KNIGHT] * UNIT_STATS[UnitType.KNIGHT].upkeepGold) / 60) * upkeepMultiplier;
        const upkeepBread = (troops[UnitType.LANCER] * UNIT_STATS[UnitType.LANCER].upkeepBread +
                            troops[UnitType.ARCHER] * UNIT_STATS[UnitType.ARCHER].upkeepBread +
                            troops[UnitType.KNIGHT] * UNIT_STATS[UnitType.KNIGHT].upkeepBread) / 60;

        newRes.gold -= upkeepGold;
        newRes.bread -= upkeepBread;
        productionTrack[ResourceType.GOLD] -= upkeepGold;
        productionTrack[ResourceType.BREAD] -= upkeepBread;

        if (newRes.bread < 0) newRes.bread = 0;
        if (newRes.gold < 0) newRes.gold = 0;

        Object.keys(newRes).forEach((key) => {
            const k = key as ResourceType;
            if (k !== ResourceType.GOLD && newRes[k] > maxStorage) {
                newRes[k] = maxStorage;
            }
        });

        const trackPerMin: any = {};
        (Object.keys(productionTrack) as ResourceType[]).forEach(k => {
            trackPerMin[k] = (productionTrack[k] || 0) * 60;
        });
        setLastTickProduction(trackPerMin);

        return newRes;
      });

      // --- Pop Growth ---
      setPopulation(prev => {
        const growthBonus = buildings[BuildingType.CATHEDRAL] * 0.02 + (unlockedTechs.has('sanitation') ? 0.05 : 0);
        let happinessMod = happiness > 80 ? 0.05 : happiness < 30 ? -0.15 : 0;
        const currentRate = POPULATION_GROWTH_RATE + growthBonus + happinessMod;

        if (happiness < 20 && prev > 2 && Math.random() < 0.2) return prev - 1;
        if (resources.bread > 10 && prev < maxPop && Math.random() < Math.max(0, currentRate)) return prev + 1;
        if (resources.bread <= 0 && prev > 2 && Math.random() < 0.1) return prev - 1;
        return prev;
      });

      // --- Neighbor Logic ---
      if (gameTick % 60 === 0) { 
         setNeighbors(prev => prev.map(n => {
             if (n.relationStatus === RelationStatus.VASSAL) return n;
             
             let powerGrowth = 1;
             if (n.relationStatus === RelationStatus.WAR) powerGrowth = 5; 
             
             let newRel = n.relationScore;
             if (n.relationStatus !== RelationStatus.WAR) {
                 if (newRel > 0) newRel = Math.max(0, newRel - 0.5);
                 if (newRel < 0) newRel = Math.min(0, newRel + 0.5);
             }

             let status = n.relationStatus;
             if (status !== RelationStatus.VASSAL && status !== RelationStatus.WAR) {
                 if (newRel >= 80) status = RelationStatus.ALLY;
                 else if (newRel >= 30) status = RelationStatus.FRIENDLY;
                 else if (newRel <= -50) status = RelationStatus.HOSTILE;
                 else status = RelationStatus.NEUTRAL;
             }

             return { 
                 ...n, 
                 militaryPower: n.militaryPower + powerGrowth,
                 relationScore: newRel,
                 relationStatus: status
             };
         }));
      }

    }, intervalRate);

    return () => clearInterval(interval);
  }, [buildings, population, maxPop, resources.bread, gameSpeed, gameTick, maxStorage, resources, troops, taxLevel, activePolicies, happiness, neighbors, armyStance, armyUpgrades, unlockedTechs, activeResearch]);


  // --- Actions ---

  const constructBuilding = (type: BuildingType) => {
    const cost = getBuildingCost(type, buildings[type]);
    if (resources.planks < cost.planks || resources.blocks < cost.blocks || resources.iron_ingots < cost.ingots || resources.gold < cost.gold) {
      addLog(`Recursos insuficientes para ${LABELS_PT.buildings[type]}`, 'warning');
      return;
    }
    setResources(prev => ({
      ...prev,
      planks: prev.planks - cost.planks,
      blocks: prev.blocks - cost.blocks,
      iron_ingots: prev.iron_ingots - cost.ingots,
      gold: prev.gold - cost.gold
    }));
    setBuildings(prev => ({ ...prev, [type]: prev[type] + 1 }));
    addLog(`${LABELS_PT.buildings[type]} construído(a).`, 'success');
  };

  const recruitUnit = (type: UnitType) => {
    const cost = getUnitCost(type);
    if (type === UnitType.KNIGHT && buildings[BuildingType.STABLE] < 1) return addLog("Necessário: Estábulo.", 'warning');
    if (buildings[BuildingType.BARRACKS] < 1) return addLog("Necessário: Quartel.", 'warning');
    if (population < cost.pop + 2) return addLog("População insuficiente.", 'warning');
    if (resources.planks < cost.planks || resources.iron_ingots < cost.ingots || resources.bread < cost.bread || resources.gold < cost.gold) {
      return addLog("Recursos insuficientes.", 'warning');
    }
    setResources(prev => ({
      ...prev,
      planks: prev.planks - cost.planks,
      iron_ingots: prev.iron_ingots - cost.ingots,
      bread: prev.bread - cost.bread,
      gold: prev.gold - cost.gold
    }));
    setPopulation(prev => prev - cost.pop);
    setTroops(prev => ({ ...prev, [type]: prev[type] + 1 }));
    addLog(`${LABELS_PT.units[type]} recrutado.`, 'success');
  };

  const dismissUnit = (type: UnitType) => {
    if (troops[type] <= 0) return;
    setTroops(prev => ({ ...prev, [type]: prev[type] - 1 }));
    setPopulation(prev => Math.min(prev + 1, maxPop));
    addLog(`${LABELS_PT.units[type]} dispensado do serviço.`, 'info');
  };

  const purchaseUpgrade = (type: 'weapons' | 'armor') => {
      const currentLevel = armyUpgrades[type];
      const cost = getUpgradeCost(currentLevel);
      if (resources.iron_ingots < cost.ingots || resources.gold < cost.gold) {
          return addLog("Ferro ou Ouro insuficientes para forjar melhoria.", 'warning');
      }
      setResources(prev => ({ ...prev, iron_ingots: prev.iron_ingots - cost.ingots, gold: prev.gold - cost.gold }));
      setArmyUpgrades(prev => ({ ...prev, [type]: prev[type] + 1 }));
      addLog(`Melhoria de ${type === 'weapons' ? 'Armas' : 'Armaduras'} concluída!`, 'success');
  };

  const startResearch = (techId: string) => {
      const tech = TECHNOLOGIES[techId];
      if (!tech || activeResearch || resources.gold < tech.goldCost || researchPoints < tech.cost) return addLog("Não é possível iniciar pesquisa.", 'warning');
      setResources(prev => ({ ...prev, gold: prev.gold - tech.goldCost }));
      setResearchPoints(prev => prev - tech.cost);
      setActiveResearch({ techId, progress: 0, paused: false });
      addLog(`Pesquisa iniciada: ${tech.name}`, 'info');
  };

  const accelerateResearch = () => {
      if (!activeResearch) return;
      const rushCost = 100;
      if (resources.gold < rushCost) return addLog("Ouro insuficiente para acelerar.", 'warning');
      setResources(prev => ({ ...prev, gold: prev.gold - rushCost }));
      setActiveResearch(prev => prev ? { ...prev, progress: Math.min(TECHNOLOGIES[prev.techId].duration, prev.progress + 15) } : null);
      addLog("Pesquisa acelerada com sucesso!", 'success');
  };

  const cancelResearch = () => {
      if (!activeResearch) return;
      setActiveResearch(null);
      addLog("Pesquisa cancelada. Recursos perdidos.", 'danger');
  }

  const togglePolicy = (policy: PolicyType) => {
     setActivePolicies(prev => {
        const newSet = new Set(prev);
        if (newSet.has(policy)) newSet.delete(policy);
        else newSet.add(policy);
        return newSet;
     });
  };

  // --- Trade Actions ---
  const buyResource = (res: ResourceType, amount: number) => {
      if (buildings[BuildingType.MARKET] < 1) return addLog("Necessário construir um Mercado.", 'warning');
      const price = marketPrices[res].currentBuy;
      const totalCost = price * amount;
      
      if (resources.gold < totalCost) return addLog("Ouro insuficiente.", 'warning');
      if (resources[res] + amount > maxStorage) return addLog("Armazenamento cheio.", 'warning');

      setResources(prev => ({ ...prev, gold: prev.gold - totalCost, [res]: prev[res] + amount }));
      // Buying increases price slightly immediately
      setMarketPrices(prev => ({
          ...prev, 
          [res]: { ...prev[res], currentBuy: prev[res].currentBuy + 0.05, currentSell: prev[res].currentSell + 0.03 } 
      }));
  };

  const sellResource = (res: ResourceType, amount: number) => {
      if (buildings[BuildingType.MARKET] < 1) return addLog("Necessário construir um Mercado.", 'warning');
      const price = marketPrices[res].currentSell;
      const totalGain = price * amount;

      if (resources[res] < amount) return addLog("Recursos insuficientes.", 'warning');

      setResources(prev => ({ ...prev, gold: prev.gold + totalGain, [res]: prev[res] - amount }));
      // Selling decreases price slightly
      setMarketPrices(prev => ({
          ...prev, 
          [res]: { ...prev[res], currentBuy: Math.max(0.1, prev[res].currentBuy - 0.05), currentSell: Math.max(0.1, prev[res].currentSell - 0.03) } 
      }));
  };

  const configureRoute = (neighborId: string, type: 'import' | 'export', res: ResourceType | null) => {
      setNeighbors(prev => prev.map(n => {
          if (n.id !== neighborId) return n;
          const newConfig = { ...n.tradeConfig };
          if (type === 'import') newConfig.importRes = res;
          else newConfig.exportRes = res;
          return { ...n, tradeConfig: newConfig };
      }));
  };

  const toggleRouteActive = (neighborId: string) => {
      setNeighbors(prev => prev.map(n => {
          if (n.id !== neighborId) return n;
          // If activating, check cost
          if (!n.tradeRouteActive) {
              if (resources.gold < TRADE_ROUTE_COST) {
                  addLog("Ouro insuficiente para abrir rota.", 'warning');
                  return n;
              }
              setResources(r => ({ ...r, gold: r.gold - TRADE_ROUTE_COST }));
              addLog(`Rota comercial aberta com ${n.name}`, 'success');
              return { ...n, tradeRouteActive: true };
          } else {
              // Closing is free
              addLog(`Rota comercial fechada com ${n.name}`, 'info');
              return { ...n, tradeRouteActive: false, tradeConfig: { importRes: null, exportRes: null } };
          }
      }));
  };

  // ... (Keep existing Diplomatic/War functions)
  const handleDiplomacy = (action: 'gift' | 'insult' | 'treaty' | 'war') => {
      if (!selectedNeighborId) return;
      const neighbor = neighbors.find(n => n.id === selectedNeighborId);
      if (!neighbor) return;

      if (action === 'gift') {
          if (resources.gold < GIFT_COST) return addLog("Ouro insuficiente para enviar presente.", 'warning');
          setResources(prev => ({ ...prev, gold: prev.gold - GIFT_COST }));
          setNeighbors(prev => prev.map(n => n.id === selectedNeighborId ? { ...n, relationScore: Math.min(100, n.relationScore + GIFT_RELATION_BOOST) } : n));
          addLog(`Presente enviado para ${neighbor.name}. As relações melhoraram.`, 'success');
      }
      if (action === 'insult') {
          setNeighbors(prev => prev.map(n => n.id === selectedNeighborId ? { ...n, relationScore: Math.max(-100, n.relationScore - INSULT_RELATION_PENALTY) } : n));
          addLog(`Embaixador insultou o líder de ${neighbor.name}!`, 'danger');
      }
      if (action === 'war') {
          setNeighbors(prev => prev.map(n => n.id === selectedNeighborId ? { ...n, relationStatus: RelationStatus.WAR, relationScore: -100, tradeRouteActive: false } : n));
          addLog(`GUERRA DECLARADA contra ${neighbor.name}!`, 'danger');
      }
  };

  const handleEspionage = (action: 'scout' | 'sabotage') => {
      if (!selectedNeighborId) return;
      if (action === 'scout') {
          if (resources.gold < SPY_COST) return addLog("Ouro insuficiente para espiões.", 'warning');
          setResources(prev => ({ ...prev, gold: prev.gold - SPY_COST }));
          if (Math.random() < 0.2) {
             setNeighbors(prev => prev.map(n => n.id === selectedNeighborId ? { ...n, relationScore: n.relationScore - 20 } : n));
             addLog("Espiões capturados e executados!", 'danger');
          } else {
             setNeighbors(prev => prev.map(n => n.id === selectedNeighborId ? { ...n, intelLevel: 2 } : n));
             addLog("Espionagem bem sucedida!", 'success');
          }
      }
  };

  const handleWar = (action: 'raid' | 'conquer') => {
      if (!selectedNeighborId) return;
      const neighbor = neighbors.find(n => n.id === selectedNeighborId);
      if (!neighbor) return;
      
      if (currentPower === 0) return addLog("Sem exército para atacar!", 'warning');
      addLog(`Tropas marchando para ${neighbor.name}...`, 'info');
      setNeighbors(prev => prev.map(n => n.id === selectedNeighborId ? { ...n, relationStatus: RelationStatus.WAR, relationScore: -100 } : n));

      setTimeout(() => {
        const variance = neighbor.intelLevel === 2 ? 0.2 : 0.5;
        const enemyRoll = neighbor.militaryPower * (0.9 + Math.random() * variance); 
        const myRoll = currentPower * (0.8 + Math.random() * 0.4); 

        if (myRoll > enemyRoll) {
           if (action === 'conquer') {
               setNeighbors(prev => prev.map(n => n.id === selectedNeighborId ? { ...n, relationStatus: RelationStatus.VASSAL, relationScore: 100, militaryPower: 0 } : n));
               addLog(`VITÓRIA GLORIOSA! ${neighbor.name} agora é um vassalo do nosso império.`, 'success');
           } else {
               const goldStolen = Math.floor(neighbor.wealth * 0.3);
               setResources(prev => ({ ...prev, gold: prev.gold + goldStolen }));
               setNeighbors(prev => prev.map(n => n.id === selectedNeighborId ? { ...n, wealth: n.wealth - goldStolen } : n));
               addLog(`Saque bem sucedido! Roubamos ${goldStolen} de Ouro.`, 'success');
           }
        } else {
           const lossPercent = 0.3;
           setTroops(prev => ({
             [UnitType.LANCER]: Math.floor(prev[UnitType.LANCER] * (1 - lossPercent)),
             [UnitType.ARCHER]: Math.floor(prev[UnitType.ARCHER] * (1 - lossPercent)),
             [UnitType.KNIGHT]: Math.floor(prev[UnitType.KNIGHT] * (1 - lossPercent)),
           }));
           addLog(`Derrota humilhante em ${neighbor.name}. Retirada forçada com baixas pesadas.`, 'danger');
        }
      }, 1500);
  };


  // --- Render Components ---

  const CostList = ({ costs, resources, population }: { costs: Record<string, number>, resources: Resources, population?: number }) => {
     const mapKeyToInfo = (key: string) => {
        switch(key) {
            case 'planks': return { type: ResourceType.PLANKS, label: LABELS_PT.resources[ResourceType.PLANKS] };
            case 'blocks': return { type: ResourceType.BLOCKS, label: LABELS_PT.resources[ResourceType.BLOCKS] };
            case 'ingots': return { type: ResourceType.IRON_INGOTS, label: LABELS_PT.resources[ResourceType.IRON_INGOTS] };
            case 'bread': return { type: ResourceType.BREAD, label: LABELS_PT.resources[ResourceType.BREAD] };
            case 'gold': return { type: ResourceType.GOLD, label: LABELS_PT.resources[ResourceType.GOLD] };
            case 'pop': return { type: 'pop', label: 'Aldeão' };
            default: return null;
        }
     };

     const activeCosts = Object.entries(costs).filter(([_, val]) => val > 0);
     if (activeCosts.length === 0) return <div className="text-xs text-stone-500 italic">Grátis</div>;

     return (
        <div className="space-y-1 mt-2 p-3 bg-stone-950/40 rounded border border-stone-800">
           {activeCosts.map(([key, val]) => {
               const info = mapKeyToInfo(key);
               if (!info) return null;
               
               let canAfford = false;
               if (info.type === 'pop') {
                   canAfford = (population ?? 0) >= val + 2; 
               } else {
                   canAfford = resources[info.type as ResourceType] >= val;
               }
               
               return (
                   <div key={key} className="flex justify-between items-center text-xs font-bold">
                       <span className="text-stone-500">{info.label}</span>
                       <span className={canAfford ? 'text-stone-300' : 'text-red-500'}>{val}</span>
                   </div>
               );
           })}
        </div>
     );
  };

  const ProductionDisplay = ({ type }: { type: BuildingType }) => {
     const rates = PRODUCTION_RATES[type as keyof typeof PRODUCTION_RATES] as { input?: Record<string, number>, output?: Record<string, number> } | undefined;
     if (!rates) return null;

     return (
        <div className="flex flex-col space-y-2 mt-4 p-3 bg-stone-950/60 rounded border border-stone-800">
           <span className="text-[10px] uppercase font-bold text-stone-500 tracking-widest border-b border-stone-800 pb-1">Produção / Minuto</span>
           {rates.input && (
             <div className="space-y-1">
                {Object.entries(rates.input).map(([res, val]) => (
                     <div key={res} className="flex justify-between items-center text-xs font-bold text-red-400">
                        <span>{LABELS_PT.resources[res as keyof typeof LABELS_PT.resources]}</span>
                        <span>-{(val as number) * 60}</span>
                     </div>
                ))}
             </div>
           )}
           {rates.input && rates.output && <div className="flex justify-center my-0 text-stone-700 text-[10px]">▼</div>}
           {rates.output && (
             <div className="space-y-1">
                {Object.entries(rates.output).map(([res, val]) => (
                     <div key={res} className="flex justify-between items-center text-xs font-bold text-green-500">
                        <span>{LABELS_PT.resources[res as keyof typeof LABELS_PT.resources]}</span>
                        <span>+{(val as number) * 60}</span>
                     </div>
                ))}
             </div>
           )}
        </div>
     )
  }

  // --- Views ---

  const renderTrade = () => {
      const activeRoutes = neighbors.filter(n => n.tradeRouteActive).length;
      const tradeProfit = (lastTickProduction[ResourceType.GOLD] || 0) - (buildings[BuildingType.TOWN_CENTER] * 10) - (population * (TAX_RATES[taxLevel].goldPerPop / 60) * 60);
      
      return (
          <div className="flex flex-col h-full space-y-6">
              {/* Trade Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-stone-900 p-6 border-2 border-stone-700 rounded-sm relative overflow-hidden group hover:border-amber-700 transition-colors">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10"><Icons.Cart size={80} /></div>
                      <h3 className="text-lg font-medieval font-bold text-amber-500 mb-2">Visão Geral</h3>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <span className="text-[10px] uppercase text-stone-500 font-bold block">Lucro Diário Est.</span>
                              <span className={`text-2xl font-bold ${tradeProfit > 0 ? 'text-green-500' : 'text-stone-400'}`}>
                                  {Math.floor(tradeProfit)} <span className="text-sm">Ouro</span>
                              </span>
                          </div>
                          <div>
                              <span className="text-[10px] uppercase text-stone-500 font-bold block">Rotas Ativas</span>
                              <span className="text-2xl font-bold text-blue-400">{activeRoutes}</span>
                          </div>
                      </div>
                  </div>
                  <div className="bg-stone-900 p-6 border-2 border-stone-700 rounded-sm relative overflow-hidden group hover:border-amber-700 transition-colors md:col-span-2">
                      <h3 className="text-lg font-medieval font-bold text-stone-300 mb-4">Mercado Global</h3>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                          {Object.values(ResourceType).filter(r => r !== ResourceType.GOLD).map(res => {
                              const r = res as ResourceType;
                              const price = marketPrices[r];
                              return (
                                  <div key={r} className="bg-stone-950/50 p-3 rounded min-w-[120px] border border-stone-800">
                                      <div className="flex justify-between mb-1">
                                          <span className="text-xs font-bold text-stone-400 uppercase">{LABELS_PT.resources[r]}</span>
                                          <span className={`text-xs ${price.trend === 'up' ? 'text-green-500' : price.trend === 'down' ? 'text-red-500' : 'text-stone-500'}`}>
                                              {price.trend === 'up' ? '▲' : price.trend === 'down' ? '▼' : '-'}
                                          </span>
                                      </div>
                                      <div className="text-lg font-bold text-yellow-500">{price.currentBuy.toFixed(1)}</div>
                                  </div>
                              )
                          })}
                      </div>
                  </div>
              </div>

              {/* Navigation */}
              <div className="flex border-b border-stone-800 bg-stone-950/50">
                  <button onClick={() => setTradeMenuTab('market')} className={`px-6 py-4 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${tradeMenuTab === 'market' ? 'border-amber-500 text-amber-500 bg-stone-900' : 'border-transparent text-stone-500 hover:text-stone-300'}`}>Mercado Interno</button>
                  <button onClick={() => setTradeMenuTab('routes')} className={`px-6 py-4 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${tradeMenuTab === 'routes' ? 'border-amber-500 text-amber-500 bg-stone-900' : 'border-transparent text-stone-500 hover:text-stone-300'}`}>Rotas Comerciais</button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {tradeMenuTab === 'market' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {Object.values(ResourceType).filter(r => r !== ResourceType.GOLD).map(res => {
                              const r = res as ResourceType;
                              const price = marketPrices[r];
                              const canBuy = buildings[BuildingType.MARKET] > 0;
                              return (
                                  <div key={r} className="bg-stone-900 border border-stone-700 p-4 rounded group relative hover:border-amber-600 transition-colors">
                                      <div className="flex justify-between items-start mb-4">
                                          <div className="flex items-center gap-3">
                                              <div className="text-2xl">{LABELS_PT.RESOURCE_ICONS[r]}</div>
                                              <div>
                                                  <span className="font-medieval font-bold text-stone-200 block">{LABELS_PT.resources[r]}</span>
                                                  <span className="text-xs text-stone-500">Estoque: {Math.floor(resources[r])}</span>
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4 mb-4 text-center text-xs">
                                          <div className="bg-stone-950 p-2 rounded">
                                              <span className="block text-stone-500 mb-1">Compra</span>
                                              <span className="text-lg font-bold text-red-400">{price.currentBuy.toFixed(1)}</span>
                                          </div>
                                          <div className="bg-stone-950 p-2 rounded">
                                              <span className="block text-stone-500 mb-1">Venda</span>
                                              <span className="text-lg font-bold text-green-500">{price.currentSell.toFixed(1)}</span>
                                          </div>
                                      </div>

                                      <div className="space-y-2">
                                          <div className="flex gap-1">
                                              <button onClick={() => buyResource(r, 10)} disabled={!canBuy} className="flex-1 bg-red-900/30 hover:bg-red-900/50 border border-red-900 text-red-400 py-2 rounded text-xs font-bold transition-colors disabled:opacity-50">
                                                  Comprar 10
                                              </button>
                                              <button onClick={() => buyResource(r, 100)} disabled={!canBuy} className="flex-1 bg-red-900/30 hover:bg-red-900/50 border border-red-900 text-red-400 py-2 rounded text-xs font-bold transition-colors disabled:opacity-50">
                                                  100
                                              </button>
                                          </div>
                                          <div className="flex gap-1">
                                              <button onClick={() => sellResource(r, 10)} disabled={!canBuy} className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-900 text-green-400 py-2 rounded text-xs font-bold transition-colors disabled:opacity-50">
                                                  Vender 10
                                              </button>
                                              <button onClick={() => sellResource(r, 100)} disabled={!canBuy} className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-900 text-green-400 py-2 rounded text-xs font-bold transition-colors disabled:opacity-50">
                                                  100
                                              </button>
                                          </div>
                                      </div>
                                      {!canBuy && <div className="absolute inset-0 bg-stone-950/80 flex items-center justify-center text-xs text-stone-500 font-bold uppercase tracking-widest backdrop-blur-sm">Requer Mercado</div>}
                                  </div>
                              );
                          })}
                      </div>
                  )}

                  {tradeMenuTab === 'routes' && (
                      <div className="space-y-4">
                          {neighbors.map(n => {
                              const isActive = n.tradeRouteActive;
                              return (
                                  <div key={n.id} className={`border-2 rounded-sm p-4 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between transition-all ${isActive ? 'bg-stone-900 border-amber-800' : 'bg-stone-950 border-stone-800 opacity-80'}`}>
                                      <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2">
                                              <span className="text-2xl">{BIOMES[n.biome].icon}</span>
                                              <div>
                                                  <h4 className={`font-medieval font-bold text-lg ${isActive ? 'text-amber-500' : 'text-stone-400'}`}>{n.name}</h4>
                                                  <span className="text-xs text-stone-500">{n.relationStatus === RelationStatus.WAR ? 'Em Guerra' : `Distância: ${n.distance} dias`}</span>
                                              </div>
                                          </div>
                                          <div className="flex gap-4 text-xs">
                                              <div className="text-green-500">Vende: {n.exports.map(r => LABELS_PT.resources[r]).join(', ')}</div>
                                              <div className="text-amber-500">Compra: {n.imports.map(r => LABELS_PT.resources[r]).join(', ')}</div>
                                          </div>
                                      </div>

                                      {isActive && n.relationStatus !== RelationStatus.WAR ? (
                                          <div className="flex-1 grid grid-cols-2 gap-4 w-full md:w-auto">
                                              <div className="bg-black/30 p-2 rounded border border-stone-800">
                                                  <span className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Importar (Comprar)</span>
                                                  <select 
                                                      className="w-full bg-stone-900 text-xs text-stone-300 border border-stone-700 rounded p-1"
                                                      value={n.tradeConfig.importRes || ''}
                                                      onChange={(e) => configureRoute(n.id, 'import', e.target.value as ResourceType || null)}
                                                  >
                                                      <option value="">Nada</option>
                                                      {n.exports.map(r => (
                                                          <option key={r} value={r}>{LABELS_PT.resources[r]} (-$$)</option>
                                                      ))}
                                                  </select>
                                              </div>
                                              <div className="bg-black/30 p-2 rounded border border-stone-800">
                                                  <span className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Exportar (Vender)</span>
                                                  <select 
                                                      className="w-full bg-stone-900 text-xs text-stone-300 border border-stone-700 rounded p-1"
                                                      value={n.tradeConfig.exportRes || ''}
                                                      onChange={(e) => configureRoute(n.id, 'export', e.target.value as ResourceType || null)}
                                                  >
                                                      <option value="">Nada</option>
                                                      {n.imports.map(r => (
                                                          <option key={r} value={r}>{LABELS_PT.resources[r]} (+$$)</option>
                                                      ))}
                                                  </select>
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="flex-1 text-center text-xs text-stone-500 italic">
                                              {n.relationStatus === RelationStatus.WAR ? "Rota bloqueada pela guerra." : "Rota inativa."}
                                          </div>
                                      )}

                                      <div className="w-full md:w-auto">
                                          <button 
                                              onClick={() => toggleRouteActive(n.id)}
                                              disabled={n.relationStatus === RelationStatus.WAR}
                                              className={`w-full md:w-32 py-3 text-xs font-bold uppercase tracking-wider rounded border transition-all ${
                                                  isActive 
                                                  ? 'bg-red-900/20 text-red-400 border-red-900 hover:bg-red-900/40' 
                                                  : 'bg-green-900/20 text-green-400 border-green-900 hover:bg-green-900/40'
                                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                                          >
                                              {isActive ? 'Fechar Rota' : `Abrir (${TRADE_ROUTE_COST} Ouro)`}
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          </div>
      );
  }

  const renderOverview = () => {
    // ... (Keep existing Overview logic)
    const growthRate = resources.bread > 0 ? (happiness > 80 ? 'Alto' : happiness > 40 ? 'Estável' : 'Estagnado') : 'Decrescente';
    const totalSoldiers = troops[UnitType.LANCER] + troops[UnitType.ARCHER] + troops[UnitType.KNIGHT];
    const militaryDensity = population > 0 ? (totalSoldiers / population) * 100 : 0;
    const stability = Math.min(100, Math.floor(happiness * 0.7 + militaryDensity * 0.5 + (buildings[BuildingType.WALL] * 2)));
    const orderLevel = stability > 80 ? 'Absoluta' : stability > 50 ? 'Controlada' : 'Caos';

    const taxIncome = population * (TAX_RATES[taxLevel].goldPerPop / 60);
    const buildingIncome = (buildings[BuildingType.TOWN_CENTER] * 10 + buildings[BuildingType.MARKET] * 15) / 60; 
    const taxIncomeMin = taxIncome * 60;
    const buildingIncomeMin = buildingIncome * 60;
    const tradeIncomeMin = (lastTickProduction[ResourceType.GOLD] || 0) * 60 - taxIncomeMin - buildingIncomeMin; // Approx trade
    const totalIncome = taxIncomeMin + buildingIncomeMin + Math.max(0, tradeIncomeMin);

    const armyUpkeepGold = ((troops[UnitType.LANCER] * UNIT_STATS[UnitType.LANCER].upkeepGold + 
                           troops[UnitType.ARCHER] * UNIT_STATS[UnitType.ARCHER].upkeepGold + 
                           troops[UnitType.KNIGHT] * UNIT_STATS[UnitType.KNIGHT].upkeepGold) * (activePolicies.has(PolicyType.MILITARY_TRAINING) ? 1.5 : 1));
    const policyCost = activePolicies.has(PolicyType.FESTIVALS) ? population : 0;
    const totalExpenses = armyUpkeepGold + policyCost;
    const netProfit = totalIncome - totalExpenses;

    const hostilePower = neighbors
        .filter(n => n.relationStatus === RelationStatus.WAR || n.relationStatus === RelationStatus.HOSTILE)
        .reduce((sum, n) => sum + (n.intelLevel === 2 ? n.militaryPower : n.militaryPower * 0.8), 0);
    
    const invasionRisk = hostilePower === 0 ? 0 : Math.min(100, Math.floor((hostilePower / (currentPower + 1)) * 50));
    const riskLabel = invasionRisk > 75 ? 'Crítico' : invasionRisk > 40 ? 'Alto' : invasionRisk > 20 ? 'Moderado' : 'Baixo';

    const goldTrend = netProfit > 0 ? 'positive' : 'negative';
    const foodTrend = (lastTickProduction[ResourceType.BREAD] || 0) > 0 ? 'positive' : 'negative';

    const events = [];
    if (resources.bread < 100) events.push({ text: "Estoques de comida baixos! Risco de fome.", type: 'bad' });
    if (happiness < 30) events.push({ text: "Descontentamento popular crescente.", type: 'bad' });
    if (neighbors.some(n => n.relationStatus === RelationStatus.WAR)) events.push({ text: "Conflitos ativos nas fronteiras.", type: 'bad' });
    if (activeResearch) events.push({ text: `Pesquisa em andamento: ${TECHNOLOGIES[activeResearch.techId].name}`, type: 'neutral' });
    if (events.length === 0) events.push({ text: "O reino vive um período de paz.", type: 'neutral' });

    return (
    <div className="space-y-6">
      <div className="bg-stone-900 border-b-2 border-stone-800 p-4 flex flex-col md:flex-row justify-between items-center shadow-lg">
          <div className="flex items-center gap-3 mb-2 md:mb-0">
              <span className="bg-amber-900/40 text-amber-500 p-2 rounded"><Icons.Scroll size={20}/></span>
              <h3 className="font-medieval font-bold text-stone-300 text-lg">Boletim Real</h3>
          </div>
          <div className="flex-1 mx-6 overflow-hidden relative h-6 w-full md:w-auto">
              <div className="absolute w-full animate-marquee whitespace-nowrap text-sm font-bold text-stone-400">
                  {events.map((e, i) => (
                      <span key={i} className={`mr-8 ${e.type === 'bad' ? 'text-red-400' : e.type === 'good' ? 'text-green-400' : 'text-stone-400'}`}>
                          • {e.text}
                      </span>
                  ))}
              </div>
          </div>
          <div className="text-xs font-mono text-stone-500 uppercase tracking-widest">
              Ano do Senhor {1200 + Math.floor(gameTick / 3600)}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-stone-900 border-2 border-stone-700 rounded-sm p-6 relative overflow-hidden group hover:border-stone-500 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Icons.Crown size={100} /></div>
              <h4 className="text-amber-500 font-medieval font-bold text-xl mb-4 flex items-center gap-2"><Icons.Users size={20} /> Reino & Sociedade</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                      <span className="text-[10px] uppercase text-stone-500 font-bold block">População</span>
                      <span className="text-2xl font-bold text-stone-200">{Math.floor(population)}</span>
                      <span className={`text-xs block ${growthRate === 'Decrescente' ? 'text-red-500' : 'text-green-500'}`}>{growthRate}</span>
                  </div>
                  <div>
                      <span className="text-[10px] uppercase text-stone-500 font-bold block">Ordem Pública</span>
                      <span className="text-2xl font-bold text-stone-200">{orderLevel}</span>
                      <span className="text-xs block text-stone-500">{stability}% Estabilidade</span>
                  </div>
              </div>
              <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-400">Satisfação Geral</span>
                      <div className="w-24 h-2 bg-stone-800 rounded-full overflow-hidden">
                          <div className={`h-full ${happiness > 50 ? 'bg-green-500' : 'bg-red-500'}`} style={{width: `${happiness}%`}}></div>
                      </div>
                  </div>
              </div>
          </div>

          <div className="bg-stone-900 border-2 border-stone-700 rounded-sm p-6 relative overflow-hidden group hover:border-stone-500 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Icons.Balance size={100} /></div>
              <h4 className="text-green-500 font-medieval font-bold text-xl mb-4 flex items-center gap-2"><Icons.Trade size={20} /> Economia Real</h4>
              <div className="flex items-center justify-between mb-4 bg-black/20 p-3 rounded border border-stone-800">
                  <div>
                      <span className="text-[10px] uppercase text-stone-500 font-bold block">Lucro Líquido</span>
                      <span className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {netProfit > 0 ? '+' : ''}{netProfit.toFixed(1)} <span className="text-xs text-stone-500">/min</span>
                      </span>
                  </div>
                  <div className={`p-2 rounded-full ${goldTrend === 'positive' ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'}`}>
                      {goldTrend === 'positive' ? <Icons.TrendingUp size={24} /> : <Icons.TrendingDown size={24} />}
                  </div>
              </div>
              <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-stone-400"><span>Tesouro Atual</span><span className="text-yellow-500">{Math.floor(resources.gold)}</span></div>
              </div>
          </div>

          <div className="bg-stone-900 border-2 border-stone-700 rounded-sm p-6 relative overflow-hidden group hover:border-stone-500 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Icons.Sword size={100} /></div>
              <h4 className="text-red-500 font-medieval font-bold text-xl mb-4 flex items-center gap-2"><Icons.Shield size={20} /> Relatório Militar</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                      <span className="text-[10px] uppercase text-stone-500 font-bold block">Força Total</span>
                      <span className="text-2xl font-bold text-stone-200">{Math.floor(currentPower)}</span>
                  </div>
                  <div>
                      <span className="text-[10px] uppercase text-stone-500 font-bold block">Risco Invasão</span>
                      <span className={`text-2xl font-bold ${riskLabel === 'Crítico' || riskLabel === 'Alto' ? 'text-red-500 animate-pulse' : 'text-stone-200'}`}>{riskLabel}</span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  )};

  // ... (Keep existing renders: renderTechnology, renderBuildings, renderArmy, renderFinance, renderNewMap)
  const renderTechnology = () => {
      const activeTech = activeResearch ? TECHNOLOGIES[activeResearch.techId] : null;
      return (
          <div className="flex flex-col h-full space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-stone-900 p-6 border-2 border-stone-700 rounded-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5"><Icons.Beaker size={80} /></div>
                      <h3 className="text-lg font-medieval font-bold text-blue-400 mb-2">Conhecimento Acumulado</h3>
                      <div className="text-4xl font-bold text-stone-200 mb-2 flex items-baseline gap-2">
                          {Math.floor(researchPoints)} <span className="text-sm font-normal text-stone-500">Pontos</span>
                      </div>
                      <div className="text-xs text-stone-500">
                          Geração: +{(RESEARCH_POINT_GENERATION + (buildings[BuildingType.CATHEDRAL] * 0.5) + (buildings[BuildingType.TOWN_CENTER] * 0.1)).toFixed(1)} / tick
                      </div>
                  </div>
                  <div className="bg-stone-900 p-6 border-2 border-stone-700 rounded-sm relative overflow-hidden flex flex-col justify-center">
                      <h3 className="text-lg font-medieval font-bold text-stone-300 mb-2">Pesquisa Atual</h3>
                      {activeResearch && activeTech ? (
                          <div>
                              <div className="flex justify-between items-end mb-2">
                                  <span className="font-bold text-amber-500">{activeTech.name}</span>
                                  <span className="text-xs text-stone-400">{Math.floor((activeResearch.progress / activeTech.duration) * 100)}%</span>
                              </div>
                              <div className="w-full bg-stone-800 h-3 rounded-full overflow-hidden mb-4 border border-stone-700">
                                  <div className="bg-blue-600 h-full transition-all duration-500 relative" style={{ width: `${(activeResearch.progress / activeTech.duration) * 100}%` }}>
                                      <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[spin_1s_linear_infinite]" />
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={accelerateResearch} className="flex-1 bg-amber-900/30 hover:bg-amber-800 border border-amber-800/50 text-amber-500 text-xs font-bold py-2 rounded transition-colors">
                                      Acelerar (100 Ouro)
                                  </button>
                                  <button onClick={cancelResearch} className="px-3 bg-red-900/20 hover:bg-red-900/40 border border-red-900/30 text-red-500 text-xs font-bold py-2 rounded transition-colors">
                                      X
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="text-stone-600 italic">Nenhuma pesquisa ativa. Selecione uma tecnologia abaixo.</div>
                      )}
                  </div>
              </div>
              <div className="flex flex-1 gap-6 overflow-hidden">
                  <div className="flex-1 flex flex-col bg-stone-900 border-2 border-stone-700 rounded-sm overflow-hidden">
                      <div className="flex border-b border-stone-800 bg-stone-950/50">
                          {Object.values(TechCategory).map(c => {
                              const cat = c as TechCategory;
                              return (
                              <button 
                                  key={cat}
                                  onClick={() => setTechTab(cat)}
                                  className={`flex-1 py-4 font-bold text-sm uppercase tracking-widest transition-colors border-b-2 ${
                                      techTab === cat 
                                      ? 'border-blue-500 text-blue-400 bg-stone-900' 
                                      : 'border-transparent text-stone-500 hover:text-stone-300 hover:bg-stone-800'
                                  }`}
                              >
                                  {cat === TechCategory.ECONOMY ? 'Economia' : cat === TechCategory.MILITARY ? 'Militar' : 'Civil'}
                              </button>
                          )})}
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-2 gap-4 custom-scrollbar">
                          {Object.values(TECHNOLOGIES).filter(t => t.category === techTab).map(tech => {
                              const isUnlocked = unlockedTechs.has(tech.id);
                              const isResearching = activeResearch?.techId === tech.id;
                              const reqTechsMet = !tech.requirements.techs || tech.requirements.techs.every(id => unlockedTechs.has(id));
                              const reqBuildingsMet = !tech.requirements.buildings || Object.entries(tech.requirements.buildings).every(([id, lvl]) => buildings[id as BuildingType] >= lvl!);
                              const isAvailable = reqTechsMet && reqBuildingsMet && !isUnlocked && !isResearching;

                              return (
                                  <div key={tech.id} className={`p-5 border-2 rounded relative transition-all ${
                                      isUnlocked ? 'border-green-800 bg-green-900/10 opacity-70' :
                                      isResearching ? 'border-blue-600 bg-stone-900 shadow-[0_0_15px_rgba(37,99,235,0.2)]' :
                                      !isAvailable ? 'border-stone-800 bg-stone-950/50 opacity-50 grayscale' :
                                      'border-stone-700 bg-stone-900 hover:border-blue-500/50'
                                  }`}>
                                      <div className="flex justify-between items-start mb-2">
                                          <h4 className={`font-medieval font-bold text-lg ${isUnlocked ? 'text-green-500' : isResearching ? 'text-blue-400' : 'text-stone-300'}`}>
                                              {tech.name}
                                          </h4>
                                          {isUnlocked && <span className="text-xs font-bold bg-green-900 text-green-300 px-2 py-1 rounded">Pesquisado</span>}
                                          {isResearching && <span className="text-xs font-bold bg-blue-900 text-blue-300 px-2 py-1 rounded animate-pulse">Pesquisando...</span>}
                                      </div>
                                      <p className="text-sm text-stone-500 italic mb-4 min-h-[40px]">{tech.description}</p>
                                      <div className="bg-stone-950/50 p-3 rounded mb-4 border border-stone-800">
                                          <span className="text-xs font-bold text-stone-400 uppercase block mb-1">Efeito:</span>
                                          <span className="text-sm text-blue-300">{tech.effectDescription}</span>
                                      </div>
                                      {!isUnlocked && !isResearching && (
                                          <div className="mt-auto">
                                              <div className="flex justify-between items-center text-xs mb-3 font-mono">
                                                  <div className="flex gap-3">
                                                      <span className={researchPoints >= tech.cost ? 'text-blue-400' : 'text-red-500'}>{tech.cost} PC</span>
                                                      <span className={resources.gold >= tech.goldCost ? 'text-yellow-500' : 'text-red-500'}>{tech.goldCost} Ouro</span>
                                                  </div>
                                                  <span className="text-stone-500">{tech.duration}s</span>
                                              </div>
                                              {!isAvailable ? (
                                                  <div className="text-xs text-red-500 font-bold bg-red-900/10 p-2 rounded border border-red-900/30 text-center">
                                                      Requisitos não atendidos
                                                  </div>
                                              ) : (
                                                  <button onClick={() => startResearch(tech.id)} className="w-full bg-blue-900/20 hover:bg-blue-800 border border-blue-800 text-blue-400 font-bold py-3 px-4 rounded transition-all uppercase tracking-widest text-xs">
                                                      Iniciar Pesquisa
                                                  </button>
                                              )}
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
                  <div className="w-72 bg-stone-900 border-2 border-stone-700 rounded-sm p-4 overflow-y-auto hidden xl:block">
                      <h4 className="font-medieval font-bold text-stone-300 mb-4 border-b border-stone-800 pb-2">Bônus Ativos</h4>
                      {unlockedTechs.size === 0 ? (
                          <p className="text-xs text-stone-600 italic text-center py-10">Nenhuma tecnologia descoberta.</p>
                      ) : (
                          <div className="space-y-3">
                              {Array.from(unlockedTechs).map(techId => {
                                  const tech = TECHNOLOGIES[techId];
                                  return (
                                      <div key={techId} className="text-xs p-2 bg-stone-950/50 border-l-2 border-green-600 rounded-r">
                                          <span className="font-bold text-stone-300 block mb-1">{tech.name}</span>
                                          <span className="text-green-500/80">{tech.effectDescription}</span>
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  const renderBuildings = () => (
    <div>
      <div className="flex space-x-2 mb-6 border-b border-stone-800 pb-2 overflow-x-auto">
        {Object.values(BuildingCategory).map((c) => {
          const cat = c as BuildingCategory;
          return (
          <button
            key={cat}
            onClick={() => setActiveBuildingTab(cat)}
            className={`px-6 py-2 font-medieval font-bold text-sm tracking-widest uppercase transition-all rounded-t-sm whitespace-nowrap ${
              activeBuildingTab === cat 
              ? 'bg-amber-900/40 text-amber-400 border-b-2 border-amber-500' 
              : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900'
            }`}
          >
            {LABELS_PT.categories[cat]}
          </button>
        )})}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {Object.values(BuildingType)
          .map(t => t as BuildingType)
          .filter(type => BUILDING_CATEGORIES[type] === activeBuildingTab)
          .map((type) => {
            const cost = getBuildingCost(type, buildings[type]);
            const canAfford = resources.planks >= cost.planks && resources.blocks >= cost.blocks && resources.iron_ingots >= cost.ingots && resources.gold >= cost.gold;
            const currentLvl = buildings[type];

            return (
              <div key={type} className={`bg-stone-900 group rounded-sm border-2 border-stone-700 hover:border-amber-700 transition-all duration-300 shadow-xl relative overflow-hidden flex flex-col`}>
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                <div className="p-5 border-b border-stone-800 relative bg-stone-950/30">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xl font-medieval font-bold text-amber-500 drop-shadow-sm">{LABELS_PT.buildings[type]}</h4>
                      <div className="h-0.5 w-12 bg-amber-800 mt-2 mb-2"></div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="bg-stone-950 border border-stone-700 px-3 py-1 rounded-sm shadow-inner">
                        <span className="text-stone-400 text-xs uppercase font-bold tracking-wider">Nível</span>
                        <span className="ml-2 text-amber-500 font-medieval font-bold text-lg">{currentLvl}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-stone-500 font-body italic mt-1 leading-relaxed min-h-[40px]">
                      {LABELS_PT.buildingDesc[type]}
                  </p>
                  <ProductionDisplay type={type} />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-end space-y-4">
                   <div>
                       <span className="text-[10px] uppercase font-bold text-stone-600 tracking-widest mb-2 block">Custo de Construção</span>
                       <CostList costs={cost} resources={resources} />
                   </div>
                   <button
                    onClick={() => constructBuilding(type)}
                    disabled={!canAfford}
                    className={`w-full py-3 px-4 font-medieval font-bold text-lg tracking-widest uppercase transition-all duration-200 border-2 relative overflow-hidden mt-4 ${
                      canAfford 
                        ? 'bg-amber-900 border-amber-700 text-amber-100 hover:bg-amber-800 hover:border-amber-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                        : 'bg-stone-800 border-stone-700 text-stone-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {currentLvl === 0 ? 'Construir' : 'Melhorar'}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  const renderArmy = () => {
    const totalSoldiers = troops[UnitType.LANCER] + troops[UnitType.ARCHER] + troops[UnitType.KNIGHT];
    const totalGoldUpkeep = troops[UnitType.LANCER] * UNIT_STATS[UnitType.LANCER].upkeepGold + 
                           troops[UnitType.ARCHER] * UNIT_STATS[UnitType.ARCHER].upkeepGold + 
                           troops[UnitType.KNIGHT] * UNIT_STATS[UnitType.KNIGHT].upkeepGold;
    const totalBreadUpkeep = troops[UnitType.LANCER] * UNIT_STATS[UnitType.LANCER].upkeepBread + 
                            troops[UnitType.ARCHER] * UNIT_STATS[UnitType.ARCHER].upkeepBread + 
                            troops[UnitType.KNIGHT] * UNIT_STATS[UnitType.KNIGHT].upkeepBread;

    return (
    <div className="space-y-6">
       <div className="flex border-b border-stone-800 pb-0 overflow-x-auto bg-stone-950/30">
          <button onClick={() => setArmyTab('hq')} className={`px-6 py-4 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${armyTab === 'hq' ? 'border-amber-500 text-amber-500 bg-stone-900' : 'border-transparent text-stone-500 hover:bg-stone-900 hover:text-stone-300'}`}>Quartel General</button>
          <button onClick={() => setArmyTab('recruit')} className={`px-6 py-4 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${armyTab === 'recruit' ? 'border-amber-500 text-amber-500 bg-stone-900' : 'border-transparent text-stone-500 hover:bg-stone-900 hover:text-stone-300'}`}>Recrutamento</button>
          <button onClick={() => setArmyTab('forge')} className={`px-6 py-4 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${armyTab === 'forge' ? 'border-amber-500 text-amber-500 bg-stone-900' : 'border-transparent text-stone-500 hover:bg-stone-900 hover:text-stone-300'}`}>Arsenal & Forja</button>
          <button onClick={() => setArmyTab('tactics')} className={`px-6 py-4 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${armyTab === 'tactics' ? 'border-amber-500 text-amber-500 bg-stone-900' : 'border-transparent text-stone-500 hover:bg-stone-900 hover:text-stone-300'}`}>Táticas</button>
       </div>

       {armyTab === 'hq' && (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-stone-900 p-8 rounded-sm border-2 border-stone-700 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10"><Icons.Shield size={100} /></div>
                <h3 className="text-xl font-medieval font-bold text-amber-500 mb-6 border-b border-stone-800 pb-2">Status Operacional</h3>
                <div className="grid grid-cols-2 gap-6 mb-6">
                   <div>
                      <span className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">Poder de Combate</span>
                      <div className="text-3xl text-stone-200 font-medieval font-bold">{Math.floor(currentPower)}</div>
                      <div className="text-[10px] text-stone-500 mt-1 flex flex-col">
                         <span>Base: {Math.floor(currentPower / STANCE_MULTIPLIERS[armyStance] - wallBonus)}</span>
                         <span>Muralha: +{wallBonus.toFixed(0)}</span>
                      </div>
                   </div>
                   <div>
                      <span className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">Efetivo</span>
                      <div className="text-3xl text-stone-200 font-medieval font-bold">{totalSoldiers}</div>
                      <span className="text-[10px] text-stone-500">Homens em armas</span>
                   </div>
                </div>
                <div className="bg-black/20 p-4 rounded border border-stone-800 mb-6">
                    <span className="text-[10px] text-red-400 uppercase font-bold tracking-widest block mb-2">Manutenção Diária</span>
                    <div className="flex justify-between items-center text-sm font-bold text-stone-300 mb-1">
                       <span className="flex items-center gap-2"><Icons.gold size={14} className="text-yellow-500"/> Ouro</span>
                       <span className="text-red-400">-{totalGoldUpkeep.toFixed(1)}/min</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-stone-300">
                       <span className="flex items-center gap-2"><Icons.bread size={14} className="text-orange-400"/> Suprimentos</span>
                       <span className="text-red-400">-{totalBreadUpkeep.toFixed(1)}/min</span>
                    </div>
                </div>
            </div>
            
            <div className="bg-stone-900 rounded-sm border-2 border-stone-700 shadow-2xl flex flex-col h-full overflow-hidden">
                <div className="p-6 border-b border-stone-800 bg-stone-950/30">
                    <h3 className="text-xl font-medieval font-bold text-stone-300 flex items-center gap-2">
                       <Icons.Scroll size={20} /> Relatórios de Guerra
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-stone-950/50">
                   {logs.filter(l => l.message.includes('Ataque') || l.message.includes('Vitória') || l.message.includes('Derrota') || l.message.includes('recrutado') || l.message.includes('Melhoria')).length === 0 ? (
                       <div className="text-center text-stone-600 italic py-10">Nenhuma atividade militar recente.</div>
                   ) : (
                       logs.filter(l => l.message.includes('Ataque') || l.message.includes('Vitória') || l.message.includes('Derrota') || l.message.includes('recrutado') || l.message.includes('Melhoria')).map(log => (
                           <div key={log.id} className={`text-xs p-3 border-l-2 ${log.type === 'success' ? 'border-green-600 bg-green-900/10' : log.type === 'danger' ? 'border-red-600 bg-red-900/10' : 'border-stone-600 bg-stone-900/50'}`}>
                               <span className="text-stone-500 font-mono mr-2">[{log.timestamp}]</span>
                               <span className="text-stone-300">{log.message}</span>
                           </div>
                       ))
                   )}
                </div>
            </div>
         </div>
       )}

       {armyTab === 'recruit' && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.values(UnitType).map((u) => {
              const type = u as UnitType;
              const cost = getUnitCost(type);
              const needsStable = type === UnitType.KNIGHT && buildings[BuildingType.STABLE] < 1;
              const needsBarracks = buildings[BuildingType.BARRACKS] < 1;
              const locked = needsBarracks || needsStable;
              const canAfford = resources.planks >= cost.planks && resources.iron_ingots >= cost.ingots && resources.bread >= cost.bread && resources.gold >= cost.gold && population >= cost.pop + 2 && !locked;
              const UnitIcon = Icons[type];
              return (
                <div key={type} className={`bg-stone-900 group rounded-sm border-2 ${locked ? 'border-stone-800 opacity-60' : 'border-stone-700 hover:border-stone-500'} transition-all duration-300 shadow-xl relative overflow-hidden flex flex-col`}>
                  <div className="p-0 relative h-32 bg-stone-950 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-40"></div>
                    <div className="z-10 text-stone-600 group-hover:text-stone-400 transition-colors transform group-hover:scale-110 duration-500"><UnitIcon size={64} /></div>
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-stone-900 to-transparent h-12"></div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col bg-stone-900">
                    <h4 className="text-xl font-medieval font-bold text-stone-200 capitalize mb-1">{LABELS_PT.units[type]}</h4>
                    <p className="text-xs text-stone-500 italic mb-4 leading-relaxed h-12 overflow-hidden">{UNIT_LORE[type]}</p>
                     <div className="mb-4"><CostList costs={cost} resources={resources} population={population} /></div>
                     {needsStable && <div className="text-center text-xs text-red-500 uppercase font-bold py-2 bg-red-950/10 border border-red-900/30 rounded mb-2">Requer Estábulo</div>}
                     <div className="mt-auto space-y-2">
                        <button onClick={() => recruitUnit(type)} disabled={!canAfford} className={`w-full py-3 font-medieval font-bold text-sm tracking-widest uppercase transition-all duration-200 border border-transparent rounded-sm flex items-center justify-center gap-2 ${canAfford ? 'bg-amber-900/80 text-amber-100 hover:bg-amber-800 border-amber-800 hover:shadow-lg' : 'bg-stone-800 text-stone-600 cursor-not-allowed'}`}>{locked ? 'Indisponível' : <><span>Recrutar (+1)</span></>}</button>
                        <div className="flex items-center justify-between bg-stone-950 px-3 py-2 rounded border border-stone-800">
                           <span className="text-xs text-stone-400 font-bold">Ativos: <span className="text-white">{troops[type]}</span></span>
                           <button onClick={() => dismissUnit(type)} disabled={troops[type] <= 0} className="text-[10px] text-stone-500 hover:text-red-500 uppercase font-bold flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><Icons.Skull size={12} /> Dispensar</button>
                        </div>
                     </div>
                  </div>
                </div>
              );
            })}
         </div>
       )}

       {armyTab === 'forge' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {['weapons', 'armor'].map((itemType) => {
                   const type = itemType as 'weapons' | 'armor';
                   const level = armyUpgrades[type];
                   const cost = getUpgradeCost(level);
                   const canAfford = resources.iron_ingots >= cost.ingots && resources.gold >= cost.gold;

                   return (
                       <div key={type} className="bg-stone-900 border-2 border-stone-800 p-8 relative overflow-hidden group hover:border-amber-900/50 transition-colors">
                           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Icons.Anvil size={120} /></div>
                           <h4 className="text-2xl font-medieval font-bold text-stone-200 mb-2 capitalize">
                               {type === 'weapons' ? 'Armamento' : 'Armaduras'}
                           </h4>
                           <div className="flex items-center gap-2 mb-4">
                               <div className="text-xs font-bold uppercase bg-stone-950 px-2 py-1 rounded text-amber-500 border border-stone-800">
                                   Nível {level}
                               </div>
                               <div className="text-xs text-green-500 font-bold">
                                   +{level * (type === 'weapons' ? 10 : 5)}% Bônus
                               </div>
                           </div>
                           <div className="mt-auto">
                               <div className="flex gap-4 mb-4 text-sm font-bold">
                                   <span className={resources.iron_ingots >= cost.ingots ? 'text-stone-300' : 'text-red-500'}>
                                       {cost.ingots} Lingotes
                                   </span>
                                   <span className={resources.gold >= cost.gold ? 'text-yellow-500' : 'text-red-500'}>
                                       {cost.gold} Ouro
                                   </span>
                               </div>
                               <button 
                                  onClick={() => purchaseUpgrade(type)}
                                  disabled={!canAfford}
                                  className={`w-full py-4 font-medieval font-bold text-lg uppercase tracking-widest border-2 ${canAfford ? 'bg-amber-900/20 border-amber-600 text-amber-500 hover:bg-amber-900/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-stone-950 border-stone-800 text-stone-600 cursor-not-allowed'}`}
                               >
                                   Forjar Melhoria
                               </button>
                           </div>
                       </div>
                   )
               })}
           </div>
       )}

       {armyTab === 'tactics' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-3 mb-4">
                   <h3 className="text-xl font-medieval font-bold text-stone-300 mb-4 border-b border-stone-800 pb-2">Postura Militar</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {[ArmyStance.DEFENSIVE, ArmyStance.BALANCED, ArmyStance.AGGRESSIVE].map((stance) => (
                           <button
                               key={stance}
                               onClick={() => setArmyStance(stance)}
                               className={`p-6 border-2 rounded-sm text-left transition-all relative overflow-hidden group ${
                                   armyStance === stance 
                                   ? 'bg-stone-800 border-amber-500 shadow-lg' 
                                   : 'bg-stone-900 border-stone-800 hover:border-stone-600'
                               }`}
                           >
                               <div className={`mb-3 ${armyStance === stance ? 'text-amber-500' : 'text-stone-600 group-hover:text-stone-400'}`}>
                                   {stance === ArmyStance.DEFENSIVE ? <Icons.ShieldCheck size={32} /> : stance === ArmyStance.AGGRESSIVE ? <Icons.Sword size={32} /> : <Icons.Balance size={32} />}
                               </div>
                               <h4 className={`font-bold uppercase text-sm mb-1 ${armyStance === stance ? 'text-stone-200' : 'text-stone-500'}`}>
                                   {stance === ArmyStance.DEFENSIVE ? 'Defensiva' : stance === ArmyStance.AGGRESSIVE ? 'Agressiva' : 'Equilibrada'}
                               </h4>
                               <p className="text-xs text-stone-500 leading-relaxed min-h-[40px]">
                                   {STANCE_DESCRIPTIONS[stance]}
                               </p>
                           </button>
                       ))}
                   </div>
               </div>
           </div>
       )}
    </div>
  )};

  const renderFinance = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
            <div className="bg-stone-900 p-6 rounded-sm border-2 border-stone-700 shadow-xl">
                <h3 className="text-xl font-medieval font-bold text-amber-500 mb-6 flex items-center gap-2">
                   <Icons.Crown /> Governo
                </h3>
                <div className="mb-8 text-center">
                    <div className="relative inline-block">
                        <div className={`text-6xl mb-2 transition-all duration-500 ${happiness > 70 ? 'text-green-500' : happiness < 40 ? 'text-red-500' : 'text-yellow-500'}`}>
                           {happiness > 60 ? <Icons.Happy size={80} /> : <Icons.Sad size={80} />}
                        </div>
                        <span className="absolute -bottom-2 -right-2 bg-stone-950 px-2 py-1 rounded text-xs font-bold border border-stone-700">
                           {Math.floor(happiness)}%
                        </span>
                    </div>
                    <p className="text-stone-400 font-medieval mt-2 text-lg">
                       {happiness > 80 ? 'O povo o adora, meu Lorde.' : 
                        happiness > 40 ? 'O povo está contente.' : 
                        happiness > 20 ? 'Há murmúrios de revolta.' : 'Rebelião iminente!'}
                    </p>
                </div>
                <div className="space-y-4">
                    <label className="block text-xs uppercase font-bold text-stone-500 tracking-widest">Nível de Impostos</label>
                    <div className="flex flex-col gap-2">
                        {Object.values(TaxLevel).map((l) => {
                           const level = l as TaxLevel;
                           return (
                           <button
                             key={level}
                             onClick={() => setTaxLevel(level)}
                             className={`flex justify-between items-center px-4 py-3 rounded border transition-all ${
                                taxLevel === level 
                                ? 'bg-amber-900/40 border-amber-600 text-amber-100 shadow-[inset_0_0_10px_rgba(245,158,11,0.2)]' 
                                : 'bg-stone-950/50 border-stone-800 text-stone-500 hover:bg-stone-800'
                             }`}
                           >
                              <span className="font-medieval font-bold">{TAX_RATES[level].label}</span>
                              <div className="flex gap-4 text-xs">
                                 <span className="text-yellow-500 font-mono">+{TAX_RATES[level].goldPerPop} 💰</span>
                                 <span className={`${TAX_RATES[level].happinessChange > 0 ? 'text-green-500' : 'text-red-500'} font-mono w-12 text-right`}>
                                    {TAX_RATES[level].happinessChange > 0 ? '+' : ''}{TAX_RATES[level].happinessChange} 😊
                                 </span>
                              </div>
                           </button>
                        )})}
                    </div>
                </div>
            </div>
        </div>

        <div className="lg:col-span-2">
            <h3 className="text-2xl font-medieval font-bold text-stone-200 mb-6 flex items-center gap-3 border-b border-stone-800 pb-4">
               <Icons.Scroll /> Decretos Reais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {Object.values(POLICIES).map((policy) => {
                  const isActive = activePolicies.has(policy.id);
                  return (
                     <div key={policy.id} className={`relative p-6 rounded border-2 transition-all duration-300 ${
                        isActive 
                        ? 'bg-stone-900 border-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.1)]' 
                        : 'bg-stone-900/60 border-stone-800 hover:border-stone-600'
                     }`}>
                        <div className="flex justify-between items-start mb-3">
                           <h4 className={`text-lg font-medieval font-bold ${isActive ? 'text-amber-500' : 'text-stone-400'}`}>
                              {policy.name}
                           </h4>
                           <button
                             onClick={() => togglePolicy(policy.id)}
                             className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded border transition-colors ${
                                isActive 
                                ? 'bg-amber-900 text-amber-100 border-amber-700 hover:bg-amber-800' 
                                : 'bg-stone-800 text-stone-500 border-stone-700 hover:bg-stone-700 hover:text-stone-300'
                             }`}
                           >
                              {isActive ? 'VIGENTE' : 'APROVAR'}
                           </button>
                        </div>
                        <p className="text-sm text-stone-500 italic mb-4 min-h-[40px]">
                           {policy.description}
                        </p>
                     </div>
                  );
               })}
            </div>
        </div>
    </div>
  );

  const renderNewMap = () => {
    const selectedNeighbor = neighbors.find(n => n.id === selectedNeighborId);
    
    return (
        <div className="flex flex-col lg:flex-row h-[600px] gap-6">
            {/* Map Area */}
            <div className="flex-1 bg-stone-900 border-2 border-stone-700 relative overflow-hidden shadow-2xl rounded-sm group">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:40px_40px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                    <div className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"><Icons.Castle size={48} /></div>
                    <span className="text-xs font-bold bg-black/50 px-2 py-1 rounded text-amber-500 border border-amber-800/50 backdrop-blur-sm mt-1">Seu Feudo</span>
                </div>
                {neighbors.map(n => (
                     <button 
                        key={n.id}
                        onClick={() => setSelectedNeighborId(n.id)}
                        className={`absolute flex flex-col items-center transition-all duration-300 transform hover:scale-110 z-10 ${selectedNeighborId === n.id ? 'scale-110 z-20' : 'opacity-80 hover:opacity-100'}`}
                        style={{ top: `${n.y}%`, left: `${n.x}%` }}
                     >
                        <div className={`p-2 rounded-full border-2 shadow-lg transition-colors ${
                            selectedNeighborId === n.id ? 'bg-stone-800 border-white' : 
                            n.relationStatus === RelationStatus.WAR ? 'bg-red-900 border-red-500' :
                            n.relationStatus === RelationStatus.ALLY ? 'bg-blue-900 border-blue-500' :
                            'bg-stone-800 border-stone-600'
                        }`}>
                            <span className="text-2xl">{BIOMES[n.biome].icon}</span>
                        </div>
                        <span className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm border ${
                            selectedNeighborId === n.id ? 'text-white border-white' : 
                            n.relationStatus === RelationStatus.WAR ? 'text-red-400 border-red-900' :
                            'text-stone-300 border-stone-700'
                        }`}>
                            {n.name}
                        </span>
                     </button>
                ))}
            </div>

            {/* Info Panel */}
            <div className="w-full lg:w-96 bg-stone-900 border-2 border-stone-700 flex flex-col rounded-sm shadow-xl">
                {!selectedNeighbor ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-stone-600">
                        <Icons.Map size={64} className="mb-4 opacity-20" />
                        <p className="text-center italic">Selecione um território no mapa para ver detalhes e interagir.</p>
                    </div>
                ) : (
                    <>
                        {/* Neighbor Header */}
                        <div className="p-6 border-b border-stone-800 bg-stone-950/30">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-medieval font-bold text-stone-200">{selectedNeighbor.name}</h3>
                                <span className={`text-xs font-bold px-2 py-1 rounded border uppercase ${
                                    selectedNeighbor.relationStatus === RelationStatus.WAR ? 'bg-red-950 text-red-500 border-red-900' :
                                    selectedNeighbor.relationStatus === RelationStatus.ALLY ? 'bg-blue-950 text-blue-400 border-blue-900' :
                                    'bg-stone-800 text-stone-400 border-stone-600'
                                }`}>
                                    {selectedNeighbor.relationStatus}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-stone-500 mb-4">
                                <span>{BIOMES[selectedNeighbor.biome].label}</span>
                                <span>•</span>
                                <span>Distância: {selectedNeighbor.distance} dias</span>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4 bg-black/20 p-3 rounded border border-stone-800">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-500">Poder Militar</span>
                                    <div className="text-stone-300 font-bold flex items-center gap-2">
                                        <Icons.Sword size={14} />
                                        {selectedNeighbor.intelLevel >= 2 ? selectedNeighbor.militaryPower : '???'}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-500">Riqueza</span>
                                    <div className="text-yellow-500 font-bold flex items-center gap-2">
                                        <Icons.gold size={14} />
                                        {selectedNeighbor.intelLevel >= 2 ? selectedNeighbor.wealth : '???'}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-500">Relações</span>
                                    <div className={`${selectedNeighbor.relationScore > 0 ? 'text-green-500' : 'text-red-500'} font-bold`}>
                                        {selectedNeighbor.relationScore} / 100
                                    </div>
                                </div>
                                <div>
                                     <span className="text-[10px] uppercase font-bold text-stone-500">Comércio</span>
                                     <div className="text-stone-300 font-bold text-xs">
                                         {selectedNeighbor.tradeRouteActive ? 'Rota Ativa' : 'Sem Rota'}
                                     </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions Tabs */}
                        <div className="flex border-b border-stone-800 bg-stone-950/50">
                            <button onClick={() => setPanelTab('diplomacy')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${panelTab === 'diplomacy' ? 'bg-stone-900 text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:bg-stone-800'}`}>Diplomacia</button>
                            <button onClick={() => setPanelTab('espionage')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${panelTab === 'espionage' ? 'bg-stone-900 text-purple-500 border-t-2 border-purple-500' : 'text-stone-500 hover:bg-stone-800'}`}>Espionagem</button>
                            <button onClick={() => setPanelTab('war')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${panelTab === 'war' ? 'bg-stone-900 text-red-500 border-t-2 border-red-500' : 'text-stone-500 hover:bg-stone-800'}`}>Guerra</button>
                        </div>

                        {/* Action Content */}
                        <div className="p-6 flex-1 overflow-y-auto">
                            {panelTab === 'diplomacy' && (
                                <div className="space-y-4">
                                    <p className="text-xs text-stone-500 italic mb-4">Envie emissários para melhorar relações ou declarar suas intenções.</p>
                                    <button onClick={() => handleDiplomacy('gift')} className="w-full flex justify-between items-center p-4 border border-stone-700 rounded bg-stone-900 hover:bg-stone-800 hover:border-amber-700 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="text-amber-500 bg-amber-900/20 p-2 rounded"><Icons.Handshake size={20} /></div>
                                            <div className="text-left">
                                                <span className="block font-bold text-stone-300 text-sm">Enviar Presente</span>
                                                <span className="text-xs text-stone-500">Melhora relações (+{GIFT_RELATION_BOOST})</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-yellow-500">-{GIFT_COST} 💰</span>
                                    </button>
                                    <button onClick={() => handleDiplomacy('insult')} className="w-full flex justify-between items-center p-4 border border-stone-700 rounded bg-stone-900 hover:bg-stone-800 hover:border-red-700 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="text-red-500 bg-red-900/20 p-2 rounded"><Icons.AlertTriangle size={20} /></div>
                                            <div className="text-left">
                                                <span className="block font-bold text-stone-300 text-sm">Insultar</span>
                                                <span className="text-xs text-stone-500">Piora relações (-{INSULT_RELATION_PENALTY})</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-stone-500">Grátis</span>
                                    </button>
                                </div>
                            )}

                            {panelTab === 'espionage' && (
                                <div className="space-y-4">
                                    <p className="text-xs text-stone-500 italic mb-4">Obtenha informações vitais sobre as defesas inimigas.</p>
                                    <div className="bg-stone-950 p-3 rounded border border-stone-800 mb-2">
                                        <span className="text-xs font-bold text-stone-500 uppercase">Nível de Inteligência:</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={`h-2 flex-1 rounded ${selectedNeighbor.intelLevel >= 1 ? 'bg-purple-500' : 'bg-stone-800'}`}></div>
                                            <div className={`h-2 flex-1 rounded ${selectedNeighbor.intelLevel >= 2 ? 'bg-purple-500' : 'bg-stone-800'}`}></div>
                                        </div>
                                        <p className="text-[10px] text-stone-500 mt-2">
                                            {selectedNeighbor.intelLevel === 0 ? 'Nenhuma informação.' : 
                                             selectedNeighbor.intelLevel === 1 ? 'Dados básicos conhecidos.' : 'Relatório completo disponível.'}
                                        </p>
                                    </div>
                                    <button onClick={() => handleEspionage('scout')} className="w-full flex justify-between items-center p-4 border border-stone-700 rounded bg-stone-900 hover:bg-stone-800 hover:border-purple-700 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="text-purple-500 bg-purple-900/20 p-2 rounded"><Icons.Spy size={20} /></div>
                                            <div className="text-left">
                                                <span className="block font-bold text-stone-300 text-sm">Enviar Espião</span>
                                                <span className="text-xs text-stone-500">Chance de revelar stats</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-yellow-500">-{SPY_COST} 💰</span>
                                    </button>
                                </div>
                            )}

                            {panelTab === 'war' && (
                                <div className="space-y-4">
                                    <div className="p-3 bg-red-950/30 border border-red-900/50 rounded mb-4">
                                        <span className="text-xs font-bold text-red-400 block mb-1 uppercase">Estimativa de Combate</span>
                                        <div className="flex justify-between items-center text-sm font-bold text-stone-300">
                                            <span>Seu Poder:</span>
                                            <span className="text-green-500">{Math.floor(currentPower)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm font-bold text-stone-300">
                                            <span>Inimigo (Est.):</span>
                                            <span className="text-red-500">{selectedNeighbor.intelLevel > 0 ? selectedNeighbor.militaryPower : '?'}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleWar('raid')} className="w-full flex justify-between items-center p-4 border border-stone-700 rounded bg-stone-900 hover:bg-stone-800 hover:border-red-600 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="text-red-500 bg-red-900/20 p-2 rounded"><Icons.Sword size={20} /></div>
                                            <div className="text-left">
                                                <span className="block font-bold text-stone-300 text-sm">Saquear Vila</span>
                                                <span className="text-xs text-stone-500">Rouba ouro e recursos. Baixo risco.</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-red-500 uppercase">Ataque</span>
                                    </button>
                                    <button onClick={() => handleWar('conquer')} className="w-full flex justify-between items-center p-4 border border-stone-700 rounded bg-stone-900 hover:bg-stone-800 hover:border-red-600 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="text-red-500 bg-red-900/20 p-2 rounded"><Icons.Flag size={20} /></div>
                                            <div className="text-left">
                                                <span className="block font-bold text-stone-300 text-sm">Conquistar</span>
                                                <span className="text-xs text-stone-500">Tenta vassalar o território. Alto risco.</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-red-500 uppercase">Guerra Total</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="flex h-screen bg-stone-950 text-stone-200 font-body overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        <ResourceBar 
          resources={resources} 
          population={population} 
          maxPop={maxPop}
          netProduction={lastTickProduction}
          gameSpeed={gameSpeed}
          setGameSpeed={setGameSpeed}
          day={Math.floor(gameTick / 60)}
          maxStorage={maxStorage}
          happiness={happiness}
        />
        
        <main className="flex-1 overflow-y-auto p-8 relative custom-scrollbar bg-stone-950">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-900 via-stone-950 to-stone-950 pointer-events-none -z-10"></div>

           <div className="max-w-7xl mx-auto pb-10">
              <header className="mb-10 flex flex-col md:flex-row justify-between items-end border-b border-stone-800 pb-6">
                <div>
                  <h2 className="text-4xl font-medieval font-bold text-amber-500 drop-shadow-md tracking-wide">
                    {activeTab === 'overview' ? 'Visão Geral' : 
                     activeTab === 'buildings' ? 'Edificações' : 
                     activeTab === 'comercio' ? 'Ministério do Comércio' : 
                     activeTab === 'technology' ? 'Tecnologias' :
                     activeTab === 'army' ? 'Exército Real' : 
                     activeTab === 'finance' ? 'Câmara Real' : 'Vizinhos'}
                  </h2>
                  <p className="text-stone-500 text-sm mt-2 italic font-body">"Pela honra e pela glória do império."</p>
                </div>
                <div className="text-right hidden md:block">
                   <span className="text-xs text-stone-600 uppercase tracking-widest block mb-1">Status do Reino</span>
                   <span className={`${happiness < 20 ? 'text-red-500 animate-pulse' : 'text-green-600'} font-medieval text-sm flex items-center justify-end`}>
                      <span className={`w-2 h-2 rounded-full ${happiness < 20 ? 'bg-red-500' : 'bg-green-500'} mr-2 animate-pulse`}></span>
                      {happiness < 20 ? 'REVOLTA' : 'Estável'}
                   </span>
                </div>
              </header>

              <div className="animate-fade-in">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'buildings' && renderBuildings()}
                {activeTab === 'comercio' && renderTrade()}
                {activeTab === 'technology' && renderTechnology()}
                {activeTab === 'army' && renderArmy()}
                {activeTab === 'finance' && renderFinance()}
                {activeTab === 'map' && renderNewMap()}
              </div>
           </div>
        </main>
      </div>
    </div>
  );
};

export default App;
