import type { VitrineTheme } from '@workspace/api-client-react';

export type VitrineThemeForm = {
  skin: NonNullable<VitrineTheme['skin']>;
  bgColor: string;
  cardColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: NonNullable<VitrineTheme['fontFamily']>;
  heroMediaPath: string | null;
  heroOverlay: number;
};

export const VITRINE_SKINS: Record<
  NonNullable<VitrineTheme['skin']>,
  Pick<VitrineThemeForm, 'bgColor' | 'cardColor' | 'textColor' | 'accentColor'>
> = {
  minimal: { bgColor: '#f7f6f2', cardColor: '#ffffff', textColor: '#161614', accentColor: '#bfd630' },
  dark: { bgColor: '#121212', cardColor: '#1c1c1c', textColor: '#f4f4f0', accentColor: '#bfd630' },
  ink: { bgColor: '#e8e6df', cardColor: '#faf9f5', textColor: '#111111', accentColor: '#111111' },
  blush: { bgColor: '#f8ece8', cardColor: '#fff8f5', textColor: '#2a1f1c', accentColor: '#c47a6a' },
};

export const VITRINE_FONTS: Array<{ id: NonNullable<VitrineTheme['fontFamily']>; label: string; css: string }> = [
  { id: 'manrope', label: 'Manrope', css: '"Manrope", system-ui, sans-serif' },
  { id: 'playfair', label: 'Playfair', css: '"Playfair Display", Georgia, serif' },
  { id: 'bebas', label: 'Bebas', css: '"Bebas Neue", Impact, sans-serif' },
  { id: 'space', label: 'Space Grotesk', css: '"Space Grotesk", system-ui, sans-serif' },
];

export const DEFAULT_VITRINE_THEME: VitrineThemeForm = {
  skin: 'minimal',
  ...VITRINE_SKINS.minimal,
  fontFamily: 'manrope',
  heroMediaPath: null,
  heroOverlay: 0.28,
};

export function normalizeVitrineTheme(theme?: VitrineTheme | null): VitrineThemeForm {
  const skin = theme?.skin && VITRINE_SKINS[theme.skin] ? theme.skin : 'minimal';
  const base = VITRINE_SKINS[skin];
  return {
    skin,
    bgColor: theme?.bgColor || base.bgColor,
    cardColor: theme?.cardColor || base.cardColor,
    textColor: theme?.textColor || base.textColor,
    accentColor: theme?.accentColor || base.accentColor,
    fontFamily: theme?.fontFamily && VITRINE_FONTS.some((f) => f.id === theme.fontFamily) ? theme.fontFamily : 'manrope',
    heroMediaPath: theme?.heroMediaPath ?? null,
    heroOverlay: typeof theme?.heroOverlay === 'number' ? Math.min(0.85, Math.max(0, theme.heroOverlay)) : 0.28,
  };
}

export function fontCss(id: VitrineThemeForm['fontFamily']) {
  return VITRINE_FONTS.find((font) => font.id === id)?.css ?? VITRINE_FONTS[0].css;
}
