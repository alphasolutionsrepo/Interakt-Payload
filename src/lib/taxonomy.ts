/**
 * Fixed vocabularies shared by the collection configs (select options) and the AIC normalizer.
 * Keeping them in one place guarantees that every value the seed writes is a valid option and a
 * clean facet value.
 */

export type Option = { label: string; value: string }

const opts = <const T extends readonly (readonly [string, string])[]>(pairs: T) =>
  pairs.map(([value, label]) => ({ value, label }))

export const DEPARTMENTS = opts([
  ['european-painting-sculpture', 'European Painting & Sculpture'],
  ['americas', 'Arts of the Americas'],
  ['greece-rome-byzantium', 'Greece, Rome & Byzantium'],
  ['africa', 'Arts of Africa'],
  ['asia', 'Arts of Asia'],
  ['european-decorative-arts', 'European Decorative Arts'],
  ['modern', 'Modern Art'],
  ['prints-drawings', 'Prints & Drawings'],
  ['architecture-design', 'Architecture & Design'],
  ['textiles', 'Textiles'],
])

export const ARTWORK_TYPES = opts([
  ['painting', 'Painting'],
  ['sculpture', 'Sculpture'],
  ['vessels-ceramics', 'Vessels & Ceramics'],
  ['coins', 'Coins'],
  ['costume-textiles', 'Costume & Textiles'],
  ['metalwork-armor', 'Metalwork & Armor'],
  ['architecture', 'Architecture'],
  ['furniture-decorative', 'Furniture & Decorative Arts'],
  ['miniature-rooms', 'Miniature Rooms'],
  ['prints-drawings', 'Prints & Drawings'],
  ['ritual-funerary', 'Ritual & Funerary Objects'],
])

export const REGIONS = opts([
  ['europe', 'Europe'],
  ['north-america', 'North America'],
  ['latin-america', 'Latin America'],
  ['africa', 'Africa'],
  ['mena', 'Middle East & North Africa'],
  ['east-asia', 'East Asia'],
  ['south-southeast-asia', 'South & Southeast Asia'],
])

export const ERAS = opts([
  ['ancient', 'Ancient (before 500)'],
  ['medieval', 'Medieval (500–1399)'],
  ['early-modern', 'Early Modern (1400–1799)'],
  ['19th-century', '19th Century'],
  ['20th-century', '20th Century'],
])

export const COLOR_FAMILIES = opts([
  ['red', 'Red'],
  ['orange', 'Orange'],
  ['yellow', 'Yellow'],
  ['green', 'Green'],
  ['blue', 'Blue'],
  ['purple', 'Purple'],
  ['brown', 'Brown'],
  ['black', 'Black'],
  ['grey', 'Grey'],
  ['white', 'White'],
])

export const STORY_CATEGORIES = opts([
  ['essay', 'Essay'],
  ['close-look', 'Close Look'],
  ['artist-profile', 'Artist Profile'],
  ['collection-notes', 'Collection Notes'],
])

/** Movements are a collection (they have pages and descriptions); these are their slugs. */
export const MOVEMENTS = opts([
  ['ancient-egypt', 'Ancient Egypt'],
  ['ancient-greece', 'Ancient Greece'],
  ['ancient-rome', 'Ancient Rome & Etruria'],
  ['ancient-americas', 'Ancient Americas'],
  ['african-traditions', 'African Traditions'],
  ['east-asian', 'East Asian Art'],
  ['south-asian', 'South & Southeast Asian Art'],
  ['islamic', 'Islamic Art'],
  ['medieval', 'Byzantine & Medieval'],
  ['renaissance', 'Renaissance & Mannerism'],
  ['baroque', 'Baroque'],
  ['rococo-neoclassicism', 'Rococo & Neoclassicism'],
  ['romanticism', 'Romanticism'],
  ['realism', 'Realism'],
  ['impressionism', 'Impressionism'],
  ['post-impressionism', 'Post-Impressionism'],
  ['arts-and-crafts', 'Arts & Crafts and Art Nouveau'],
  ['early-american', 'Early American'],
  ['modernism', 'Modernism'],
])

