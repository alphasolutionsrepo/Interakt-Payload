/**
 * Pure functions that turn raw Art Institute of Chicago records into clean facet values.
 * Unit-tested in tests/int/normalize.int.spec.ts.
 */
import { SUBJECTS } from './taxonomy'

// ---------------------------------------------------------------------------------------------
// Dates

/** 1850 → 19, -450 → -5 (5th century BCE). Year 0 is treated as 1 BCE. */
export function centuryNumber(year: number): number {
  return year > 0 ? Math.floor((year - 1) / 100) + 1 : -(Math.floor(-year / 100) + 1)
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** 1850 → "19th century", -450 → "5th century BCE". */
export function centuryLabel(year: number): string {
  const c = centuryNumber(year)
  return c > 0 ? `${ordinal(c)} century` : `${ordinal(-c)} century BCE`
}

export function eraFor(year: number | null | undefined): string | undefined {
  if (year == null) return undefined
  if (year < 500) return 'ancient'
  if (year < 1400) return 'medieval'
  if (year < 1800) return 'early-modern'
  if (year < 1900) return '19th-century'
  return '20th-century'
}

// ---------------------------------------------------------------------------------------------
// Places

/** Raw place_of_origin → modern country. Cities, states and historic regions fold into countries. */
const PLACE_TO_COUNTRY: Record<string, string> = {
  // Europe
  France: 'France', Paris: 'France', 'Saint-Rémy-de-Provence': 'France', Sèvres: 'France', Trouville: 'France',
  Baccarat: 'France', Lunéville: 'France',
  Italy: 'Italy', Rome: 'Italy', 'Roman Empire': 'Italy', Venice: 'Italy', Milan: 'Italy', Florence: 'Italy',
  Etruria: 'Italy', Apulia: 'Italy', Cales: 'Italy', Vulci: 'Italy', Metaponto: 'Italy', Frascati: 'Italy',
  Nola: 'Italy', Veio: 'Italy', Campania: 'Italy', Taranto: 'Italy', 'Southern Italy': 'Italy', Syracuse: 'Italy',
  "Sant'Eufemia Vecchia di Lamezia Terme": 'Italy',
  Greece: 'Greece', 'Ancient Greece': 'Greece', Athens: 'Greece', Corinth: 'Greece', Thessalía: 'Greece',
  Kavála: 'Greece', Piraeus: 'Greece', Kéa: 'Greece', Sámos: 'Greece', Knossos: 'Greece', Ródhos: 'Greece',
  Thívai: 'Greece', Aegina: 'Greece',
  Spain: 'Spain', Seville: 'Spain',
  Netherlands: 'Netherlands', Holland: 'Netherlands', Dordrecht: 'Netherlands',
  Flanders: 'Belgium',
  Germany: 'Germany', Augsburg: 'Germany', Ulm: 'Germany', Nuremberg: 'Germany',
  England: 'United Kingdom', London: 'United Kingdom', 'United Kingdom': 'United Kingdom', Greenwich: 'United Kingdom',
  Scotland: 'United Kingdom',
  Switzerland: 'Switzerland', Austria: 'Austria', Vienna: 'Austria', Norway: 'Norway', Denmark: 'Denmark',
  // North America
  'United States': 'United States', 'New York City': 'United States', 'New York': 'United States',
  Philadelphia: 'United States', 'New Mexico': 'United States', 'Long Island': 'United States',
  'New Hampshire': 'United States', Roxbury: 'United States', 'Niagara Falls': 'United States',
  'Prouts Neck': 'United States', Florida: 'United States', 'Nantucket Island': 'United States',
  Baltimore: 'United States', Boston: 'United States', Southwest: 'United States', Newport: 'United States',
  Gloucester: 'United States', Massachusetts: 'United States', 'New England': 'United States',
  'Pueblo of Acoma': 'United States', Connecticut: 'United States', Texas: 'United States',
  Providence: 'United States', Chicago: 'United States', Edgefield: 'United States', Pennsylvania: 'United States',
  Corona: 'United States',
  // Latin America
  Tenochtitlan: 'Mexico', Teotihuacán: 'Mexico', 'Veracruz state': 'Mexico', 'Jalisco state': 'Mexico',
  Puebla: 'Mexico', 'Nayarit state': 'Mexico',
  'Peruvian North Coast': 'Peru', 'Lambayeque Valley': 'Peru',
  Petén: 'Guatemala', Guatemala: 'Guatemala',
  'Venado Beach': 'Panama', Panama: 'Panama', Colombia: 'Colombia',
  // Africa
  Angola: 'Angola', 'Republic of the Congo': 'Republic of the Congo',
  'Democratic Republic of the Congo': 'DR Congo', Kenya: 'Kenya', Gabon: 'Gabon', Nigeria: 'Nigeria',
  Mali: 'Mali', Cameroon: 'Cameroon', 'South Africa': 'South Africa',
  // Middle East & North Africa
  Egypt: 'Egypt', Saqqara: 'Egypt', 'Al Fayyum': 'Egypt',
  Iran: 'Iran', Syria: 'Syria', 'Jazirat Arwad': 'Syria', Iraq: 'Iraq', Turkey: 'Turkey', Istanbul: 'Turkey',
  Antioch: 'Turkey', Tyre: 'Lebanon', Polis: 'Cyprus', 'Eastern Mediterranean Region': 'Lebanon',
  // Asia
  China: 'China', Japan: 'Japan', Korea: 'Korea',
  India: 'India', 'Tamil Nadu': 'India', Nagapattinam: 'India', 'Andhra Pradesh': 'India',
  'Madhya Pradesh': 'India', Karnataka: 'India', Gandhara: 'Pakistan', Vietnam: 'Vietnam',
}

const COUNTRY_TO_REGION: Record<string, string> = {
  France: 'europe', Italy: 'europe', Greece: 'europe', Spain: 'europe', Netherlands: 'europe',
  Belgium: 'europe', Germany: 'europe', 'United Kingdom': 'europe', Switzerland: 'europe',
  Austria: 'europe', Norway: 'europe', Denmark: 'europe',
  'United States': 'north-america',
  Mexico: 'latin-america', Peru: 'latin-america', Guatemala: 'latin-america', Panama: 'latin-america',
  Colombia: 'latin-america',
  Angola: 'africa', 'Republic of the Congo': 'africa', 'DR Congo': 'africa', Kenya: 'africa',
  Gabon: 'africa', Nigeria: 'africa', Mali: 'africa', Cameroon: 'africa', 'South Africa': 'africa',
  Egypt: 'mena', Iran: 'mena', Syria: 'mena', Iraq: 'mena', Turkey: 'mena', Lebanon: 'mena', Cyprus: 'mena',
  China: 'east-asia', Japan: 'east-asia', Korea: 'east-asia',
  India: 'south-southeast-asia', Pakistan: 'south-southeast-asia', Vietnam: 'south-southeast-asia',
  Cambodia: 'south-southeast-asia',
}

export function countryFor(place: string | null | undefined): string | undefined {
  if (!place) return undefined
  return PLACE_TO_COUNTRY[place.trim()]
}

export function regionFor(country: string | undefined): string | undefined {
  return country ? COUNTRY_TO_REGION[country] : undefined
}

// ---------------------------------------------------------------------------------------------
// Departments and object types

const DEPARTMENT_MAP: Record<string, string> = {
  'Painting and Sculpture of Europe': 'european-painting-sculpture',
  'Arts of the Americas': 'americas',
  'Arts of Greece, Rome, and Byzantium': 'greece-rome-byzantium',
  'Arts of Africa': 'africa',
  'Arts of Asia': 'asia',
  'Applied Arts of Europe': 'european-decorative-arts',
  'Modern Art': 'modern',
  'Prints and Drawings': 'prints-drawings',
  'Architecture and Design': 'architecture-design',
  Textiles: 'textiles',
}

export const departmentFor = (raw?: string | null) => (raw ? DEPARTMENT_MAP[raw] : undefined)

const TYPE_MAP: Record<string, string> = {
  Painting: 'painting',
  Sculpture: 'sculpture',
  Vessel: 'vessels-ceramics',
  Ceramics: 'vessels-ceramics',
  Glass: 'vessels-ceramics',
  Coin: 'coins',
  'Costume and Accessories': 'costume-textiles',
  Textile: 'costume-textiles',
  Basketry: 'costume-textiles',
  Metalwork: 'metalwork-armor',
  Armor: 'metalwork-armor',
  'Architectural fragment': 'architecture',
  'Architectural Drawing': 'architecture',
  Furniture: 'furniture-decorative',
  Furnishings: 'furniture-decorative',
  'Decorative Arts': 'furniture-decorative',
  'Miniature room': 'miniature-rooms',
  Print: 'prints-drawings',
  'Drawing and Watercolor': 'prints-drawings',
  'Funerary Object': 'ritual-funerary',
  'Religious/Ritual Object': 'ritual-funerary',
  Mask: 'ritual-funerary',
}

export const artworkTypeFor = (raw?: string | null) => (raw ? TYPE_MAP[raw] : undefined)

// ---------------------------------------------------------------------------------------------
// Artists vs. cultures

/**
 * AIC attributes many objects to a culture ("Ancient Greek", "Maya", "Islamic") rather than a
 * person. Those become the artwork's `culture`, not an Artist document.
 */
const CULTURES = new Set([
  'Ancient Roman', 'Ancient Egyptian', 'Ancient Greek', 'Ancient Etruscan', 'Ancient Mesopotamian',
  'Ancient Eastern Mediterranean', 'Byzantine', 'Islamic', 'Moche', 'Mexica (Aztec)', 'Chimú',
  'Teotihuacan', 'Salado', 'Ancestral Pueblo', 'Pueblo of Acoma', 'Maya', 'Nayarit', 'Chavín',
  'Jalisco', 'Coclé', 'Tairona', 'Navajo (Diné)', 'Vili', 'Swahili', 'Fang', 'Luluwa', 'Bamileke',
  'Chokwe', 'Bankoni', 'Kongo', 'Northern Nguni', 'Khmer', 'Spanish', 'French', 'German', 'Flemish',
  'Chinese export porcelain', 'Artist unknown',
])

export const isCulture = (name?: string | null) => !name || CULTURES.has(name.trim())

/** "Claude Monet\nFrench, 1840–1926" / "El Greco (Doménikos Theotokópoulos; Greek, active …)" → "French" / "Greek" */
export function nationalityFrom(artistDisplay?: string | null): string | undefined {
  if (!artistDisplay) return undefined
  const m = artistDisplay.match(/(?:\n|\(|;\s)\s*([A-Z][A-Za-zÀ-ÿ-]+(?: [A-Z][A-Za-zÀ-ÿ-]+)?),/)
  return m?.[1]
}

// ---------------------------------------------------------------------------------------------
// Movements

type MovementInput = {
  styles: string[]
  department?: string
  country?: string
  year?: number | null
  artist?: string | null
}

const ARTIST_MOVEMENT: Record<string, string> = {
  'Eugène Delacroix': 'romanticism',
  'Henry Fuseli': 'romanticism',
  'Thomas Cole': 'romanticism',
  'Francisco José de Goya y Lucientes': 'romanticism',
  'Joseph Mallord William Turner': 'romanticism',
  'Winslow Homer': 'realism',
  'Édouard Manet': 'realism',
  'Gustave Courbet': 'realism',
  'George Inness': 'realism',
  'Paul Gauguin': 'post-impressionism',
  'Vincent van Gogh': 'post-impressionism',
  'Paul Cezanne': 'post-impressionism',
  'Georges Seurat': 'post-impressionism',
  'Henri de Toulouse-Lautrec': 'post-impressionism',
  'Claude Monet': 'impressionism',
  'Piet Mondrian': 'modernism',
  'Vasily Kandinsky': 'modernism',
  'Marsden Hartley': 'modernism',
  'Tiffany and Company': 'arts-and-crafts',
}

/** Ordered rules: first match wins. Patterns are tested against lower-cased style titles. */
const STYLE_RULES: [RegExp, string][] = [
  [/\bpost-impressionism|pointillism/, 'post-impressionism'],
  [/\bimpressionism/, 'impressionism'],
  [/\brealism|hudson river|barbizon/, 'realism'],
  [/romanticism|pre-raphaelite/, 'romanticism'],
  [/modernism|cubism|expressionism|20th century|abstract/, 'modernism'],
  [/arts and crafts|art nouveau|aesthetic movement/, 'arts-and-crafts'],
  [/kingdom|dynasty|ptolemaic|intermediate period|\(egyptian\)|^egyptian$/, 'ancient-egypt'],
  [/etruscan|roman|hadrianic|antonine|republic period/, 'ancient-rome'],
  [/greek|attic|hellenistic|classical|red-figure|black-figure|corinthian|gnathian|campanian|south italian|cycladic|cretan|orientalizing|^geometric$|rhodian/, 'ancient-greece'],
  [/byzantine|medieval/, 'medieval'],
  [/maya|aztec|mexica|teotihuac|moche|chim[uú]|chav[ií]n|cocl[eé]|tairona|jalisco|nayarit|anasazi|pueblo|salado|acoma|navajo/, 'ancient-americas'],
  [/islamic|iznik/, 'islamic'],
  [/chinese|japanese|korean/, 'east-asian'],
  [/south asian|southeast asian|khmer/, 'south-asian'],
  [/renaissance|mannerism|1[45]th century|fifteenth|sixteenth|tudor/, 'renaissance'],
  [/baroque|17th century|seventeenth|flemish|jacobean/, 'baroque'],
  [/rococo|neoclassicism|18th century|eighteenth|louis x|georgian|empire/, 'rococo-neoclassicism'],
  [/american colonial|folk art/, 'early-american'],
]

export function movementFor({ styles, department, country, year, artist }: MovementInput): string | undefined {
  if (artist && ARTIST_MOVEMENT[artist]) return ARTIST_MOVEMENT[artist]
  const lower = styles.map((s) => s.toLowerCase())
  for (const [re, slug] of STYLE_RULES) {
    if (lower.some((s) => re.test(s))) return slug
  }
  // Fallbacks from department / place / date for records with no usable style.
  if (department === 'africa') return 'african-traditions'
  if (department === 'asia') return country === 'India' || country === 'Pakistan' || country === 'Vietnam' ? 'south-asian' : 'east-asian'
  if (country === 'Egypt' && year != null && year < 400) return 'ancient-egypt'
  if (department === 'greece-rome-byzantium') {
    if (year != null && year >= 330) return 'medieval'
    return country === 'Italy' ? 'ancient-rome' : 'ancient-greece'
  }
  if (department === 'americas' && year != null && year < 1500) return 'ancient-americas'
  if (department === 'americas' && year != null && year < 1830) return 'early-american'
  if (year == null) return undefined
  if (year < 1400) return 'medieval'
  if (year < 1600) return 'renaissance'
  if (year < 1700) return 'baroque'
  if (year < 1800) return 'rococo-neoclassicism'
  if (year < 1860) return 'romanticism'
  if (year < 1900) return 'realism'
  return 'modernism'
}

// ---------------------------------------------------------------------------------------------
// Subjects

const TERM_TO_SUBJECT = new Map<string, string>()
for (const s of SUBJECTS) for (const t of s.terms) TERM_TO_SUBJECT.set(t.toLowerCase(), s.value)

/** Maps AIC's noisy subject terms onto our curated list, deduplicated, in first-seen order. */
export function subjectsFor(terms: string[] | null | undefined): string[] {
  const out = new Set<string>()
  for (const t of terms ?? []) {
    const s = TERM_TO_SUBJECT.get(t.toLowerCase())
    if (s) out.add(s)
  }
  return [...out]
}

/**
 * Fallback for records with no subject terms at all (~85 of them): look for subject terms as
 * whole words in the title and description. Only used when `subjectsFor` finds nothing.
 */
export function subjectsFromText(text: string): string[] {
  const lower = text.toLowerCase()
  const out = new Set<string>()
  for (const [term, subject] of TERM_TO_SUBJECT) {
    if (term.length < 4 || term.includes(':') || term.includes('(')) continue
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\b`)
    if (re.test(lower)) out.add(subject)
  }
  return [...out]
}

// ---------------------------------------------------------------------------------------------
// Color

export type HSL = { h: number; s: number; l: number }

export function colorFamily({ h, s, l }: HSL): string {
  if (l < 15) return 'black'
  if (l > 88) return 'white'
  if (s < 8) return 'grey'
  if (h >= 10 && h < 50 && l < 50) return 'brown'
  if (h < 15 || h >= 340) return 'red'
  if (h < 45) return 'orange'
  if (h < 70) return 'yellow'
  if (h < 170) return 'green'
  if (h < 255) return 'blue'
  return 'purple'
}

export function hslToHex({ h, s, l }: HSL): string {
  const sat = s / 100
  const lig = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(lig, 1 - lig)
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------------------------
// Text

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

/** AIC text sometimes contains typographic ligatures (ﬁ, ﬂ) and stray HTML. */
export function cleanText(input?: string | null): string {
  if (!input) return ''
  return input
    .normalize('NFKC')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
