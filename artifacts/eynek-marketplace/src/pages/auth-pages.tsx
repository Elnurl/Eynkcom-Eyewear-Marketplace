import { type FormEvent, type ReactNode, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { AlertCircle, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { BrandLogo } from '@/components/brand-logo';
import { authClient, authErrorMessage, googleSignInEnabled } from '@/lib/auth-client';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const SAFE_TARGETS = ['/account', '/seller', '/seller-panel', '/seller-orders', '/seller-admin', '/seller-admin/orders'];

function useSafeTarget(): string {
  const requested = new URLSearchParams(useSearch()).get('redirect_url');
  return requested && SAFE_TARGETS.includes(requested) ? requested : '/account';
}

function AuthShell({ title, lead, children, footer }: { title: string; lead: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="seller-auth-page">
      <div className="seller-auth-container">
        <div className="seller-auth-header">
          <Link href="/" className="brand" data-testid="link-auth-brand"><BrandLogo /></Link>
          <h1 style={{ marginTop: 26 }}>{title}</h1>
          <p>{lead}</p>
        </div>
        {children}
        {footer && <div className="seller-auth-footer">{footer}</div>}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return <div className="auth-error" role="alert"><AlertCircle size={16} /><span>{message}</span></div>;
}

function NoteBox({ children }: { children: ReactNode }) {
  return <div className="auth-note" role="status"><Check size={16} /><span>{children}</span></div>;
}

function TextField({ id, label, type = 'text', value, onChange, autoComplete }: { id: string; label: string; type?: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} required value={value} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} data-testid={`input-${id}`} />
    </div>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete }: { id: string; label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input-wrapper">
        <input id={id} type={visible ? 'text' : 'password'} required minLength={8} value={value} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} data-testid={`input-${id}`} />
        <button type="button" className="password-toggle" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Şifrəni gizlət' : 'Şifrəni göstər'}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function GoogleButton({ target }: { target: string }) {
  const [error, setError] = useState('');
  if (!googleSignInEnabled) return null;
  const start = async () => {
    setError('');
    const { error: signInError } = await authClient.signIn.social({ provider: 'google', callbackURL: `${basePath}${target}` });
    if (signInError) setError(authErrorMessage(signInError));
  };
  return (
    <>
      <div className="auth-divider">və ya</div>
      <ErrorBox message={error} />
      <button type="button" className="btn btn-full btn-secondary" onClick={() => void start()} data-testid="button-google-sign-in">Google ilə davam et</button>
    </>
  );
}

export function SignInPage() {
  const target = useSafeTarget();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setPending(true);
    const { error: signInError } = await authClient.signIn.email({ email: email.trim(), password, callbackURL: `${basePath}${target}` });
    setPending(false);
    if (signInError) {
      setError(authErrorMessage(signInError));
      return;
    }
    queryClient.clear();
    setLocation(target);
  };

  return (
    <AuthShell
      title="Daxil ol"
      lead="EYNƏK.com hesabınla sifarişlərini izlə və ya mağazanı idarə et."
      footer={<>Hesabın yoxdur?<Link href={`/sign-up?redirect_url=${encodeURIComponent(target)}`} data-testid="link-to-sign-up">Hesab yarat</Link></>}
    >
      <ErrorBox message={error} />
      <form className="seller-auth-form" onSubmit={submit}>
        <TextField id="sign-in-email" label="E-poçt" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <PasswordField id="sign-in-password" label="Şifrə" value={password} onChange={setPassword} autoComplete="current-password" />
        <Link href="/forgot-password" className="auth-inline-link" data-testid="link-forgot-password">Şifrəni unutmusan?</Link>
        <button className="btn btn-full btn-blue" type="submit" disabled={pending} data-testid="button-sign-in">
          {pending ? 'Yoxlanılır...' : 'Daxil ol'} <ArrowRight size={16} />
        </button>
      </form>
      <GoogleButton target={target} />
    </AuthShell>
  );
}

