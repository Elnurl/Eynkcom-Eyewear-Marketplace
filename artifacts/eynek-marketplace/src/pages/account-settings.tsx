import { type FormEvent, useEffect, useState } from 'react';
import { CreditCard, MapPin, Settings } from 'lucide-react';
import { authClient, authErrorMessage } from '@/lib/auth-client';

export type BuyerProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  deliveryArea: 'Bakı' | 'Abşeron';
  deliveryAddress: string;
};

const emptyProfile = (email: string): BuyerProfile => ({
  firstName: '',
  lastName: '',
  email,
  phone: '',
  deliveryArea: 'Bakı',
  deliveryAddress: '',
});

async function readError(response: Response) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error || 'Yadda saxlamaq alınmadı.';
}

export function useBuyerProfile(userId: string | null, email: string) {
  const [profile, setProfile] = useState<BuyerProfile>(() => emptyProfile(email));
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    setReady(false);
    void fetch('/api/account/profile', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response));
        return response.json() as Promise<BuyerProfile>;
      })
      .then((loaded) => {
        if (ignore) return;
        setProfile({
          firstName: loaded.firstName ?? '',
          lastName: loaded.lastName ?? '',
          email: loaded.email || email,
          phone: loaded.phone ?? '',
          deliveryArea: loaded.deliveryArea === 'Abşeron' ? 'Abşeron' : 'Bakı',
          deliveryAddress: loaded.deliveryAddress ?? '',
        });
        setReady(true);
      })
      .catch((loadError: Error) => {
        if (ignore) return;
        setError(loadError.message);
        setReady(true);
      });
    return () => {
      ignore = true;
    };
  }, [userId, email]);

  const save = async (body: Record<string, string>) => {
    setNotice('');
    setError('');
    const response = await fetch('/api/account/profile', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await readError(response));
    if (body.name) await authClient.updateUser({ name: body.name });
    setNotice('Yadda saxlanıldı.');
  };

  return { profile, setProfile, ready, notice, error, setError, setNotice, save };
}

export function AccountSettingsButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`account-shortcut${open ? ' is-open' : ''}`} aria-expanded={open} aria-controls="account-settings" onClick={onClick} data-testid="button-account-settings">
      <span className="account-shortcut-icon"><Settings size={20} strokeWidth={1.8} /></span>
      <span className="account-shortcut-text"><strong>Tənzimləmələr</strong><small>Ad, e-poçt, telefon, şifrə</small></span>
    </button>
  );
}

export function AccountSettingsPanel({
  profile,
  setProfile,
  onSave,
  pending,
}: {
  profile: BuyerProfile;
  setProfile: (next: BuyerProfile) => void;
  onSave: (body: Record<string, string>) => Promise<void>;
  pending: boolean;
}) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordPending, setPasswordPending] = useState(false);

  const saveDetails = async (event: FormEvent) => {
    event.preventDefault();
    const name = `${profile.firstName.trim()} ${profile.lastName.trim()}`.trim();
    await onSave({ name, phone: profile.phone.trim() });
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordNotice('');
    if (newPassword.length < 8) {
      setPasswordError('Yeni şifrə ən azı 8 simvol olmalıdır.');
      return;
    }
    if (newPassword !== repeatPassword) {
      setPasswordError('Yeni şifrələr eyni deyil.');
      return;
    }
    setPasswordPending(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    });
    setPasswordPending(false);
    if (error) {
      setPasswordError(authErrorMessage(error));
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setRepeatPassword('');
    setPasswordNotice('Şifrə yeniləndi.');
  };

  return (
    <section className="account-panel" id="account-settings" aria-labelledby="account-settings-heading" data-testid="panel-account-settings">
      <div className="account-panel-head">
        <div>
          <div className="home-overline">Tənzimləmələr</div>
          <h2 id="account-settings-heading">Hesab məlumatları</h2>
        </div>
      </div>
      <form className="account-form" onSubmit={(event) => void saveDetails(event)}>
        <label className="account-field">
          <span>Ad</span>
          <input value={profile.firstName} autoComplete="given-name" onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} data-testid="input-account-first-name" required />
        </label>
        <label className="account-field">
          <span>Soyad</span>
          <input value={profile.lastName} autoComplete="family-name" onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} data-testid="input-account-last-name" />
        </label>
        <label className="account-field account-field--wide">
          <span>E-poçt</span>
          <input value={profile.email} type="email" readOnly data-testid="input-account-email" />
        </label>
        <label className="account-field account-field--wide">
          <span>Telefon nömrəsi</span>
          <input value={profile.phone} type="tel" autoComplete="tel" placeholder="+994 50 000 00 00" onChange={(event) => setProfile({ ...profile, phone: event.target.value })} data-testid="input-account-phone" />
        </label>
        <div className="account-field account-field--wide">
          <span>Şifrə</span>
          <div className="account-password-row">
            <input value="••••••••" type="password" readOnly aria-label="Şifrə" />
            <button className="account-text-action" type="button" onClick={() => setPasswordOpen((current) => !current)} data-testid="button-change-password">Şifrəni dəyiş</button>
          </div>
        </div>
        <button className="btn account-cta" type="submit" disabled={pending} data-testid="button-save-account-details">{pending ? 'Saxlanılır...' : 'Yadda saxla'}</button>
      </form>
      {passwordOpen && (
        <form className="account-form account-password-form" onSubmit={(event) => void savePassword(event)}>
          <label className="account-field">
            <span>Cari şifrə</span>
            <input value={currentPassword} type="password" autoComplete="current-password" onChange={(event) => setCurrentPassword(event.target.value)} data-testid="input-current-password" required />
          </label>
          <label className="account-field">
            <span>Yeni şifrə</span>
            <input value={newPassword} type="password" autoComplete="new-password" minLength={8} onChange={(event) => setNewPassword(event.target.value)} data-testid="input-new-password" required />
          </label>
          <label className="account-field account-field--wide">
            <span>Yeni şifrəni təkrarla</span>
            <input value={repeatPassword} type="password" autoComplete="new-password" minLength={8} onChange={(event) => setRepeatPassword(event.target.value)} data-testid="input-repeat-password" required />
          </label>
          {passwordError && <p className="account-form-error" role="alert">{passwordError}</p>}
          {passwordNotice && <p className="account-form-note" role="status">{passwordNotice}</p>}
          <button className="btn account-cta" type="submit" disabled={passwordPending} data-testid="button-save-password">{passwordPending ? 'Yenilənir...' : 'Şifrəni yenilə'}</button>
        </form>
      )}
    </section>
  );
}

