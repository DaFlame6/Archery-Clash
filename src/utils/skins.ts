import { Skin, SkinRarity, ArrowType } from '../types/game';

export const RARITY_CONFIG: Record<
  SkinRarity,
  { label: SkinRarity; price: number; badgeColor: string; textColor: string; borderColor: string; glowClass: string }
> = {
  'Común': {
    label: 'Común',
    price: 300,
    badgeColor: 'bg-slate-300/20',
    textColor: 'text-slate-200',
    borderColor: 'border-slate-300/60',
    glowClass: 'shadow-slate-400/10',
  },
  'Raro': {
    label: 'Raro',
    price: 750,
    badgeColor: 'bg-sky-500/25',
    textColor: 'text-sky-300',
    borderColor: 'border-sky-400',
    glowClass: 'shadow-sky-500/20',
  },
  'Épico': {
    label: 'Épico',
    price: 1500,
    badgeColor: 'bg-purple-600/30',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-400',
    glowClass: 'shadow-purple-500/25',
  },
  'Leyenda': {
    label: 'Leyenda',
    price: 3000,
    badgeColor: 'bg-gradient-to-r from-amber-500/30 to-orange-500/30',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-400',
    glowClass: 'shadow-amber-500/30',
  },
};

export const SKINS_DATABASE: Skin[] = [
  // ==================== COMÚN (300 MONEDAS) ====================
  { id: "com_01", name: "Recluta de la Milicia", rarity: "Común", price: 300, weapon: "Arco corto de fresno", description: "Jubón acolchado de lino beige, brazales de cuero desgastado y gorro de lana sencillo.", visual: { primaryColor: "#C8B195", secondaryColor: "#5C4033", bowColor: "#A67B5B", arrowType: "wood_standard" } },
  { id: "com_02", name: "Rastreador de la Pradera", rarity: "Común", price: 300, weapon: "Arco compuesto de cuerno", description: "Túnica de lana gruesa marrón cruzada al pecho, botas cortas y faja naranja.", visual: { primaryColor: "#6E473B", secondaryColor: "#D35400", bowColor: "#4A2E18", arrowType: "wood_standard" } },
  { id: "com_03", name: "Vigía del Pantano", rarity: "Común", price: 300, weapon: "Arco de pantano oscuro", description: "Capucha verde musgo rasgada, chaleco de cuero curtido y vendajes en antebrazos.", visual: { primaryColor: "#3B5323", secondaryColor: "#2F3E22", bowColor: "#1E2716", arrowType: "moss_arrow" } },
  { id: "com_04", name: "Escolta de Caravana", rarity: "Común", price: 300, weapon: "Arco recurvo con remates de latón", description: "Túnica color arena, bufanda envolvente gris polvoriento y guantes de montar.", visual: { primaryColor: "#D2B48C", secondaryColor: "#708090", bowColor: "#B5A642", arrowType: "wood_standard" } },
  { id: "com_05", name: "Guardabosques Novato", rarity: "Común", price: 300, weapon: "Arco largo de haya", description: "Túnica verde oliva con cinto de hebilla de hierro simple y carcaj liso.", visual: { primaryColor: "#556B2F", secondaryColor: "#4B3621", bowColor: "#8B5A2B", arrowType: "wood_standard" } },
  { id: "com_06", name: "Tirador de la Chatarra", rarity: "Común", price: 300, weapon: "Arco de suspensión y cable de acero", description: "Camiseta sin mangas gris desteñida, rodillera metálica y coderas de neumático.", visual: { primaryColor: "#4A4A4A", secondaryColor: "#7F8C8D", bowColor: "#2C3E50", arrowType: "scrap_bolt" } },
  { id: "com_07", name: "Marinero Arponero", rarity: "Común", price: 300, weapon: "Arco corto con brea negra", description: "Pantalones de lona azul petróleo doblados, camiseta de rayas y tirantes de cuero.", visual: { primaryColor: "#1B3B54", secondaryColor: "#D6DBDF", bowColor: "#111111", arrowType: "harpoon" } },
  { id: "com_08", name: "Cazador de Ciervos", rarity: "Común", price: 300, weapon: "Arco recurvo de nogal", description: "Chaleco de franela a cuadros marrón y negro con parches de cuero.", visual: { primaryColor: "#7B3F00", secondaryColor: "#212F3D", bowColor: "#5C3818", arrowType: "wood_standard" } },

  // ==================== RARO (750 MONEDAS) ====================
  { id: "rar_01", name: "Forajido del Robledal", rarity: "Raro", price: 750, weapon: "Gran arco largo de tejo rúnico", description: "Capa con capucha color pardo oscuro, camisa tachonada y máscara facial.", visual: { primaryColor: "#4A3525", secondaryColor: "#1E5631", bowColor: "#6A4A3A", arrowType: "leaf_trail" } },
  { id: "rar_02", name: "Tiradora de la Arena", rarity: "Raro", price: 750, weapon: "Arco recurvo negro mate", description: "Chaqueta técnica impermeable color grafito con cuello alto y brújula de bronce.", visual: { primaryColor: "#272727", secondaryColor: "#BDC3C7", bowColor: "#1A1A1A", arrowType: "tactical_carbon" } },
  { id: "rar_03", name: "Mercenario de Acero", rarity: "Raro", price: 750, weapon: "Arco con alma de hierro forjado", description: "Brigandina remachada sobre cuero azul marino, gorguera y hombrera metálica.", visual: { primaryColor: "#1B263B", secondaryColor: "#778DA9", bowColor: "#415A77", arrowType: "iron_tip" } },
  { id: "rar_04", name: "Agente Táctico Urbano", rarity: "Raro", price: 750, weapon: "Arco táctico de fibra con mira holográfica", description: "Traje utilitario ajustado negro/vino tinto con gafas polarizadas amarillas.", visual: { primaryColor: "#191919", secondaryColor: "#800020", bowColor: "#0A0A0A", arrowType: "laser_red" } },
  { id: "rar_05", name: "Infiltrado de las Sombras", rarity: "Raro", price: 750, weapon: "Arco corto plegable antirreflejante", description: "Máscara de tela completa, túnica ceñida carbón y protectores lisos.", visual: { primaryColor: "#17202A", secondaryColor: "#2C3E50", bowColor: "#141414", arrowType: "shadow_trail" } },
  { id: "rar_06", name: "Arquera de la Taiga", rarity: "Raro", price: 750, weapon: "Arco de hueso de caribú y abedul", description: "Parka térmica con ribetes de pelaje blanco y gris, mitones y botas forradas.", visual: { primaryColor: "#E5E8E8", secondaryColor: "#566573", bowColor: "#D0D3D4", arrowType: "frost_light" } },
  { id: "rar_07", name: "Explorador Mohicano", rarity: "Raro", price: 750, weapon: "Arco corto forrado en piel de serpiente", description: "Cresta tradicional, chaleco abierto gamuzado y pintura de guerra negra.", visual: { primaryColor: "#8D4925", secondaryColor: "#922B21", bowColor: "#5B2C6F", arrowType: "feather_arrow" } },
  { id: "rar_08", name: "Tirador Steampunk", rarity: "Raro", price: 750, weapon: "Arco con engranajes y poleas de cobre", description: "Gabardina corta marrón, monóculo de latón y guantelete mecánico articulado.", visual: { primaryColor: "#6E2C00", secondaryColor: "#B7950B", bowColor: "#B9770E", arrowType: "spark_arrow" } },

  // ==================== ÉPICO (1500 MONEDAS) ====================
  { id: "epi_01", name: "El Justiciero Nocturno", rarity: "Épico", price: 1500, weapon: "Arco de poleas de magnesio", description: "Capucha profunda verde bosque, media máscara de respirador y carcaj magnético.", visual: { primaryColor: "#0E4D2B", secondaryColor: "#1B1B1B", bowColor: "#232B2B", arrowType: "emp_shock" } },
  { id: "epi_02", name: "Ronin del Viento", rarity: "Épico", price: 1500, weapon: "Arco asimétrico japonés (yumi) carmesí", description: "Kimono asimétrico azul añil con protector lacado y tatuajes en tinta china.", visual: { primaryColor: "#1B4F72", secondaryColor: "#922B21", bowColor: "#78281F", arrowType: "wind_slice" } },
  { id: "epi_03", name: "Vanguardia Silvana", rarity: "Épico", price: 1500, weapon: "Arco curvo élfico de madera cristalizada", description: "Armadura de escamas de plata pulida, capa de seda verde esmeralda y filigranas.", visual: { primaryColor: "#117A65", secondaryColor: "#EAEDED", bowColor: "#A3E4D7", arrowType: "crystal_light" } },
  { id: "epi_04", name: "Guerrera Valquiria", rarity: "Épico", price: 1500, weapon: "Arco de roble milenario con alas de cisne", description: "Coraza plateada con ribetes dorados, túnica azul celeste y diadema alada.", visual: { primaryColor: "#5499C7", secondaryColor: "#F4D03F", bowColor: "#F7DC6F", arrowType: "golden_feather" } },
  { id: "epi_05", name: "Cazador Primitivo", rarity: "Épico", price: 1500, weapon: "Arco tosco de colmillo de mamut curvado", description: "Cráneo de lobo al hombro, arnés de piel rústica y collares de colmillos.", visual: { primaryColor: "#4D2600", secondaryColor: "#935116", bowColor: "#E59866", arrowType: "bone_spear" } },
  { id: "epi_06", name: "Centurión de la Legión", rarity: "Épico", price: 1500, weapon: "Arco compuesto oriental con refuerzos de latón", description: "Lorica segmentata de bronce pulido, faldón con tachas y cresta de crin negra.", visual: { primaryColor: "#78281F", secondaryColor: "#B7950B", bowColor: "#7D6608", arrowType: "fire_arrow" } },
  { id: "epi_07", name: "Francotirador Cibernético", rarity: "Épico", price: 1500, weapon: "Arco de polímero con cuerda de plasma", description: "Exoesqueleto liviano, mono con fibra óptica azul y visor HUD integrado.", visual: { primaryColor: "#1C2833", secondaryColor: "#00E5FF", bowColor: "#00A8CC", arrowType: "plasma_bolt" } },
  { id: "epi_08", name: "Caballero de la Orden Solar", rarity: "Épico", price: 1500, weapon: "Gran arco pesado dorado con estacas", description: "Armadura dorada desgastada y sobreveste blanca con emblema solar bordado.", visual: { primaryColor: "#D4AC0D", secondaryColor: "#FBFCFC", bowColor: "#B7950B", arrowType: "solar_flare" } },

  // ==================== LEYENDA (3000 MONEDAS) ====================
  { id: "ley_01", name: "Arquero del Averno", rarity: "Leyenda", price: 3000, weapon: "Arco de obsidiana y cuerda de fuego", description: "Armadura de quitina negra con magma incandescente y cuernos hacia atrás.", visual: { primaryColor: "#1C0D02", secondaryColor: "#FF4500", bowColor: "#330000", arrowType: "inferno_beam" } },
  { id: "ley_02", name: "Monarca del Abismo Glacial", rarity: "Leyenda", price: 3000, weapon: "Arco tallado en hielo eterno", description: "Corona de hielo, armadura de escarcha translúcida y aura de vaho polar.", visual: { primaryColor: "#A9CCE3", secondaryColor: "#00FFFF", bowColor: "#5DADE2", arrowType: "absolute_zero" } },
  { id: "ley_03", name: "Avatar del Fénix", rarity: "Leyenda", price: 3000, weapon: "Arco de filigrana con alas articuladas de luz", description: "Túnica de plumas encendidas, máscara dorada y corona solar flotante.", visual: { primaryColor: "#F39C12", secondaryColor: "#FFD700", bowColor: "#E67E22", arrowType: "phoenix_burst" } },
  { id: "ley_04", name: "Espectro de la Cripta", rarity: "Leyenda", price: 3000, weapon: "Arco de madera putrefacta con humo verde", description: "Capucha profunda en tinieblas, túnica rota y guanteletes oxidados.", visual: { primaryColor: "#0B0B0B", secondaryColor: "#2ECC71", bowColor: "#196F3D", arrowType: "soul_drain" } },
  { id: "ley_05", name: "Cazador del Vacío Cósmico", rarity: "Leyenda", price: 3000, weapon: "Arco gravitatorio flotante con rayo púrpura", description: "Traje orgánico estelar animado y visor de espejo morado.", visual: { primaryColor: "#4A235A", secondaryColor: "#BB8FCE", bowColor: "#8E44AD", arrowType: "void_laser" } },
  { id: "ley_06", name: "Titán Mecánico Primordial", rarity: "Leyenda", price: 3000, weapon: "Estructura expansible de piedra rúnica", description: "Roca con musgo, engranajes mecánicos y reactor turquesa en el pecho.", visual: { primaryColor: "#34495E", secondaryColor: "#16A085", bowColor: "#2C3E50", arrowType: "kinetic_core" } },
  { id: "ley_07", name: "Ángel del Juicio", rarity: "Leyenda", price: 3000, weapon: "Arco monumental de plata con hojas cortantes", description: "Armadura de platino, alas de luz pura y venda dorada en los ojos.", visual: { primaryColor: "#F7F9F9", secondaryColor: "#F1C40F", bowColor: "#D5D8DC", arrowType: "divine_ray" } },
  { id: "ley_08", name: "Cronotirador del Multiverso", rarity: "Leyenda", price: 3000, weapon: "Arco de tres aros concéntricos temporales", description: "Placas cromadas reflectantes, anillos flotantes y runas cronológicas.", visual: { primaryColor: "#85929E", secondaryColor: "#5499C7", bowColor: "#2E86C1", arrowType: "temporal_warp" } }
];

