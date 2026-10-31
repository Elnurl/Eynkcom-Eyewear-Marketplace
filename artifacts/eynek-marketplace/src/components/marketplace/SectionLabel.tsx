import type { ReactNode } from 'react';

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mp-section-label">
      <span className="mp-section-dot" aria-hidden />
      {children}
    </p>
  );
}
