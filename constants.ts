
import { BuildingType, UnitType, ResourceType, BuildingCost, UnitCost, BuildingCategory, Resources, Buildings, TaxLevel, PolicyType, PolicyDef, BiomeType, ArmyStance, Technology, TechCategory } from './types';

export const TICK_RATE_MS = 1000;
export const BREAD_CONSUMPTION_PER_POP = 0.5; // Pop eats bread
export const POPULATION_GROWTH_RATE = 0.1;
export const COST_SCALING_FACTOR = 1.25; // Reduced from 1.35 for smoother progression
export const HOUSE_CAPACITY = 5;
export const TOWN_CENTER_CAPACITY = 10;
export const BASE_STORAGE = 500; // Increased base storage
export const STORAGE_PER_WAREHOUSE = 1000;
export const WALL_DEFENSE_BONUS = 100;
export const SCOUT_COST = 50;

// Diplomacy
export const TRADE_ROUTE_COST = 200;
export const SPY_COST = 100;
export const GIFT_COST = 150;
export const GIFT_RELATION_BOOST = 15;
export const INSULT_RELATION_PENALTY = 30;

// Trade
export const RESOURCE_BASE_PRICES: Record<ResourceType, number> = {
  [ResourceType.RAW_WOOD]: 2,
  [ResourceType.RAW_STONE]: 3,
  [ResourceType.IRON_ORE]: 5,
  [ResourceType.WHEAT]: 2,
  [ResourceType.PLANKS]: 5,
  [ResourceType.BLOCKS]: 6,
  [ResourceType.IRON_INGOTS]: 15,
  [ResourceType.BREAD]: 4,
  [ResourceType.GOLD]: 1, // Reference
};

