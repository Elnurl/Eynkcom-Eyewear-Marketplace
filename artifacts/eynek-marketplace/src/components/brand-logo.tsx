export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <span className="brand-lockup">
      <img className="brand-mark" src={`${import.meta.env.BASE_URL}eynek-mark.png`} width={555} height={214} alt="" />
      <img
        className={`brand-image ${className}`.trim()}
        src={`${import.meta.env.BASE_URL}eynek-name.png`}
        width={476}
        height={86}
        alt="EYNƏK"
      />
    </span>
  );
}

export function BrandWord() {
  return (
    <span className="brand-word">
      <img src={`${import.meta.env.BASE_URL}eynek-name.png`} width={476} height={86} alt="EYNƏK" />
    </span>
  );
}