export const LEGEND_SKIN_IDS = SKINS_DATABASE.filter((s) => s.rarity === 'Leyenda').map((s) => s.id);

export function getSkinById(id: string): Skin {
  return SKINS_DATABASE.find((s) => s.id === id) || SKINS_DATABASE[0];
}

export function getSkinIcon(id: string): string {
  const icons: Record<string, string> = {
    com_01: '🏹',
    com_02: '🌾',
    com_03: '🌿',
    com_04: '🐫',
    com_05: '🌲',
    com_06: '⚙️',
    com_07: '⚓',
    com_08: '🦌',
    rar_01: '🍂',
    rar_02: '🥋',
    rar_03: '🛡️',
    rar_04: '🕶️',
    rar_05: '🥷',
    rar_06: '❄️',
    rar_07: '🪶',
    rar_08: '🕰️',
    epi_01: '🏹',
    epi_02: '🌪️',
    epi_03: '✨',
    epi_04: '⚔️',
    epi_05: '🐺',
    epi_06: '🏛️',
    epi_07: '🤖',
    epi_08: '☀️',
    ley_01: '🌋',
    ley_02: '👑',
    ley_03: '🔥',
    ley_04: '💀',
    ley_05: '🌌',
    ley_06: '🗿',
    ley_07: '🪽',
    ley_08: '⏳',
  };
  return icons[id] || '🏹';
}