// Technology
export const RESEARCH_POINT_GENERATION = 1; // Base per tick
export const TECHNOLOGIES: Record<string, Technology> = {
  // --- Economy ---
  'crop_rotation': {
    id: 'crop_rotation',
    name: 'Rotação de Culturas',
    description: 'Técnicas agrícolas avançadas para preservar o solo.',
    category: TechCategory.ECONOMY,
    cost: 50,
    goldCost: 20,
    duration: 30,
    requirements: { buildings: { [BuildingType.FARM]: 1 } },
    effectDescription: '+20% Produção de Trigo'
  },
  'heavy_plough': {
    id: 'heavy_plough',
    name: 'Arado Pesado',
    description: 'Permite cultivar solos mais duros e profundos.',
    category: TechCategory.ECONOMY,
    cost: 150,
    goldCost: 100,
    duration: 60,
    requirements: { techs: ['crop_rotation'], buildings: { [BuildingType.BLACKSMITH]: 1 } },
    effectDescription: '+30% Produção de Trigo e Pão'
  },
  'trade_guilds': {
    id: 'trade_guilds',
    name: 'Guildas de Comércio',
    description: 'Organiza mercadores para maximizar lucros.',
    category: TechCategory.ECONOMY,
    cost: 200,
    goldCost: 150,
    duration: 90,
    requirements: { buildings: { [BuildingType.MARKET]: 1 } },
    effectDescription: '+2 Ouro/min base no Mercado e Rotas'
  },
  'deep_mining': {
    id: 'deep_mining',
    name: 'Mineração Profunda',
    description: 'Escoramento de túneis para extração segura.',
    category: TechCategory.ECONOMY,
    cost: 100,
    goldCost: 50,
    duration: 45,
    requirements: { buildings: { [BuildingType.IRON_MINE]: 1 } },
    effectDescription: '+20% Produção de Ferro e Pedra'
  },

  // --- Military ---
  'iron_weapons': {
    id: 'iron_weapons',
    name: 'Metalurgia Bélica',
    description: 'Padronização da forja de armas para o exército.',
    category: TechCategory.MILITARY,
    cost: 80,
    goldCost: 50,
    duration: 40,
    requirements: { buildings: { [BuildingType.BARRACKS]: 1 } },
    effectDescription: '+10% Poder de Ataque'
  },
  'standing_army': {
    id: 'standing_army',
    name: 'Exército Permanente',
    description: 'Profissionalização das tropas e logística.',
    category: TechCategory.MILITARY,
    cost: 200,
    goldCost: 200,
    duration: 100,
    requirements: { techs: ['iron_weapons'], buildings: { [BuildingType.BARRACKS]: 2 } },
    effectDescription: '-10% Custo de Manutenção Militar'
  },
  'stone_walls': {
    id: 'stone_walls',
    name: 'Engenharia Defensiva',
    description: 'Técnicas de construção de muralhas inexpugnáveis.',
    category: TechCategory.MILITARY,
    cost: 150,
    goldCost: 100,
    duration: 60,
    requirements: { buildings: { [BuildingType.WALL]: 1 } },
    effectDescription: 'Muralhas dão +50% de Bônus Defensivo'
  },

  // --- Civil ---
  'urban_planning': {
    id: 'urban_planning',
    name: 'Planejamento Urbano',
    description: 'Melhor organização das ruas e lotes.',
    category: TechCategory.CIVIL,
    cost: 60,
    goldCost: 30,
    duration: 30,
    requirements: { buildings: { [BuildingType.TOWN_CENTER]: 1 } },
    effectDescription: '+2 População Máxima por Casa'
  },
  'sanitation': {
    id: 'sanitation',
    name: 'Saneamento Básico',
    description: 'Esgotos e canais para manter a cidade limpa.',
    category: TechCategory.CIVIL,
    cost: 120,
    goldCost: 80,
    duration: 50,
    requirements: { techs: ['urban_planning'] },
    effectDescription: '+10% Crescimento Populacional, +5 Felicidade'
  },
  'feudal_code': {
    id: 'feudal_code',
    name: 'Código Feudal',
    description: 'Leis claras aumentam a ordem e a coleta de impostos.',
    category: TechCategory.CIVIL,
    cost: 250,
    goldCost: 150,
    duration: 120,
    requirements: { buildings: { [BuildingType.TOWN_CENTER]: 2 } },
    effectDescription: '+10% Eficiência na Coleta de Impostos'
  }
};

// Military Strategy
export const STANCE_MULTIPLIERS: Record<ArmyStance, number> = {
  [ArmyStance.DEFENSIVE]: 1.0, // Base power, bonus is applied to wall calculation or survival logic
  [ArmyStance.BALANCED]: 1.0,
  [ArmyStance.AGGRESSIVE]: 1.2, // 20% Attack Bonus
};

export const STANCE_DESCRIPTIONS: Record<ArmyStance, string> = {
  [ArmyStance.DEFENSIVE]: "Foco em proteger as muralhas. Bônus defensivo, mas ataque reduzido.",
  [ArmyStance.BALANCED]: "Formação padrão. Equilíbrio entre ataque e defesa.",
  [ArmyStance.AGGRESSIVE]: "Ataque total. Poder ofensivo aumentado, mas maior risco de baixas.",
};

export const UPGRADE_BASE_COST = {
    [ResourceType.IRON_INGOTS]: 50,
    [ResourceType.GOLD]: 100
};

// Finance
export const TAX_RATES: Record<TaxLevel, { goldPerPop: number, happinessChange: number, label: string }> = {
  [TaxLevel.NONE]: { goldPerPop: 0, happinessChange: 2, label: 'Isento' },
  [TaxLevel.LOW]: { goldPerPop: 0.2, happinessChange: 0.5, label: 'Baixo' },
  [TaxLevel.NORMAL]: { goldPerPop: 0.5, happinessChange: -0.5, label: 'Normal' },
  [TaxLevel.HIGH]: { goldPerPop: 1.2, happinessChange: -2, label: 'Alto' },
  [TaxLevel.EXTORTION]: { goldPerPop: 2.5, happinessChange: -5, label: 'Extorsivo' },
};

