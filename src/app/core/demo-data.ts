import { Category, Currency, Priority } from './models';

/**
 * Seed for demo mode. Photographs are licensed Wikimedia Commons stand-ins (credited in the
 * footer while demo mode is on); in production the owner uploads her own.
 */
export const DEMO_ACCOUNTS = {
  owner: { email: 'yo@demo.test', password: 'navidad', displayName: 'Yo' },
  family: { email: 'mama@demo.test', password: 'navidad', displayName: 'Mamá' },
  family2: { email: 'tio@demo.test', password: 'navidad', displayName: 'Tío Javier' },
};
/** A pre-made, valid invitation so the register flow can be tried in demo mode. */
export const DEMO_INVITE_TOKEN = 'demo-invitacion-navidad';

export const DEMO_CATEGORIES: Category[] = [
  { id: 'c-belleza', name: 'Belleza', slug: 'belleza', sortOrder: 0 },
  { id: 'c-hogar', name: 'Hogar', slug: 'hogar', sortOrder: 1 },
  { id: 'c-accesorios', name: 'Accesorios', slug: 'accesorios', sortOrder: 2 },
  { id: 'c-papeleria', name: 'Papelería', slug: 'papeleria', sortOrder: 3 },
  { id: 'c-moda', name: 'Moda', slug: 'moda', sortOrder: 4 },
  { id: 'c-tecnologia', name: 'Tecnología', slug: 'tecnologia', sortOrder: 5 },
];

interface SeedGift {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: Currency;
  photo: string;
  purchaseUrl: string;
  categoryId: string;
  priority: Priority;
  isFavorite: boolean;
  reservedBy?: keyof typeof DEMO_ACCOUNTS;
}

export const DEMO_GIFTS: SeedGift[] = [
  {
    id: 'g-atomizador',
    name: 'Atomizador de cristal cobalto',
    description: 'Cristal tallado con pera de seda, para el tocador. Me encanta cómo atrapa la luz por la mañana.',
    price: 68,
    currency: 'EUR',
    photo: 'atomiser',
    purchaseUrl: 'https://example.com/atomizador',
    categoryId: 'c-belleza',
    priority: 'high',
    isFavorite: true,
  },
  {
    id: 'g-vela',
    name: 'Vela de higo y cedro',
    description: 'Vaso de escayola, cera de soja y unas cuarenta horas de llama. Para las tardes de lectura.',
    price: 42,
    currency: 'EUR',
    photo: 'candle',
    purchaseUrl: 'https://example.com/vela',
    categoryId: 'c-hogar',
    priority: 'medium',
    isFavorite: true,
    reservedBy: 'family2',
  },
  {
    id: 'g-reloj',
    name: 'Reloj de esfera crema',
    description: 'Caja fina, correa de malla de acero y sin números. Discreto para llevarlo todos los días.',
    price: 189,
    currency: 'EUR',
    photo: 'watch',
    purchaseUrl: 'https://example.com/reloj',
    categoryId: 'c-accesorios',
    priority: 'high',
    isFavorite: true,
  },
  {
    id: 'g-pluma',
    name: 'Pluma estilográfica de plumín dorado',
    description: 'Plumín medio y resina negra. Para escribir las tarjetas de Navidad del año que viene.',
    price: 145,
    currency: 'EUR',
    photo: 'pen',
    purchaseUrl: 'https://example.com/pluma',
    categoryId: 'c-papeleria',
    priority: 'medium',
    isFavorite: true,
  },
  {
    id: 'g-ambar',
    name: 'Eau de parfum de ámbar',
    description: 'Cálido y resinoso, en un estuche lacado. Huele a invierno.',
    price: 120,
    currency: 'EUR',
    photo: 'amber',
    purchaseUrl: 'https://example.com/ambar',
    categoryId: 'c-belleza',
    priority: 'low',
    isFavorite: false,
  },
  {
    id: 'g-tetera',
    name: 'Tetera de porcelana pintada',
    description: 'Rosas pintadas a mano; caben cuatro tazas. Para los domingos largos.',
    price: 85,
    currency: 'EUR',
    photo: 'teapot',
    purchaseUrl: 'https://example.com/tetera',
    categoryId: 'c-hogar',
    priority: 'medium',
    isFavorite: false,
  },
  {
    id: 'g-cartera',
    name: 'Cartera de cuero repujado',
    description: 'Curtido vegetal y hebilla de latón. Cabe un libro y poco más, que es lo que quiero.',
    price: 240,
    currency: 'EUR',
    photo: 'satchel',
    purchaseUrl: 'https://example.com/cartera',
    categoryId: 'c-accesorios',
    priority: 'high',
    isFavorite: false,
  },
  {
    id: 'g-cascos',
    name: 'Auriculares de diadema',
    description: 'Con cable y almohadillas de piel. Para el tren y para concentrarme.',
    price: 199,
    currency: 'EUR',
    photo: 'headphones',
    purchaseUrl: 'https://example.com/auriculares',
    categoryId: 'c-tecnologia',
    priority: 'low',
    isFavorite: false,
    reservedBy: 'family',
  },
  {
    id: 'g-bufanda',
    name: 'Bufanda de lana cereza',
    description: 'Larga, con flecos, del color del lazo. Para enero.',
    price: 75,
    currency: 'EUR',
    photo: 'scarf',
    purchaseUrl: 'https://example.com/bufanda',
    categoryId: 'c-moda',
    priority: 'medium',
    isFavorite: false,
  },
];

export const DEMO_PHOTO_CREDITS =
  'Fotografías de muestra de Wikimedia Commons: Takkk, DDupard, Lilylily1407, Anton Ehrola, Trougnouf, Cleveland Museum of Art, PJ, Antonio Litterio, Bettenburg (CC BY-SA, CC BY, CC0, dominio público).';