export type HatStyle = 'hood' | 'helmet' | 'ninja' | 'taiga' | 'punk' | 'crown' | 'wings' | 'horns' | 'halo' | 'visor' | 'none';

export function getSkinHatStyle(id: string): HatStyle {
  const styles: Record<string, HatStyle> = {
    com_01: 'hood',
    com_02: 'hood',
    com_03: 'hood',
    com_04: 'hood',
    com_05: 'hood',
    com_06: 'none',
    com_07: 'hood',
    com_08: 'none',
    rar_01: 'hood',
    rar_02: 'ninja',
    rar_03: 'helmet',
    rar_04: 'visor',
    rar_05: 'ninja',
    rar_06: 'taiga',
    rar_07: 'punk',
    rar_08: 'visor',
    epi_01: 'hood',
    epi_02: 'none',
    epi_03: 'crown',
    epi_04: 'wings',
    epi_05: 'horns',
    epi_06: 'helmet',
    epi_07: 'visor',
    epi_08: 'helmet',
    ley_01: 'horns',
    ley_02: 'crown',
    ley_03: 'wings',
    ley_04: 'hood',
    ley_05: 'visor',
    ley_06: 'helmet',
    ley_07: 'halo',
    ley_08: 'crown',
  };
  return styles[id] || 'hood';
}

