import { useEffect, useState, FormEvent } from 'react';
import { useLocation, Link } from 'wouter';
import { ArrowRight, Store, KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useDemoSeller } from '@/hooks/use-demo-seller';
import { BrandLogo } from '@/components/brand-logo';

export default function SellerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { login, session } = useDemoSeller();

  useEffect(() => {
    if (session.authenticated) setLocation('/seller-panel');
  }, [session.authenticated, setLocation]);

  if (session.authenticated) return null;

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (email === 'seller@eynek.az' && password === 'Demo1234') {
      login(email, 'Nümunə Optika');
      setLocation('/seller-panel');
    } else {
      setError('E-poçt və ya şifrə yanlışdır. Nümunə məlumatlardan istifadə edin.');
    }
  };

  const fillDemoCredentials = () => {
    setEmail('seller@eynek.az');
    setPassword('Demo1234');
    setError('');
  };

  return (
    <div className="seller-auth-page">
      <div className="seller-auth-container">
        <div className="seller-auth-header">
          <Link href="/" className="brand" data-testid="link-brand-login">
            <BrandLogo />
          </Link>
          <div className="eyebrow" style={{ marginTop: '30px' }}>Satıcı Paneli</div>
          <h1>Hesaba daxil ol</h1>
          <p>Mağazanı idarə etmək və məhsulları əlavə etmək üçün daxil ol.</p>
        </div>

        <div className="seller-auth-demo-box" data-testid="demo-credentials-box">
          <div className="demo-box-icon"><KeyRound size={20} /></div>
          <div className="demo-box-content">
            <h3>Nümunə hesab</h3>
            <p>Bu, yalnız sınaq məqsədli demo mühitidir.</p>
            <div className="demo-credentials">
              <span><strong>E-poçt:</strong> seller@eynek.az</span>
              <span><strong>Şifrə:</strong> Demo1234</span>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary btn-fill-demo" 
            onClick={fillDemoCredentials}
            data-testid="button-fill-demo"
          >
            Məlumatları doldur
          </button>
        </div>

        <form className="seller-auth-form" onSubmit={handleLogin}>
          {error && (
            <div className="auth-error" data-testid="status-login-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          
          <div className="field">
            <label htmlFor="login-email">E-poçt ünvanı</label>
            <input 
              id="login-email" 
              type="email" 
              autoComplete="username"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="nümunə@eynek.az"
              required 
              data-testid="input-login-email"
            />
          </div>
          
          <div className="field">
            <label htmlFor="login-password">Şifrə</label>
            <div className="password-input-wrapper">
              <input 
                id="login-password" 
                type={showPassword ? "text" : "password"} 
                autoComplete="current-password"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                required 
                data-testid="input-login-password"
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Şifrəni gizlət" : "Şifrəni göstər"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-full btn-blue" data-testid="button-login-submit">
            Daxil ol <ArrowRight size={16} />
          </button>
        </form>
        
        <div className="seller-auth-footer">
          Hələ satıcı deyilsən? <Link href="/seller" data-testid="link-login-to-register">EYNƏK-də sat</Link>
        </div>
      </div>
    </div>
  );
}
