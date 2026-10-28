export const pets = [
  { id: 'flori', name: 'Flori', description: 'Flor del bosque' },
  { id: 'musguito', name: 'Musguito', description: 'Suave como el musgo' },
  { id: 'seti', name: 'Seti', description: 'Refugio de honguito' },
  { id: 'lumi', name: 'Lumi', description: 'Luz del atardecer' },
  { id: 'semillin', name: 'Semillín', description: 'Un brote por descubrir' },
] as const

export type PetId = typeof pets[number]['id']
export const isPetId = (value: unknown): value is PetId => pets.some(pet => pet.id === value)
export const findPet = (id: PetId) => pets.find(pet => pet.id === id)!
