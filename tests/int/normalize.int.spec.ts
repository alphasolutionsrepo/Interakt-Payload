import { describe, expect, it } from 'vitest'

import {
  centuryLabel,
  centuryNumber,
  cleanText,
  colorFamily,
  countryFor,
  eraFor,
  hslToHex,
  isCulture,
  movementFor,
  nationalityFrom,
  regionFor,
  slugify,
  subjectsFor,
  subjectsFromText,
} from '@/lib/normalize'

describe('dates', () => {
  it('computes centuries for CE and BCE years', () => {
    expect(centuryNumber(1884)).toBe(19)
    expect(centuryNumber(1900)).toBe(19)
    expect(centuryNumber(1901)).toBe(20)
    expect(centuryNumber(-450)).toBe(-5)
    expect(centuryNumber(0)).toBe(-1)
  })

  it('labels centuries with ordinals', () => {
    expect(centuryLabel(1884)).toBe('19th century')
    expect(centuryLabel(1250)).toBe('13th century')
    expect(centuryLabel(150)).toBe('2nd century')
    expect(centuryLabel(50)).toBe('1st century')
    expect(centuryLabel(-2100)).toBe('22nd century BCE')
    expect(centuryLabel(-1050)).toBe('11th century BCE')
  })

  it('assigns eras', () => {
    expect(eraFor(-1300)).toBe('ancient')
    expect(eraFor(800)).toBe('medieval')
    expect(eraFor(1650)).toBe('early-modern')
    expect(eraFor(1884)).toBe('19th-century')
    expect(eraFor(1921)).toBe('20th-century')
    expect(eraFor(undefined)).toBeUndefined()
  })
})

describe('places', () => {
  it('folds cities and historic regions into modern countries', () => {
    expect(countryFor('Paris')).toBe('France')
    expect(countryFor('Holland')).toBe('Netherlands')
    expect(countryFor('Athens')).toBe('Greece')
    expect(countryFor('New York City')).toBe('United States')
    expect(countryFor('Tenochtitlan')).toBe('Mexico')
    expect(countryFor(undefined)).toBeUndefined()
    expect(countryFor('Atlantis')).toBeUndefined()
  })

  it('maps countries to regions', () => {
    expect(regionFor('France')).toBe('europe')
    expect(regionFor('Egypt')).toBe('mena')
    expect(regionFor('Japan')).toBe('east-asia')
    expect(regionFor(undefined)).toBeUndefined()
  })
})

describe('artists', () => {
  it('distinguishes cultures from named artists', () => {
    expect(isCulture('Ancient Greek')).toBe(true)
    expect(isCulture('Maya')).toBe(true)
    expect(isCulture(null)).toBe(true)
    expect(isCulture('Claude Monet')).toBe(false)
  })

  it('parses nationality from the attribution line', () => {
    expect(nationalityFrom('Claude Monet\nFrench, 1840–1926')).toBe('French')
    expect(nationalityFrom('El Greco (Doménikos Theotokópoulos; Greek, active in Spain, 1541–1614)')).toBe('Greek')
    expect(nationalityFrom(undefined)).toBeUndefined()
  })
})

describe('movements', () => {
  it('prefers artist overrides, then style rules, then fallbacks', () => {
    expect(movementFor({ styles: ['Impressionism'], artist: 'Paul Gauguin' })).toBe('post-impressionism')
    expect(movementFor({ styles: ['Impressionism'] })).toBe('impressionism')
    expect(movementFor({ styles: ['Post-Impressionism', 'Impressionism'] })).toBe('post-impressionism')
    expect(movementFor({ styles: ['nineteenth century', 'new kingdom'] })).toBe('ancient-egypt')
    expect(movementFor({ styles: ['red-figure', 'attic'] })).toBe('ancient-greece')
    expect(movementFor({ styles: ['Mannerism', 'Renaissance'] })).toBe('renaissance')
    expect(movementFor({ styles: [], department: 'africa', country: 'Gabon', year: 1880 })).toBe('african-traditions')
    expect(movementFor({ styles: [], department: 'greece-rome-byzantium', country: 'Italy', year: 100 })).toBe('ancient-rome')
    expect(movementFor({ styles: [], year: 1650 })).toBe('baroque')
    expect(movementFor({ styles: [] })).toBeUndefined()
  })
})

describe('subjects', () => {
  it('maps noisy terms onto curated subjects and drops the rest', () => {
    expect(subjectsFor(['portraits', 'portrait', 'Century of Progress', "world's fairs", 'Clouds', 'sky'])).toEqual([
      'portraits',
      'sky-weather',
    ])
    expect(subjectsFor(null)).toEqual([])
  })

  it('infers subjects from text as whole words only', () => {
    expect(subjectsFromText('A horse and rider by the river')).toEqual(expect.arrayContaining(['horses', 'water']))
    expect(subjectsFromText('Seahorses')).toEqual([])
  })
})

describe('color', () => {
  it('buckets HSL into families', () => {
    expect(colorFamily({ h: 210, s: 60, l: 50 })).toBe('blue')
    expect(colorFamily({ h: 0, s: 70, l: 50 })).toBe('red')
    expect(colorFamily({ h: 30, s: 50, l: 30 })).toBe('brown')
    expect(colorFamily({ h: 30, s: 60, l: 60 })).toBe('orange')
    expect(colorFamily({ h: 100, s: 3, l: 50 })).toBe('grey')
    expect(colorFamily({ h: 100, s: 50, l: 5 })).toBe('black')
    expect(colorFamily({ h: 100, s: 50, l: 95 })).toBe('white')
  })

  it('converts HSL to hex', () => {
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000')
    expect(hslToHex({ h: 240, s: 100, l: 50 })).toBe('#0000ff')
    expect(hslToHex({ h: 0, s: 0, l: 100 })).toBe('#ffffff')
  })
})

describe('text', () => {
  it('slugifies titles', () => {
    expect(slugify('A Sunday on La Grande Jatte — 1884')).toBe('a-sunday-on-la-grande-jatte-1884')
    expect(slugify('Édouard Manet')).toBe('edouard-manet')
    expect(slugify('Arts & Crafts')).toBe('arts-and-crafts')
  })

  it('cleans ligatures, tags and whitespace', () => {
    expect(cleanText('<p>El Greco’s ﬁrst  major\ncommission</p>')).toBe('El Greco’s first major commission')
    expect(cleanText(null)).toBe('')
  })
})