export const POLICIES: Record<PolicyType, PolicyDef> = {
  [PolicyType.RATIONING]: {
    id: PolicyType.RATIONING,
    name: "Racionamento de Comida",
    description: "Decreta que o povo deve comer menos para estocar suprimentos.",
    effectDesc: "-50% Consumo de Pão, -3 Felicidade/min",
  },
  [PolicyType.FORCED_LABOR]: {
    id: PolicyType.FORCED_LABOR,
    name: "Turnos Forçados",
    description: "Obriga os trabalhadores a cumprirem turnos dobrados nas fábricas.",
    effectDesc: "+20% Produção Industrial, -5 Felicidade/min",
  },
  [PolicyType.FESTIVALS]: {
    id: PolicyType.FESTIVALS,
    name: "Festivais Contínuos",
    description: "Organiza festas públicas frequentes para alegrar a população.",
    effectDesc: "-1 Ouro/População/min, +3 Felicidade/min",
  },
  [PolicyType.MILITARY_TRAINING]: {
    id: PolicyType.MILITARY_TRAINING,
    name: "Treino Espartano",
    description: "Intensifica o treinamento militar obrigatório.",
    effectDesc: "+10% Poder Militar, +50% Custo Manutenção Ouro",
  },
};

export const HAPPINESS_MAX = 100;
export const HAPPINESS_MIN = 0;
export const HAPPINESS_STARVATION_PENALTY = 10; // Per tick if no food
export const HAPPINESS_OVERCROWDING_PENALTY = 5;

// Biomes
export const BIOMES: Record<BiomeType, { label: string, color: string, icon: string, desc: string }> = {
    [BiomeType.FOREST]: { label: 'Floresta Profunda', color: 'text-emerald-500', icon: '🌲', desc: 'Terreno denso, rico em madeira.' },
    [BiomeType.MOUNTAIN]: { label: 'Picos Rochosos', color: 'text-stone-400', icon: '⛰️', desc: 'Defesas naturais altas e minérios.' },
    [BiomeType.PLAINS]: { label: 'Planícies Abertas', color: 'text-yellow-600', icon: '🌾', desc: 'Território fácil de marchar.' },
    [BiomeType.SWAMP]: { label: 'Pântano Sombrio', color: 'text-purple-500', icon: '🌫️', desc: 'Terreno traiçoeiro e doentio.' },
    [BiomeType.DESERT]: { label: 'Deserto Árido', color: 'text-amber-500', icon: '☀️', desc: 'Calor escaldante e poucos recursos.' },
};

// Production Rates (Per building level per minute equivalent)
// We calculate per tick in App.tsx, but these are base values
export const PRODUCTION_RATES = {
  [BuildingType.LUMBER_HUT]: { output: { [ResourceType.RAW_WOOD]: 12 } },
  [BuildingType.QUARRY]: { output: { [ResourceType.RAW_STONE]: 10 } },
  [BuildingType.IRON_MINE]: { output: { [ResourceType.IRON_ORE]: 8 } },
  [BuildingType.FARM]: { output: { [ResourceType.WHEAT]: 15 } },
  
  // Factories: Input -> Output ratio
  [BuildingType.SAWMILL]: { input: { [ResourceType.RAW_WOOD]: 12 }, output: { [ResourceType.PLANKS]: 10 } },
  [BuildingType.MASONRY]: { input: { [ResourceType.RAW_STONE]: 10 }, output: { [ResourceType.BLOCKS]: 8 } },
  [BuildingType.FOUNDRY]: { input: { [ResourceType.IRON_ORE]: 8 }, output: { [ResourceType.IRON_INGOTS]: 5 } },
  [BuildingType.WINDMILL]: { input: { [ResourceType.WHEAT]: 10 }, output: { [ResourceType.BREAD]: 10 } }, // Efficient food conversion

  [BuildingType.MARKET]: { output: { [ResourceType.GOLD]: 15 } },
  [BuildingType.TOWN_CENTER]: { output: { [ResourceType.GOLD]: 10 } },
};

