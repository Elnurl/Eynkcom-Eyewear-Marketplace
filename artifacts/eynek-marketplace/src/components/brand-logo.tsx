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

export function BrandWord() {
  return (
    <span className="brand-word">
      <img src={`${import.meta.env.BASE_URL}eynek-name.png`} width={135} height={37} alt="EYNƏK" />
    </span>
  );
}