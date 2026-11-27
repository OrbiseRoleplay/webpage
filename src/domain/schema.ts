// Contrato de datos compartido por todos los módulos. Validado con Zod en import/carga.
import { z } from 'zod'
import { ATTRIBUTES, RULES } from '../rules/config'

export const FORMAT_VERSION = 1

export const Visibility = z.enum(['publico', 'privado', 'jugadorGM', 'soloGM'])
export type Visibility = z.infer<typeof Visibility>

const id = z.string().min(1)

export const ImageAsset = z.object({
  id,
  dataUrl: z.string().startsWith('data:image/'),
  title: z.string().default(''),
  description: z.string().default(''),
  visible: z.boolean().default(true),
})
export type ImageAsset = z.infer<typeof ImageAsset>

export const Technique = z.object({
  id,
  name: z.string().default(''),
  description: z.string().default(''),
  /** Coste de resistencia fijado por el GM (no se aplica automáticamente) */
  cost: z.number().default(0),
  unlocked: z.boolean().default(true),
})
export type Technique = z.infer<typeof Technique>

export const Gift = z.object({
  name: z.string().default(''),
  /** Solo el GM la asigna. null = pendiente de asignación */
  giftClass: z.enum(RULES.giftClasses).nullable().default(null),
  description: z.string().default(''),
  strength: z.string().default(''),
  weakness: z.string().default(''),
  limitations: z.string().default(''),
  manifestation: z.string().default(''),
  images: z.array(ImageAsset).default([]),
  techniques: z.array(Technique).default([]),
  gmNotes: z.string().default(''),
})
export type Gift = z.infer<typeof Gift>

export const InventorySection = z.enum(['equipamiento', 'consumibles', 'armas', 'otros', 'propiedades'])
export type InventorySection = z.infer<typeof InventorySection>

export const Rarity = z.enum(['comun', 'poco_comun', 'raro', 'epico', 'legendario'])

export const Item = z.object({
  id,
  section: InventorySection,
  name: z.string().default(''),
  image: z.string().optional(),
  description: z.string().default(''),
  quantity: z.number().int().min(0).default(1),
  price: z.number().min(0).default(0),
  rarity: Rarity.default('comun'),
  durability: z.string().default(''),
  effects: z.string().default(''),
  requirements: z.string().default(''),
  gmNotes: z.string().default(''),
  equipped: z.boolean().default(false),
})
export type Item = z.infer<typeof Item>

export const Transaction = z.object({
  id, date: z.string(), amount: z.number(), reason: z.string(), by: z.string().default('jugador'),
})
export type Transaction = z.infer<typeof Transaction>

export const StoryEntry = z.object({
  id,
  section: z.string(),
  title: z.string().default(''),
  date: z.string().default(''),
  text: z.string().default(''),
  image: z.string().optional(),
  visibility: Visibility.default('jugadorGM'),
})
export type StoryEntry = z.infer<typeof StoryEntry>

export const Condition = z.object({
  id,
  kind: z.enum(['herida', 'positivo', 'negativo', 'estado', 'agotamiento', 'defensa']),
  name: z.string(),
  notes: z.string().default(''),
})
export type Condition = z.infer<typeof Condition>

export const Reward = z.object({
  id,
  date: z.string(),
  kind: z.enum(['experiencia', 'nivel', 'puntos', 'coins', 'habilidad', 'tecnica', 'objeto', 'propiedad', 'titulo', 'reputacion', 'desbloqueo']),
  amount: z.number().default(0),
  description: z.string().default(''),
  source: z.string().default('Game Master'),
})
export type Reward = z.infer<typeof Reward>

const attrShape = Object.fromEntries(ATTRIBUTES.map((a) => [a.key, z.number().int().min(0).default(0)]))
/** Puntos invertidos por atributo (NO el valor final). */
export const AttributePoints = z.object(attrShape as Record<string, z.ZodDefault<z.ZodNumber>>)
export type AttributePoints = Record<(typeof ATTRIBUTES)[number]['key'], number>
/** Bonos directos concedidos por el GM (suman al valor final, no consumen puntos). */
export const AttributeBonus = AttributePoints

