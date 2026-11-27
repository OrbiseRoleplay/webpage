// Reglamento centralizado de ORBISE. Todo valor de regla vive aquí.
// El GM puede sobrescribir partes por personaje/campaña (ver RulesOverride en domain/schema.ts).

export type AttributeKey =
  | 'vitAmarilla' | 'vitRoja' | 'resistencia'
  | 'fuerza' | 'defBacteriana' | 'defFisica' | 'concentracion' | 'ingenio' | 'velocidad'
  | 'resMental' | 'resFisico' | 'resElemental' | 'resMistico'

export interface AttributeRule {
  key: AttributeKey
  label: string
  icon: string
  base: number
  perPoint: number
  /** true = el incremento por punto aún no es oficial */
  provisional?: boolean
  group: 'vital' | 'general' | 'resistDon'
}

export const ATTRIBUTES: AttributeRule[] = [
  { key: 'vitAmarilla', label: 'Vitalidad amarilla', icon: '💛', base: 5, perPoint: 1, provisional: true, group: 'vital' },
  { key: 'vitRoja', label: 'Vitalidad roja', icon: '❤️', base: 10, perPoint: 5, group: 'vital' },
  { key: 'resistencia', label: 'Resistencia', icon: '💧', base: 100, perPoint: 10, group: 'vital' },
  { key: 'fuerza', label: 'Fuerza física', icon: '💪', base: 0, perPoint: 1, group: 'general' },
  { key: 'defBacteriana', label: 'Defensa bacteriana', icon: '✅', base: 0, perPoint: 1, group: 'general' },
  { key: 'defFisica', label: 'Defensa física', icon: '🛡️', base: 0, perPoint: 1, group: 'general' },
  { key: 'concentracion', label: 'Concentración', icon: '👀', base: 0, perPoint: 1, group: 'general' },
  { key: 'ingenio', label: 'Ingenio', icon: '🧠', base: 0, perPoint: 1, group: 'general' },
  { key: 'velocidad', label: 'Velocidad', icon: '⚡', base: 0, perPoint: 1, group: 'general' },
  { key: 'resMental', label: 'Resistencia a dones mentales', icon: '🌀', base: 0, perPoint: 1, group: 'resistDon' },
  { key: 'resFisico', label: 'Resistencia a dones físicos', icon: '🔶', base: 0, perPoint: 1, group: 'resistDon' },
  { key: 'resElemental', label: 'Resistencia a dones elementales', icon: '🔥', base: 0, perPoint: 1, group: 'resistDon' },
  { key: 'resMistico', label: 'Resistencia a dones místicos', icon: '🔮', base: 0, perPoint: 1, group: 'resistDon' },
]

export const ATTR_BY_KEY = Object.fromEntries(ATTRIBUTES.map((a) => [a.key, a])) as Record<AttributeKey, AttributeRule>

export const RULES = {
  initialPoints: 25,
  /** Referencia visual para barras de atributos generales. NO es un límite. */
  attributeVisualRef: 60,
  startingCoins: 150,
  inventory: { equipamiento: 10, consumibles: 15, armas: 3, otros: 10 },
  societies: ['FAERIT'] as const,
  giftClasses: ['OMEGA', 'A', 'B', 'C', 'D', 'F'] as const,
  dice: [6, 20, 60] as const,
  defaultDie: 20,
  reactions: {
    contraatacar: { label: 'Contraatacar', success: 'Supera al atacante: contraataca e inflige daño.' },
    defenderse: { label: 'Defenderse', success: 'Defensa sólida: recupera 1 punto de vida.', maxSuccessPerCombat: 3, healOnSuccess: 1 },
    esquivar: { label: 'Esquivar', success: 'Esquiva el ataque y puede reposicionarse.' },
    reagruparse: { label: 'Reagruparse', success: 'Se desplaza hacia un aliado. El GM determina complicaciones.' },
  },
} as const

export type GiftClass = (typeof RULES.giftClasses)[number]
export type ReactionKey = keyof typeof RULES.reactions
export type DieSides = (typeof RULES.dice)[number]

/** Aspectos sin reglamento oficial. La app NO los automatiza: el GM resuelve manualmente. */
export const PENDING_RULES = [
  'Incremento de vitalidad amarilla (provisional: +1 por punto)',
  'Resolución de empates',
  'Regeneración del aura',
  'Consecuencias de alcanzar cero de vitalidad',
  'Consecuencias del agotamiento',
  'Fórmulas exactas de daño',
  'Funcionamiento específico de los atributos',
  'Duración de las defensas sólidas',
  'Complicaciones del reagrupamiento',
  'Orden de turnos tras contraataques',
  'Interacción entre críticos simultáneos',
]