export function SignUpPage() {
  const target = useSafeTarget();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setPending(true);
    const { error: signUpError } = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password, callbackURL: `${basePath}${target}` });
    setPending(false);
    if (signUpError) {
      setError(authErrorMessage(signUpError));
      return;
    }
    setSentTo(email.trim());
  };

  return (
    <AuthShell
      title="Hesab yarat"
      lead="Hesab açmaq məcburi deyil: qonaq kimi də sifariş verə bilərsən."
      footer={<>Artıq hesabın var?<Link href={`/sign-in?redirect_url=${encodeURIComponent(target)}`} data-testid="link-to-sign-in">Daxil ol</Link></>}
    >
      {sentTo ? (
        <NoteBox>Təsdiq linkini <strong>{sentTo}</strong> ünvanına göndərdik. Linkə keçəndən sonra hesabın aktivləşəcək.</NoteBox>
      ) : (
        <>
          <ErrorBox message={error} />
          <form className="seller-auth-form" onSubmit={submit}>
            <TextField id="sign-up-name" label="Ad və soyad" value={name} onChange={setName} autoComplete="name" />
            <TextField id="sign-up-email" label="E-poçt" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <PasswordField id="sign-up-password" label="Şifrə (ən azı 8 simvol)" value={password} onChange={setPassword} autoComplete="new-password" />
            <button className="btn btn-full btn-blue" type="submit" disabled={pending} data-testid="button-sign-up">
              {pending ? 'Yaradılır...' : 'Hesab yarat'} <ArrowRight size={16} />
            </button>
          </form>
          <GoogleButton target={target} />
        </>
      )}
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setPending(true);
    const { error: requestError } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: `${window.location.origin}${basePath}/reset-password`,
    });
    setPending(false);
    if (requestError) {
      setError(authErrorMessage(requestError));
      return;
    }
    setSent(true);
  };

  return (
    <AuthShell
      title="Şifrəni bərpa et"
      lead="E-poçtunu yaz, şifrəni yeniləmək üçün link göndərək."
      footer={<>Şifrəni xatırladın?<Link href="/sign-in" data-testid="link-back-sign-in">Daxil ol</Link></>}
    >
      {sent ? (
        <NoteBox>Bu e-poçtla hesab varsa, şifrə yeniləmə linki göndərildi.</NoteBox>
      ) : (
        <>
          <ErrorBox message={error} />
          <form className="seller-auth-form" onSubmit={submit}>
            <TextField id="forgot-email" label="E-poçt" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <button className="btn btn-full btn-blue" type="submit" disabled={pending} data-testid="button-forgot-password">
              {pending ? 'Göndərilir...' : 'Link göndər'} <ArrowRight size={16} />
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const params = new URLSearchParams(useSearch());
  const token = params.get('token') ?? '';
  const linkError = params.get('error');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(linkError || !token ? authErrorMessage({ code: 'INVALID_TOKEN' }) : '');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setPending(true);
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (resetError) {
      setError(authErrorMessage(resetError));
      return;
    }
    setDone(true);
  };

  return (
    <AuthShell
      title="Yeni şifrə"
      lead="Hesabın üçün yeni şifrə təyin et."
      footer={<><Link href="/sign-in" data-testid="link-reset-sign-in">Daxil ol</Link></>}
    >
      {done ? (
        <NoteBox>Şifrən yeniləndi. İndi yeni şifrə ilə daxil ola bilərsən.</NoteBox>
      ) : (
        <>
          <ErrorBox message={error} />
          {token && !linkError ? (
            <form className="seller-auth-form" onSubmit={submit}>
              <PasswordField id="reset-password" label="Yeni şifrə (ən azı 8 simvol)" value={password} onChange={setPassword} autoComplete="new-password" />
              <button className="btn btn-full btn-blue" type="submit" disabled={pending} data-testid="button-reset-password">
                {pending ? 'Yenilənir...' : 'Şifrəni yenilə'} <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <Link href="/forgot-password" className="btn btn-full btn-secondary" data-testid="link-request-new-reset">Yeni link istə</Link>
          )}
        </>
      )}
    </AuthShell>
  );
}