export const Character = z.object({
  formatVersion: z.literal(FORMAT_VERSION).default(FORMAT_VERSION),
  id,
  createdAt: z.string(),
  updatedAt: z.string(),
  identity: z.object({
    firstName: z.string().default(''),
    lastName: z.string().default(''),
    alias: z.string().default(''),
    gender: z.string().default(''),
    age: z.string().default(''),
    birthday: z.object({ day: z.number().int().min(1).max(31).nullable(), month: z.number().int().min(1).max(12).nullable() }).default({ day: null, month: null }),
    height: z.string().default(''),
    weight: z.string().default(''),
    society: z.enum(RULES.societies).default('FAERIT'),
    profession: z.string().default(''),
    residence: z.string().default(''),
    physicalTraits: z.string().default(''),
    level: z.number().int().min(0).default(1),
    experience: z.number().min(0).default(0),
    reputation: z.string().default(''),
    titles: z.array(z.string()).default([]),
  }),
  gallery: z.array(ImageAsset).default([]),
  mainImageId: z.string().nullable().default(null),
  gift: Gift,
  points: AttributePoints,
  bonus: AttributeBonus,
  pointBudget: z.number().int().min(0).default(RULES.initialPoints),
  unlimitedPoints: z.boolean().default(false),
  /** Incrementos por punto sobrescritos por el GM */
  perPointOverride: z.record(z.string(), z.number()).default({}),
  current: z.object({ vitAmarilla: z.number(), vitRoja: z.number(), resistencia: z.number() }),
  conditions: z.array(Condition).default([]),
  coins: z.number().default(RULES.startingCoins),
  transactions: z.array(Transaction).default([]),
  capacity: z.object({
    equipamiento: z.number().int().min(0), consumibles: z.number().int().min(0), armas: z.number().int().min(0), otros: z.number().int().min(0),
  }).default({ ...RULES.inventory }),
  items: z.array(Item).default([]),
  story: z.array(StoryEntry).default([]),
  rewards: z.array(Reward).default([]),
  approved: z.boolean().default(false),
  campaignId: z.string().nullable().default(null),
  kind: z.enum(['pj', 'npc', 'enemigo']).default('pj'),
  isTemplate: z.boolean().default(false),
  history: z.array(z.object({ date: z.string(), by: z.string(), change: z.string() })).default([]),
})
export type Character = z.infer<typeof Character>

export const Mission = z.object({
  id,
  title: z.string().default(''),
  type: z.enum(['principal', 'secundaria', 'individual', 'grupal', 'oculta', 'evento']).default('principal'),
  description: z.string().default(''),
  images: z.array(z.string()).default([]),
  objectives: z.array(z.object({ id, text: z.string(), revealed: z.boolean().default(false), done: z.boolean().default(false) })).default([]),
  participants: z.array(z.string()).default([]),
  status: z.enum(['pendiente', 'activa', 'completada', 'fallida']).default('pendiente'),
  rewards: z.string().default(''),
  gmNotes: z.string().default(''),
})
export type Mission = z.infer<typeof Mission>

export const Campaign = z.object({
  id,
  name: z.string().default(''),
  description: z.string().default(''),
  inviteCode: z.string(),
  createdAt: z.string(),
  characterIds: z.array(z.string()).default([]),
  missions: z.array(Mission).default([]),
  journal: z.array(z.object({ id, date: z.string(), title: z.string(), text: z.string(), visibility: Visibility.default('publico') })).default([]),
  scenarios: z.array(z.object({ id, name: z.string(), description: z.string().default(''), image: z.string().optional() })).default([]),
  paused: z.boolean().default(false),
})
export type Campaign = z.infer<typeof Campaign>

export const EncyclopediaEntry = z.object({
  id,
  category: z.enum(['historia', 'faerit', 'dones', 'personajes', 'localizaciones', 'organizaciones', 'tecnologia', 'criaturas', 'acontecimientos', 'reglamento']),
  title: z.string(),
  text: z.string().default(''),
  image: z.string().optional(),
  /** false = contenido provisional/ejemplo, nunca canon */
  official: z.boolean().default(false),
})
export type EncyclopediaEntry = z.infer<typeof EncyclopediaEntry>
