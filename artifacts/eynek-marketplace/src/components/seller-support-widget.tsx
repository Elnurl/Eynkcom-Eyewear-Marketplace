import { useEffect, useRef, useState } from 'react';
import { Check, MessageCircle, Minus, Send, ImagePlus, Loader2 } from 'lucide-react';

type Phase = 'intro' | 'compose' | 'sent';

function imageUploadContentType(file: File): 'image/jpeg' | 'image/png' | null {
  const type = file.type.toLowerCase();
  if (type === 'image/png') return 'image/png';
  if (type === 'image/jpeg' || type === 'image/jpg') return 'image/jpeg';
  return null;
}

async function uploadImage(file: File, mode: 'seller' | 'buyer'): Promise<string> {
  const contentType = imageUploadContentType(file);
  if (!contentType) throw new Error('Yalnız JPG və ya PNG qəbul olunur.');
  const url = mode === 'seller' ? '/api/storage/uploads/direct' : '/api/storage/uploads/inquiry';
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string; objectPath?: string };
  if (!response.ok) throw new Error(payload.error || 'Şəkil yüklənmədi.');
  if (!payload.objectPath) throw new Error('Şəkil yüklənmədi.');
  return payload.objectPath;
}

type Props = {
  enabled: boolean;
  uploadMode?: 'seller' | 'buyer';
  defaultName?: string;
  defaultEmail?: string;
};

export function SellerSupportWidget({ enabled, uploadMode = 'buyer', defaultName = '', defaultEmail = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('intro');
  const [contactName, setContactName] = useState(defaultName);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState(defaultEmail);
  const [message, setMessage] = useState('');
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContactName((current) => current || defaultName);
    setContactEmail((current) => current || defaultEmail);
  }, [defaultName, defaultEmail]);

  useEffect(() => {
    if (!open) return;
    void fetch('/api/account/profile', { credentials: 'include' })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data: { name?: string; phone?: string } | null) => {
        if (!data) return;
        if (data.name) setContactName((current) => current || data.name!.trim());
        if (data.phone) setContactPhone((current) => current || data.phone!.trim());
      })
      .catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!enabled) return null;

  const closePanel = () => {
    setOpen(false);
    window.setTimeout(() => {
      setPhase('intro');
      setMessage('');
      setImagePath(null);
      setPreview(null);
      setError('');
      if (fileRef.current) fileRef.current.value = '';
    }, 200);
  };

  const startCompose = () => {
    setError('');
    if (contactName.trim().length < 2) {
      setError('Adınızı yazın.');
      return;
    }
    if (contactPhone.replace(/\D/g, '').length < 7) {
      setError('Əlaqə nömrəsini yazın.');
      return;
    }
    setPhase('compose');
  };

  const onPickImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const path = await uploadImage(file, uploadMode);
      setImagePath(path);
      setPreview(URL.createObjectURL(file));
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : 'Şəkil yüklənmədi.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError('');
    setSending(true);
    try {
      const response = await fetch('/api/support/inquiries', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          contactEmail: contactEmail.trim() || undefined,
          message,
          imagePath: imagePath ?? undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Göndərilmədi.');
      setMessage('');
      setImagePath(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      setPhase('sent');
      window.setTimeout(() => closePanel(), 3200);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Göndərilmədi.');
    } finally {
      setSending(false);
    }
  };

  const placeholder = uploadMode === 'seller'
    ? 'Məsələn: məhsul şəkli yüklənmir, stok yenilənmir...'
    : 'Məsələn: sifarişim, ödəniş və ya hesab ilə bağlı sual...';

  return (
    <div className="seller-support-widget">
      {open && (
        <div className="seller-support-panel" role="dialog" aria-label="Dəstək" data-testid="panel-seller-support">
          <div className="seller-support-toolbar">
            <button type="button" className="seller-support-minimize" onClick={() => closePanel()} aria-label="Yığ"><Minus size={18} strokeWidth={2} /></button>
          </div>

          <div className="seller-support-hero">
            <div className="seller-support-hero-card">
              <span className="seller-support-avatar" aria-hidden><MessageCircle size={20} strokeWidth={1.8} /></span>
              <div>
                <strong>Dəstək</strong>
                <span>EYNƏK komandası</span>
              </div>
            </div>
          </div>

          {phase === 'sent' ? (
            <div className="seller-support-success" role="status" data-testid="status-support-sent">
              <span className="seller-support-success-icon" aria-hidden><Check size={28} strokeWidth={2.2} /></span>
              <strong>Göndərildi</strong>
              <p>Mesajın çatdı. Tezliklə sizinlə əlaqə saxlayacağıq.</p>
            </div>
          ) : phase === 'intro' ? (
            <div className="seller-support-intro">
              <p className="seller-support-welcome">Xoş gəldiniz! Söhbətə başlamaq üçün zəhmət olmasa formu doldurun.</p>
              <div className="seller-support-fields">
                <label className="seller-support-field">
                  <span>Ad <em>*</em></span>
                  <input type="text" autoComplete="name" value={contactName} onChange={(event) => setContactName(event.target.value)} data-testid="input-support-name" />
                </label>
                <label className="seller-support-field">
                  <span>Əlaqə nömrəsi <em>*</em></span>
                  <input type="tel" autoComplete="tel" placeholder="+994 50 000 00 00" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} data-testid="input-support-phone" />
                </label>
                <label className="seller-support-field">
                  <span>E-mail</span>
                  <input type="email" autoComplete="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} data-testid="input-support-email" />
                </label>
              </div>
              {error ? <p className="seller-support-error" role="alert">{error}</p> : null}
              <button type="button" className="btn btn-full seller-support-intro-submit" onClick={startCompose} data-testid="button-support-start">
                Çata başlayın
              </button>
            </div>
          ) : (
            <div className="seller-support-form">
              <button type="button" className="seller-support-back" onClick={() => { setPhase('intro'); setError(''); }}>← Geri</button>
              <p className="seller-support-lead">Sualınızı və ya probleminizi yazın.</p>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={placeholder}
                rows={7}
                maxLength={4000}
                data-testid="input-seller-support-message"
              />
              {preview && imagePath ? (
                <div className="seller-support-preview">
                  <img src={preview} alt="Əlavə şəkil" />
                  <button type="button" onClick={() => { setImagePath(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}>Şəkli sil</button>
                </div>
              ) : null}
              <div className="seller-support-actions">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png" hidden onChange={(event) => void onPickImage(event)} />
                <button type="button" className="btn btn-secondary" disabled={uploading || sending} onClick={() => fileRef.current?.click()} data-testid="button-seller-support-image">
                  {uploading ? <Loader2 size={16} className="spin" /> : <ImagePlus size={16} />} Şəkil
                </button>
                <button type="button" className="btn seller-support-send" disabled={sending || message.trim().length < 3} onClick={() => void submit()} data-testid="button-seller-support-send">
                  {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} strokeWidth={2} />} Göndər
                </button>
              </div>
              {error ? <p className="seller-support-error" role="alert">{error}</p> : null}
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        className="seller-support-fab"
        aria-expanded={open}
        aria-label="Dəstək"
        onClick={() => setOpen((current) => !current)}
        data-testid="button-seller-support-fab"
      >
        <MessageCircle size={26} strokeWidth={1.8} />
      </button>
    </div>
  );
}
