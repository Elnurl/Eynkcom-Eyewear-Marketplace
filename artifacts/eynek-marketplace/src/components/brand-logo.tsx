export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <img
      className={`brand-image ${className}`.trim()}
      src={`${import.meta.env.BASE_URL}eynek-wordmark.png`}
      width={776}
      height={86}
      alt="EYNƏK.com"
    />
  );
}