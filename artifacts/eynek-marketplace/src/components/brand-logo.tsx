export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <img
      className={`brand-image ${className}`.trim()}
      src={`${import.meta.env.BASE_URL}eynek-name.png`}
      width={135}
      height={37}
      alt="EYNƏK"
    />
  );
}

export function BrandFooterLogo({ className = '' }: { className?: string }) {
  return (
    <img
      className={`brand-image brand-image--footer ${className}`.trim()}
      src={`${import.meta.env.BASE_URL}eynek-wordmark-light.png`}
      width={117}
      height={22}
      alt="EYNƏK"
    />
  );
}

/** Mətndə ("EYNƏK-də" və s.) — şəkil yox, eyni sətirdə düzgün hizalanmış yazı */
export function BrandWord({ className = '' }: { className?: string }) {
  return (
    <span className={`brand-name ${className}`.trim()} aria-label="EYNƏK">
      EYNƏK
    </span>
  );
}