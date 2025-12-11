
export enum ResourceType {
  // Raw
  RAW_WOOD = 'raw_wood',
  RAW_STONE = 'raw_stone',
  IRON_ORE = 'iron_ore',
  WHEAT = 'wheat',
  // Processed
  PLANKS = 'planks',
  BLOCKS = 'blocks',
  IRON_INGOTS = 'iron_ingots',
  BREAD = 'bread',
  // Currency
  GOLD = 'gold',
}

export enum BuildingType {
  // Civil
  TOWN_CENTER = 'townCenter',
  HOUSE = 'house',
  WAREHOUSE = 'warehouse',
  WALL = 'wall',
  CATHEDRAL = 'cathedral',
  MARKET = 'market',
  
  // Extraction
  LUMBER_HUT = 'lumberHut',
  QUARRY = 'quarry',
  IRON_MINE = 'ironMine',
  FARM = 'farm',
  
  // Industry
  SAWMILL = 'sawmill',
  MASONRY = 'masonry',
  FOUNDRY = 'foundry',
  WINDMILL = 'windmill', // Makes bread from wheat

  // Military
  BARRACKS = 'barracks',
  STABLE = 'stable',
  BLACKSMITH = 'blacksmith',
}

export enum UnitType {
  LANCER = 'lancer',
  ARCHER = 'archer',
  KNIGHT = 'knight',
}

export enum BuildingCategory {
  CIVIL = 'civil',
  EXTRACTION = 'extraction',
  INDUSTRY = 'industry',
  MILITARY = 'military',
}

export enum TechCategory {
  ECONOMY = 'economy',
  MILITARY = 'military',
  CIVIL = 'civil',
}

export enum TaxLevel {
  NONE = 'none',
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  EXTORTION = 'extortion',
}

export enum PolicyType {
  RATIONING = 'rationing',
  FORCED_LABOR = 'forced_labor',
  FESTIVALS = 'festivals',
  MILITARY_TRAINING = 'military_training',
}

export enum BiomeType {
  FOREST = 'forest',
  MOUNTAIN = 'mountain',
  PLAINS = 'plains',
  SWAMP = 'swamp',
  DESERT = 'desert',
}

export enum RelationStatus {
  WAR = 'war',
  HOSTILE = 'hostile',
  NEUTRAL = 'neutral',
  FRIENDLY = 'friendly',
  ALLY = 'ally',
  VASSAL = 'vassal', // Conquered
}

export enum ArmyStance {
  DEFENSIVE = 'defensive',
  BALANCED = 'balanced',
  AGGRESSIVE = 'aggressive',
}

export interface ArmyUpgrades {
  weapons: number; // Increases Attack Power
  armor: number;   // Increases Survival (or just flat power in this simple model)
}

export interface Resources {
  [ResourceType.RAW_WOOD]: number;
  [ResourceType.RAW_STONE]: number;
  [ResourceType.IRON_ORE]: number;
  [ResourceType.WHEAT]: number;
  [ResourceType.PLANKS]: number;
  [ResourceType.BLOCKS]: number;
  [ResourceType.IRON_INGOTS]: number;
  [ResourceType.BREAD]: number;
  [ResourceType.GOLD]: number;
}

export type Buildings = Record<BuildingType, number>;
export type Troops = Record<UnitType, number>;

export interface Technology {
  id: string;
  name: string;
  description: string;
  category: TechCategory;
  cost: number; // Research Points
  goldCost: number; // Funding needed
  duration: number; // Ticks
  requirements: {
    techs?: string[];
    buildings?: Partial<Record<BuildingType, number>>;
  };
  effectDescription: string;
}

export interface ActiveResearch {
  techId: string;
  progress: number; // 0 to duration
  paused: boolean;
}

export interface TradeConfig {
  importRes: ResourceType | null; // What we buy from them
  exportRes: ResourceType | null; // What we sell to them
}

export interface Neighbor {
  id: string;
  name: string;
  biome: BiomeType;
  
  // Stats
  militaryPower: number; // Hidden unless scouted
  wealth: number; // Hidden unless scouted
  population: number;
  
  // Geopolitics
  relationScore: number; // -100 to 100
  relationStatus: RelationStatus;
  distance: number; // Impacts trade time / war travel
  
  // Trade
  tradeRouteActive: boolean;
  tradeConfig: TradeConfig; // Specifics of the route
  exports: ResourceType[]; // What they sell cheap
  imports: ResourceType[]; // What they buy expensive
  
  // Espionage
  intelLevel: 0 | 1 | 2; // 0: None, 1: Basic (Pop/Biome), 2: Full (Army/Wealth)
  lastEspionageTurn: number;
  
  // Location for Map UI
  x: number; 
  y: number;
}

export interface LogEntry {
  id: number;
  message: string;
  type: 'info' | 'success' | 'danger' | 'warning';
  timestamp: string;
}

export interface BuildingCost {
  planks: number;
  blocks: number;
  ingots: number;
  gold: number;
}

export interface UnitCost {
  planks: number;
  ingots: number;
  bread: number;
  gold: number;
  pop: number;
}

export type GameSpeed = 0 | 1 | 5;

export interface PolicyDef {
  id: PolicyType;
  name: string;
  description: string;
  effectDesc: string;
}

export interface MarketPrice {
  base: number;
  currentBuy: number;
  currentSell: number;
  trend: 'up' | 'down' | 'stable';
}
