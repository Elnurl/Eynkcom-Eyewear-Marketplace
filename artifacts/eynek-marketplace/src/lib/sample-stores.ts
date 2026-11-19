import type { VitrineTheme } from '@workspace/api-client-react';

type SampleShape = 'Aviator' | 'Cat-Eye' | 'Rectangle' | 'Round' | 'Square' | 'Wayfarer';

export type SampleStoreProduct = {
  id: string;
  name: string;
  image: string;
  sideImage: string;
  vendor: string;
  vendorSlug: string;
  price: number;
  type: 'Gün eynəyi';
  gender: 'Uniseks';
  shape: SampleShape;
  material: string;
  size: string;
  color: string;
  tone: string;
  frameStyle: string;
  description: string;
  brand: string;
  stock: number;
  isAvailable: boolean;
  location: string;
};

export type SampleVendor = {
  slug: string;
  name: string;
  initials: string;
  location: string;
  since: string;
  description: string;
  logoPath?: string | null;
  instagram: string;
  website: string;
  vitrineTheme?: VitrineTheme | null;
  count: number;
};

const HORIZON_SLUG = 'horizon-optic-3f209b';

const horizonTheme: VitrineTheme = {
  skin: 'minimal',
  bgColor: '#f7f6f2',
  cardColor: '#ffffff',
  textColor: '#161614',
  accentColor: '#bfd630',
  fontFamily: 'manrope',
  heroMediaPath: 'home-redesign/hero-hand-glasses.jpg',
  heroOverlay: 0.22,
};

export const sampleVendors: SampleVendor[] = [
  {
    slug: HORIZON_SLUG,
    name: 'Horizon Optic',
    initials: 'HO',
    location: 'Bakı',
    since: '2024',
    description: 'Online optika · Ray-Ban, Oakley və seçilmiş brendlər',
    logoPath: null,
    instagram: 'horizonoptic',
    website: '',
    vitrineTheme: horizonTheme,
    count: 6,
  },
  {
    slug: 'demo-optik',
    name: 'Demo Optik',
    initials: 'DO',
    location: 'Bakı',
    since: '2025',
    description: 'EYNƏK vitrin nümunəsi — satış yoxdur',
    instagram: '',
    website: '',
    vitrineTheme: { skin: 'blush', fontFamily: 'playfair', heroOverlay: 0.35 },
    count: 0,
  },
];

function horizonProduct(
  id: string,
  name: string,
  brand: string,
  price: number,
  shape: SampleShape,
  front: string,
  side: string,
): SampleStoreProduct {
  return {
    id,
    name,
    brand,
    image: front,
    sideImage: side,
    vendor: 'Horizon Optic',
    vendorSlug: HORIZON_SLUG,
    price,
    type: 'Gün eynəyi',
    gender: 'Uniseks',
    shape,
    material: brand === 'Oakley' ? 'Bio-nylon' : 'Metal',
    size: 'M',
    color: brand === 'Ray-Ban' ? 'Qızılı' : 'Qara',
    tone: 'tone-1',
    frameStyle: 'sunglass',
    description: 'Lokal nümunə vitrin (API bağlı deyil).',
    stock: 3,
    isAvailable: true,
    location: 'Bakı',
  };
}

/** Shown when /api/stores və /api/products boşdur (lokal DB yox). */
export const sampleHorizonProducts: SampleStoreProduct[] = [
  horizonProduct(
    'demo-hz-oakley-236',
    'Oakley Holbrook OO9102',
    'Oakley',
    296,
    'Square',
    'product-images/horizon/oakley-oakley-holbrook-oo9102-910236-29-on.jpg',
    'product-images/horizon/oakley-oakley-holbrook-oo9102-910236-29-yan.jpg',
  ),
  horizonProduct(
    'demo-hz-ray-aviator',
    'Ray-Ban Aviator Classic RB3025',
    'Ray-Ban',
    325,
    'Aviator',
    'product-images/horizon/ray-ban-ray-ban-aviator-classic-rb3025-001-62-6-on.jpg',
    'product-images/horizon/ray-ban-ray-ban-aviator-classic-rb3025-001-62-6-yan.jpg',
  ),
  horizonProduct(
    'demo-hz-ray-wayfarer',
    'Ray-Ban Original Wayfarer RB2140',
    'Ray-Ban',
    285,
    'Wayfarer',
    'product-images/horizon/ray-ban-ray-ban-original-wayfarer-classic-rb2140-901-50-10-on.jpg',
    'product-images/horizon/ray-ban-ray-ban-original-wayfarer-classic-rb2140-901-50-10-yan.jpg',
  ),
  horizonProduct(
    'demo-hz-ray-hex',
    'Ray-Ban Hexagonal RB3548N',
    'Ray-Ban',
    265,
    'Round',
    'product-images/horizon/ray-ban-ray-ban-hexagonal-rb3548n-001-30-21-on.jpg',
    'product-images/horizon/ray-ban-ray-ban-hexagonal-rb3548n-001-30-21-yan.jpg',
  ),
  horizonProduct(
    'demo-hz-ray-round',
    'Ray-Ban Round Metal RB3447',
    'Ray-Ban',
    275,
    'Round',
    'product-images/horizon/ray-ban-ray-ban-round-metal-rb3447-920231-16-on.jpg',
    'product-images/horizon/ray-ban-ray-ban-round-metal-rb3447-920231-16-yan.jpg',
  ),
  horizonProduct(
    'demo-hz-oakley-prizm',
    'Oakley Holbrook Prizm Tungsten',
    'Oakley',
    310,
    'Square',
    'product-images/horizon/oakley-oakley-holbrook-oo9102-prizm-tungsten-polarized-30-on.jpg',
    'product-images/horizon/oakley-oakley-holbrook-oo9102-prizm-tungsten-polarized-30-yan.jpg',
  ),
];