export const BUILDING_COSTS: Record<BuildingType, BuildingCost> = {
  // --- Extraction (Starts Cheap) ---
  [BuildingType.LUMBER_HUT]: { planks: 0, blocks: 0, ingots: 0, gold: 10 }, 
  [BuildingType.FARM]: { planks: 0, blocks: 0, ingots: 0, gold: 10 },
  [BuildingType.QUARRY]: { planks: 0, blocks: 0, ingots: 0, gold: 10 },
  [BuildingType.IRON_MINE]: { planks: 50, blocks: 0, ingots: 0, gold: 100 }, // Needs wood to shore up tunnels

  // --- Industry (Progression: Sawmill -> Masonry -> Foundry) ---
  [BuildingType.SAWMILL]: { planks: 0, blocks: 0, ingots: 0, gold: 100 }, // No planks needed, just gold to setup tools
  [BuildingType.MASONRY]: { planks: 50, blocks: 0, ingots: 0, gold: 100 }, // Needs planks for structure
  [BuildingType.WINDMILL]: { planks: 30, blocks: 10, ingots: 0, gold: 50 },
  [BuildingType.FOUNDRY]: { planks: 200, blocks: 100, ingots: 0, gold: 300 }, // Needs solid construction, but NO ingots yet

  // --- Civil ---
  [BuildingType.HOUSE]: { planks: 20, blocks: 0, ingots: 0, gold: 10 },
  [BuildingType.WAREHOUSE]: { planks: 100, blocks: 0, ingots: 0, gold: 50 },
  [BuildingType.MARKET]: { planks: 100, blocks: 0, ingots: 0, gold: 100 },
  [BuildingType.TOWN_CENTER]: { planks: 500, blocks: 500, ingots: 200, gold: 1000 }, // Expensive upgrade
  [BuildingType.CATHEDRAL]: { planks: 400, blocks: 800, ingots: 100, gold: 1000 },
  [BuildingType.WALL]: { planks: 50, blocks: 200, ingots: 10, gold: 50 }, // Requires some iron for reinforcements

  // --- Military ---
  [BuildingType.BARRACKS]: { planks: 200, blocks: 50, ingots: 0, gold: 150 }, // Basic training ground
  [BuildingType.STABLE]: { planks: 400, blocks: 100, ingots: 50, gold: 300 }, // Needs iron for horseshoes/gear
  [BuildingType.BLACKSMITH]: { planks: 300, blocks: 300, ingots: 50, gold: 300 },
};

export const BUILDING_CATEGORIES: Record<BuildingType, BuildingCategory> = {
  [BuildingType.TOWN_CENTER]: BuildingCategory.CIVIL,
  [BuildingType.HOUSE]: BuildingCategory.CIVIL,
  [BuildingType.WAREHOUSE]: BuildingCategory.CIVIL,
  [BuildingType.WALL]: BuildingCategory.CIVIL,
  [BuildingType.CATHEDRAL]: BuildingCategory.CIVIL,
  [BuildingType.MARKET]: BuildingCategory.CIVIL,
  
  [BuildingType.LUMBER_HUT]: BuildingCategory.EXTRACTION,
  [BuildingType.QUARRY]: BuildingCategory.EXTRACTION,
  [BuildingType.FARM]: BuildingCategory.EXTRACTION,
  [BuildingType.IRON_MINE]: BuildingCategory.EXTRACTION,
  
  [BuildingType.SAWMILL]: BuildingCategory.INDUSTRY,
  [BuildingType.MASONRY]: BuildingCategory.INDUSTRY,
  [BuildingType.WINDMILL]: BuildingCategory.INDUSTRY,
  [BuildingType.FOUNDRY]: BuildingCategory.INDUSTRY,
  
  [BuildingType.BARRACKS]: BuildingCategory.MILITARY,
  [BuildingType.STABLE]: BuildingCategory.MILITARY,
  [BuildingType.BLACKSMITH]: BuildingCategory.MILITARY,
};

