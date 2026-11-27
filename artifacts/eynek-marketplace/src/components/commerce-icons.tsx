import type { SVGProps } from 'react';

/** Home «virtual yoxla» üçün sadə həndəsi ikonlar — Lucide setindən fərqli. */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
    'aria-hidden': true as const,
    ...props,
  };
}

export function IconGlasses(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="7.2" cy="13" r="3.4" />
      <circle cx="16.8" cy="13" r="3.4" />
      <path d="M10.6 13h2.8" />
      <path d="M3.8 13H2.5M21.5 13h-1.3" />
    </svg>
  );
}

export function IconFaceScan(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 8.2V5.5h2.7M19 8.2V5.5h-2.7M5 15.8v2.7h2.7M19 15.8v2.7h-2.7" />
      <circle cx="9.2" cy="11.2" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="11.2" r="0.9" fill="currentColor" stroke="none" />
      <path d="M9.5 15c1.1 1.1 4 1.1 5 0" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 19 6.5v5.2c0 4.2-2.9 7.4-7 8.8-4.1-1.4-7-4.6-7-8.8V6.5L12 3.5Z" />
      <path d="M9.2 12.1 11.1 14l3.8-4.2" />
    </svg>
  );
}
