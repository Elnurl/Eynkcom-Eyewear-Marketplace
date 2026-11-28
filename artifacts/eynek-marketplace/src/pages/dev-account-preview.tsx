import { useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { Link } from 'wouter';
import { AccountHeroAvatar } from '@/components/account-hero-avatar';

const samplePortrait = `${import.meta.env.BASE_URL}home-redesign/hero-hand-glasses.jpg`;

/**
 * Lokal UI önizləməsi — API/DB olmadan hesab hero və avatarı yoxlamaq üçün.
 * Yalnız development rejimində marşrut aktivdir.
 */
export function DevAccountPreviewPage() {
  const [imagePath, setImagePath] = useState('');
  const [sampleSrc, setSampleSrc] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  return (
    <main className="account-page">
      <section className="account-hero-section" style={{ paddingTop: 12 }}>
        <div className="container">
          <DevPreviewBanner />
        </div>
      </section>

      <section className="account-hero-section">
        <div className="container account-hero">
          <div className="account-hero-content">
            <span className="account-overline">Hesabım · nümunə</span>
            <div className="account-dev-preview-controls account-dev-preview-controls--in-hero">
              <button
                type="button"
                className="btn account-cta"
                onClick={() => {
                  setSampleSrc(null);
                  setImagePath('');
                  setNotice('Placeholder (şəkilsiz) rejimi.');
                }}
              >
                Boş avatar
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setSampleSrc(samplePortrait);
                  setImagePath('');
                  setNotice('Nümunə şəkil — canlıda API ilə saxlanır.');
                }}
              >
                Şəkilli nümunə
              </button>
            </div>
            {notice ? <p className="account-dev-preview-note">{notice}</p> : null}
            <h1>Salam, Leyla.</h1>
            <p className="account-hero-sub">
              demo@eynek.az ilə daxil olmusunuz (fake məlumat). Sifarişləriniz və seçimləriniz burada.
            </p>
            <div className="account-hero-actions">
              <Link href="/collection" className="btn account-cta">
                Eynəkləri kəşf et <ArrowRight size={16} />
              </Link>
              <span className="account-text-action">Hesabdan çıx</span>
            </div>
          </div>
          <AccountHeroAvatar
            imagePath={imagePath}
            sampleSrc={sampleSrc}
            localPreviewOnly
            canUpload
            displayName="Leyla Nümunə"
            onImagePath={setImagePath}
            onError={(message) => setNotice(message)}
          />
        </div>
      </section>
    </main>
  );
}

function DevPreviewBanner() {
  return (
    <div className="account-dev-preview-banner">
      <Info size={16} />
      <span>
        Lokal önizləmə (fake hesab). Yadda saxlamaq üçün <code>.env</code>-ə <code>DATABASE_URL</code> yazıb{' '}
        <code>pnpm dev:api</code> işə salın — sonra <Link href="/account" className="text-link">/account</Link>.
      </span>
    </div>
  );
}