/** Subjects are a collection too; each has the raw AIC terms that map onto it. */
export const SUBJECTS: { value: string; label: string; terms: string[] }[] = [
  { value: 'portraits', label: 'Portraits', terms: ['portraits', 'portrait', 'portraits: female subject', 'portraits: male subject', 'faces', 'self-portraits'] },
  { value: 'landscapes', label: 'Landscapes', terms: ['landscapes', 'landscape', 'hills', 'mountains', 'fields', 'countryside'] },
  { value: 'water', label: 'Water & the Sea', terms: ['water', 'river', 'rivers', 'beach', 'sea', 'ocean', 'waves', 'seascapes', 'harbors', 'lakes', 'reflections'] },
  { value: 'boats', label: 'Boats & Sailing', terms: ['boats', 'sailing', 'ships', 'sailboats'] },
  { value: 'sky-weather', label: 'Sky & Weather', terms: ['clouds', 'sky', 'weather/seasons', 'snow', 'sunset', 'rain', 'fog'] },
  { value: 'trees-plants', label: 'Trees & Plants', terms: ['trees', 'foliage', 'bushes', 'plants', 'forests', 'plant-derived motif'] },
  { value: 'flowers-gardens', label: 'Flowers & Gardens', terms: ['flowers', 'garden', 'gardens'] },
  { value: 'animals', label: 'Animals', terms: ['animals', 'dog', 'dogs', 'cows', 'lions', 'cats', 'cat', 'monkeys', 'sheep', 'bulls', 'snakes', 'fish'] },
  { value: 'birds', label: 'Birds', terms: ['birds', 'bird'] },
  { value: 'horses', label: 'Horses', terms: ['horse', 'horses'] },
  { value: 'still-life', label: 'Still Life', terms: ['still life', 'fruit', 'apples', 'vase'] },
  { value: 'food-drink', label: 'Food & Drink', terms: ['drinking', 'dining', 'food', 'wine'] },
  { value: 'christianity', label: 'Christian Art', terms: ['Christianity', 'Christian subjects', 'biblical', 'religious scenes', 'saints', 'Jesus', 'Virgin Mary', 'angels', 'crucifixions', 'Virgin and child/Madonna and child', 'cherubs', 'Saint John the Baptist', 'friars'] },
  { value: 'mythology', label: 'Myth & Gods', terms: ['mythology', 'mythological figures', 'gods (deities)', 'goddesses', 'Greek mythology', 'cupids', 'heroes'] },
  { value: 'women', label: 'Women', terms: ['women', 'woman', 'girl', 'girls'] },
  { value: 'children-family', label: 'Children & Family', terms: ['children', 'families', 'mothers', 'babies', 'woman with children', 'boys', 'child'] },
  { value: 'everyday-life', label: 'Everyday Life', terms: ['everyday life (genre)', 'domestic scenes', 'work', 'rural life', 'labor'] },
  { value: 'leisure', label: 'Leisure', terms: ['leisure', 'entertainment', 'games', 'picnics'] },
  { value: 'city-life', label: 'City Life', terms: ['urban life', 'towns', 'cities', 'streets', 'cityscapes'] },
  { value: 'architecture', label: 'Architecture', terms: ['building', 'buildings', 'architecture', 'architechture', 'bridge', 'bridges', 'churches'] },
  { value: 'interiors', label: 'Interiors', terms: ['interior', 'interiors', 'furniture', 'chairs', 'chair'] },
  { value: 'fashion', label: 'Fashion & Dress', terms: ['fashion', 'dresses', 'costume', 'hat', 'hats'] },
  { value: 'nudes', label: 'The Nude', terms: ['nudes', 'nude'] },
  { value: 'death-afterlife', label: 'Death & Afterlife', terms: ['death', 'funerary art', 'mummies', 'tombs', 'afterlife'] },
  { value: 'war-weapons', label: 'War & Weapons', terms: ['weapons', 'soldiers', 'swords', 'armor', 'shields', 'helmets', 'violence', 'battles', 'war'] },
  { value: 'music-dance', label: 'Music & Dance', terms: ['musical instruments', 'instruments', 'dancers', 'dance', 'music', 'musicians'] },
  { value: 'love', label: 'Love', terms: ['love', 'romance', 'couples'] },
  { value: 'ritual', label: 'Ritual & Worship', terms: ['ritual', 'rituals', 'offering', 'ancestors', 'Devotion', 'religion', 'religious', 'religious figures'] },
  { value: 'writing', label: 'Writing & Script', terms: ['Hieroglyphs', 'writing', 'calligraphy', 'inscriptions'] },
  { value: 'adornment', label: 'Jewelry & Adornment', terms: ['jewelry', 'beads', 'headdresses', 'luxury'] },
]

export const labelFor = (list: readonly Option[], value?: string | null) =>
  list.find((o) => o.value === value)?.label ?? value ?? ''