export function getArrowTypeMeta(arrowType: ArrowType): { label: string; colorClass: string; trailHex: string } {
  const map: Record<ArrowType, { label: string; colorClass: string; trailHex: string }> = {
    wood_standard: { label: '🏹 Flecha de Madera', colorClass: 'text-amber-200 bg-amber-500/15 border-amber-500/30', trailHex: '#D2B48C' },
    moss_arrow: { label: '🌿 Flecha de Musgo', colorClass: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30', trailHex: '#4ADE80' },
    scrap_bolt: { label: '⚙️ Perno de Chatarra', colorClass: 'text-slate-300 bg-slate-500/15 border-slate-500/30', trailHex: '#94A3B8' },
    harpoon: { label: '⚓ Arpón Marino', colorClass: 'text-sky-300 bg-sky-500/15 border-sky-500/30', trailHex: '#38BDF8' },
    leaf_trail: { label: '🍂 Estela de Hojas', colorClass: 'text-green-300 bg-green-500/15 border-green-500/30', trailHex: '#22C55E' },
    tactical_carbon: { label: '🎯 Carbono Táctico', colorClass: 'text-zinc-300 bg-zinc-500/15 border-zinc-500/30', trailHex: '#CBD5E1' },
    iron_tip: { label: '🛡️ Punta de Hierro', colorClass: 'text-blue-200 bg-blue-500/15 border-blue-500/30', trailHex: '#93C5FD' },
    laser_red: { label: '🔴 Láser Táctico Rojo', colorClass: 'text-red-300 bg-red-500/15 border-red-500/30', trailHex: '#EF4444' },
    shadow_trail: { label: '🌑 Estela Sombría', colorClass: 'text-purple-300 bg-purple-500/15 border-purple-500/30', trailHex: '#A855F7' },
    frost_light: { label: '❄️ Escarcha Ligera', colorClass: 'text-cyan-200 bg-cyan-500/15 border-cyan-500/30', trailHex: '#67E8F9' },
    feather_arrow: { label: '🪶 Flecha Emplumada', colorClass: 'text-orange-300 bg-orange-500/15 border-orange-500/30', trailHex: '#FB923C' },
    spark_arrow: { label: '⚡ Flecha de Chispas', colorClass: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/30', trailHex: '#FACC15' },
    emp_shock: { label: '🔋 Pulso EMP', colorClass: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30', trailHex: '#10B981' },
    wind_slice: { label: '🌪️ Corte de Viento', colorClass: 'text-sky-200 bg-sky-500/15 border-sky-500/30', trailHex: '#7DD3FC' },
    crystal_light: { label: '💎 Luz Cristalina', colorClass: 'text-teal-200 bg-teal-500/15 border-teal-500/30', trailHex: '#5EEAD4' },
    golden_feather: { label: '✨ Pluma Dorada', colorClass: 'text-yellow-200 bg-yellow-500/15 border-yellow-500/30', trailHex: '#FDE047' },
    bone_spear: { label: '🦴 Lanza de Hueso', colorClass: 'text-orange-200 bg-orange-500/15 border-orange-500/30', trailHex: '#FDBA74' },
    fire_arrow: { label: '🔥 Flecha de Fuego', colorClass: 'text-orange-400 bg-orange-500/15 border-orange-500/30', trailHex: '#F97316' },
    plasma_bolt: { label: '⚡ Rayo de Plasma', colorClass: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30', trailHex: '#00E5FF' },
    solar_flare: { label: '☀️ Llamarada Solar', colorClass: 'text-amber-300 bg-amber-500/15 border-amber-500/30', trailHex: '#FBBF24' },
    inferno_beam: { label: '🌋 Haz Infernal', colorClass: 'text-red-400 bg-red-500/20 border-red-500/40', trailHex: '#FF4500' },
    absolute_zero: { label: '🧊 Cero Absoluto', colorClass: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/40', trailHex: '#00FFFF' },
    phoenix_burst: { label: '🔥 Estallido Fénix', colorClass: 'text-amber-300 bg-amber-500/20 border-amber-500/40', trailHex: '#FFD700' },
    soul_drain: { label: '💀 Drenaje de Almas', colorClass: 'text-green-400 bg-green-500/20 border-green-500/40', trailHex: '#2ECC71' },
    void_laser: { label: '🌌 Láser del Vacío', colorClass: 'text-fuchsia-300 bg-fuchsia-500/20 border-fuchsia-500/40', trailHex: '#BB8FCE' },
    kinetic_core: { label: '🗿 Núcleo Cinético', colorClass: 'text-teal-300 bg-teal-500/20 border-teal-500/40', trailHex: '#16A085' },
    divine_ray: { label: '🪽 Rayo Divino', colorClass: 'text-yellow-200 bg-yellow-500/20 border-yellow-500/40', trailHex: '#F1C40F' },
    temporal_warp: { label: '⏳ Distorsión Temporal', colorClass: 'text-blue-300 bg-blue-500/20 border-blue-500/40', trailHex: '#5499C7' },
  };
  return map[arrowType] || map.wood_standard;
}