export const UNIT_COSTS: Record<UnitType, UnitCost> = {
  [UnitType.LANCER]: { planks: 10, ingots: 5, bread: 20, gold: 10, pop: 1 },
  [UnitType.ARCHER]: { planks: 30, ingots: 2, bread: 30, gold: 15, pop: 1 },
  [UnitType.KNIGHT]: { planks: 20, ingots: 40, bread: 100, gold: 50, pop: 2 },
};

// Updated stats with upkeep costs (Per minute approx)
export const UNIT_STATS: Record<UnitType, { power: number, upkeepGold: number, upkeepBread: number }> = {
  [UnitType.LANCER]: { power: 10, upkeepGold: 0.5, upkeepBread: 1 },
  [UnitType.ARCHER]: { power: 15, upkeepGold: 1, upkeepBread: 1 },
  [UnitType.KNIGHT]: { power: 45, upkeepGold: 5, upkeepBread: 3 },
};

export const UNIT_LORE: Record<UnitType, string> = {
  [UnitType.LANCER]: "Guerreiros leves armados com lanças compridas. Excelentes para defesa de muralhas e baratos para manter em grande número.",
  [UnitType.ARCHER]: "Atiradores de elite capazes de atingir inimigos à distância. Essenciais para enfraquecer o oponente antes do combate corpo a corpo.",
  [UnitType.KNIGHT]: "A elite da nobreza montada em cavalos de guerra. Possuem armaduras pesadas e um poder de ataque devastador, mas exigem alto soldo.",
};

export const INITIAL_RESOURCES: Resources = {
  [ResourceType.RAW_WOOD]: 0,
  [ResourceType.RAW_STONE]: 0,
  [ResourceType.IRON_ORE]: 0,
  [ResourceType.WHEAT]: 0,
  
  [ResourceType.PLANKS]: 200, // Enough for a House and some basic industry
  [ResourceType.BLOCKS]: 0,
  [ResourceType.IRON_INGOTS]: 0,
  [ResourceType.BREAD]: 300,
  [ResourceType.GOLD]: 150,
};

export const INITIAL_BUILDINGS: Buildings = {
  [BuildingType.TOWN_CENTER]: 1,
  [BuildingType.HOUSE]: 1,
  [BuildingType.WAREHOUSE]: 0,
  [BuildingType.WALL]: 0,
  [BuildingType.CATHEDRAL]: 0,
  [BuildingType.MARKET]: 0,
  
  [BuildingType.LUMBER_HUT]: 1,
  [BuildingType.QUARRY]: 0,
  [BuildingType.FARM]: 1,
  [BuildingType.IRON_MINE]: 0,
  
  [BuildingType.SAWMILL]: 0,
  [BuildingType.MASONRY]: 0,
  [BuildingType.WINDMILL]: 0,
  [BuildingType.FOUNDRY]: 0,
  
  [BuildingType.BARRACKS]: 0,
  [BuildingType.STABLE]: 0,
  [BuildingType.BLACKSMITH]: 0,
};