export function AccountAddressSection({
  profile,
  setProfile,
  onSave,
  pending,
}: {
  profile: BuyerProfile;
  setProfile: (next: BuyerProfile) => void;
  onSave: (body: Record<string, string>) => Promise<void>;
  pending: boolean;
}) {
  return (
    <section className="account-panel" id="account-address" aria-labelledby="account-address-heading" data-testid="panel-account-address">
      <div className="account-panel-head">
        <div>
          <div className="home-overline">Çatdırılma</div>
          <h2 id="account-address-heading"><MapPin size={18} /> Ünvan</h2>
        </div>
      </div>
      <form className="account-form" onSubmit={(event) => { event.preventDefault(); void onSave({ deliveryArea: profile.deliveryArea, deliveryAddress: profile.deliveryAddress.trim() }); }}>
        <label className="account-field">
          <span>Ərazi</span>
          <select value={profile.deliveryArea} onChange={(event) => setProfile({ ...profile, deliveryArea: event.target.value === 'Abşeron' ? 'Abşeron' : 'Bakı' })} data-testid="select-account-area">
            <option value="Bakı">Bakı</option>
            <option value="Abşeron">Abşeron</option>
          </select>
        </label>
        <label className="account-field account-field--wide">
          <span>Ətraflı ünvan</span>
          <textarea value={profile.deliveryAddress} placeholder="Küçə, bina, mənzil və ya ofis" onChange={(event) => setProfile({ ...profile, deliveryAddress: event.target.value })} data-testid="input-account-address" />
        </label>
        <p className="account-form-hint">Hazırda çatdırılma yalnız Bakı və Abşeron üçündür.</p>
        <button className="btn account-cta" type="submit" disabled={pending} data-testid="button-save-address">{pending ? 'Saxlanılır...' : 'Ünvanı saxla'}</button>
      </form>
    </section>
  );
}

export function AccountPaymentSection() {
  return (
    <section className="account-panel" id="account-payment" aria-labelledby="account-payment-heading" data-testid="panel-account-payment">
      <div className="account-panel-head">
        <div>
          <div className="home-overline">Ödəniş</div>
          <h2 id="account-payment-heading"><CreditCard size={18} /> Ödəniş üsulu</h2>
        </div>
      </div>
      <div className="account-payment-list">
        <label className="account-payment-choice is-selected">
          <input type="radio" name="account-payment" checked readOnly data-testid="choice-pay-on-delivery" />
          <span><strong>Çatdırılmada nağd ödəniş</strong><small>Sifariş qapınıza çatanda və ya mağazadan götürəndə ödəyirsiniz.</small></span>
        </label>
        <div className="account-payment-choice is-disabled" data-testid="choice-card-unavailable">
          <CreditCard size={16} />
          <span><strong>Bank kartı</strong><small>Kartla ödəniş hələ aktiv deyil.</small></span>
        </div>
      </div>
    </section>
  );
}
