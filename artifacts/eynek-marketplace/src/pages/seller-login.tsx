import { useEffect } from 'react';
import { useLocation, Link, useSearch } from 'wouter';
import { ArrowRight, Store, AlertCircle } from 'lucide-react';
import { useAuth } from '@workspace/replit-auth-web';
import { BrandLogo, BrandWord } from '@/components/brand-logo';

export default function SellerLogin() {
  const auth = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const requestedReturnTo = new URLSearchParams(search).get('returnTo');
  const returnTo = requestedReturnTo === '/seller-admin' ? '/seller-admin' : '/seller-panel';

  useEffect(() => {
    if (auth.isAuthenticated) setLocation(returnTo);
  }, [auth.isAuthenticated, returnTo, setLocation]);

  if (auth.isLoading || auth.isAuthenticated) return null;

  return (
    <div className="seller-auth-page">
      <div className="seller-auth-container">
        <div className="seller-auth-header">
          <Link href="/" className="brand" data-testid="link-brand-login"><BrandLogo /></Link>
          <div className="eyebrow" style={{ marginTop: '30px' }}>Satıcı Paneli</div>
          <h1>Təhlükəsiz giriş</h1>
          <p>Mağazanı idarə etmək üçün satıcı hesabınızla daxil olun. Panel yalnız təsdiqlənmiş mağaza sahibləri üçün açıqdır.</p>
        </div>
        <div className="auth-error" role="note">
          <AlertCircle size={16} />
          <span>Demo şifrə ilə giriş söndürülüb. Giriş EYNƏK.com-un təsdiqlənmiş hesabı ilə yoxlanılır.</span>
        </div>
        <button className="btn btn-full btn-blue" onClick={() => auth.login(returnTo)} data-testid="button-login-submit">
          <Store size={16} /> Hesabla daxil ol <ArrowRight size={16} />
        </button>
        <div className="seller-auth-footer">
          Hələ satıcı deyilsən? <Link href="/seller" data-testid="link-login-to-register"><BrandWord />-də sat</Link>
        </div>
      </div>
    </div>
  );
}