export const LABELS_PT = {
  resources: {
    [ResourceType.RAW_WOOD]: 'Tora',
    [ResourceType.RAW_STONE]: 'Pedra',
    [ResourceType.IRON_ORE]: 'Minério',
    [ResourceType.WHEAT]: 'Trigo',
    [ResourceType.PLANKS]: 'Tábua',
    [ResourceType.BLOCKS]: 'Bloco',
    [ResourceType.IRON_INGOTS]: 'Lingote',
    [ResourceType.BREAD]: 'Pão',
    [ResourceType.GOLD]: 'Ouro',
  },
  buildings: {
    [BuildingType.TOWN_CENTER]: 'Centro Urbano',
    [BuildingType.HOUSE]: 'Casa',
    [BuildingType.WAREHOUSE]: 'Armazém',
    [BuildingType.LUMBER_HUT]: 'Cabana do Lenhador',
    [BuildingType.QUARRY]: 'Pedreira',
    [BuildingType.FARM]: 'Fazenda',
    [BuildingType.IRON_MINE]: 'Mina de Ferro',
    [BuildingType.SAWMILL]: 'Serraria',
    [BuildingType.MASONRY]: 'Olaria',
    [BuildingType.WINDMILL]: 'Moinho',
    [BuildingType.FOUNDRY]: 'Fundição',
    [BuildingType.MARKET]: 'Mercado',
    [BuildingType.BARRACKS]: 'Quartel',
    [BuildingType.STABLE]: 'Estábulo',
    [BuildingType.BLACKSMITH]: 'Ferreiro',
    [BuildingType.WALL]: 'Muralha',
    [BuildingType.CATHEDRAL]: 'Catedral',
  },
  buildingDesc: {
    [BuildingType.TOWN_CENTER]: 'O coração do feudo. Gera ouro e permite mais população.',
    [BuildingType.HOUSE]: 'Abrigo para os aldeões. +5 População.',
    [BuildingType.WAREHOUSE]: 'Aumenta capacidade de armazenamento em +1000.',
    [BuildingType.LUMBER_HUT]: 'Corta árvores para obter Toras de Madeira.',
    [BuildingType.QUARRY]: 'Extrai Pedras Brutas do solo.',
    [BuildingType.FARM]: 'Cultiva Trigo nos campos.',
    [BuildingType.IRON_MINE]: 'Escava Minério de Ferro das profundezas.',
    [BuildingType.SAWMILL]: 'Transforma Toras em Tábuas de construção.',
    [BuildingType.MASONRY]: 'Corta Pedras Brutas em Blocos utilizáveis.',
    [BuildingType.WINDMILL]: 'Mói Trigo e assa Pães para alimentar o povo.',
    [BuildingType.FOUNDRY]: 'Derrete Minério para criar Lingotes de Ferro.',
    [BuildingType.MARKET]: 'Centro de comércio. Gera Ouro.',
    [BuildingType.BARRACKS]: 'Treina infantaria básica.',
    [BuildingType.STABLE]: 'Treina cavalaria de elite.',
    [BuildingType.BLACKSMITH]: 'Reduz custos de treinamento militar.',
    [BuildingType.WALL]: 'Protege a vila. Aumenta poder militar.',
    [BuildingType.CATHEDRAL]: 'Aumenta a fé. Crescimento populacional acelerado.',
  },
  units: {
    [UnitType.LANCER]: 'Lanceiro',
    [UnitType.ARCHER]: 'Arqueiro',
    [UnitType.KNIGHT]: 'Cavaleiro',
  },
  categories: {
    [BuildingCategory.CIVIL]: 'Civil',
    [BuildingCategory.EXTRACTION]: 'Extração',
    [BuildingCategory.INDUSTRY]: 'Indústria',
    [BuildingCategory.MILITARY]: 'Militar',
  },
  RESOURCE_ICONS: {
      [ResourceType.RAW_WOOD]: "🌲",
      [ResourceType.RAW_STONE]: "🪨",
      [ResourceType.IRON_ORE]: "⛏️",
      [ResourceType.WHEAT]: "🌾",
      [ResourceType.PLANKS]: "🪵",
      [ResourceType.BLOCKS]: "🧱",
      [ResourceType.IRON_INGOTS]: "🔩",
      [ResourceType.BREAD]: "🥖",
      [ResourceType.GOLD]: "🪙",
  }
};

export const ENEMY_NAMES = [
  "Baronia de Ferro", "Forte da Colina", "Vila dos Ventos", "Castelo Negro", 
  "Terras Baixas", "Santuário Perdido", "Pico da Tempestade", "Vale da Névoa"
];
