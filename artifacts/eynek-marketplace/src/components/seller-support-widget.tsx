import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X, ImagePlus, Loader2 } from 'lucide-react';

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
  contextLabel?: string;
};

export function SellerSupportWidget({ enabled, uploadMode = 'buyer', contextLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!enabled) return null;

  const reset = () => {
    setMessage('');
    setImagePath(null);
    setPreview(null);
    setError('');
    setSent(false);
    if (fileRef.current) fileRef.current.value = '';
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
        body: JSON.stringify({ message, imagePath: imagePath ?? undefined }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Göndərilmədi.');
      setSent(true);
      reset();
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 2200);
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
        <div className="seller-support-panel" role="dialog" aria-label="EYNƏK dəstəyinə yaz" data-testid="panel-seller-support">
          <div className="seller-support-panel-head">
            <div>
              <strong>EYNƏK dəstəyinə yaz</strong>
              {contextLabel ? <span>{contextLabel}</span> : null}
            </div>
            <button type="button" className="seller-support-close" onClick={() => setOpen(false)} aria-label="Bağla"><X size={18} /></button>
          </div>
          {sent ? (
            <p className="seller-support-success">Mesajınız göndərildi. Tezliklə cavab verəcəyik.</p>
          ) : (
            <>
              <p className="seller-support-lead">Problem, sual və ya bildirmək istədiyiniz məsələni yazın.</p>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={placeholder}
                rows={5}
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
                <button type="button" className="btn btn-blue" disabled={sending || message.trim().length < 3} onClick={() => void submit()} data-testid="button-seller-support-send">
                  {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />} Göndər
                </button>
              </div>
              {error ? <p className="seller-support-error" role="alert">{error}</p> : null}
            </>
          )}
        </div>
      )}
      <button
        type="button"
        className="seller-support-fab"
        aria-expanded={open}
        aria-label="EYNƏK dəstəyinə yaz"
        onClick={() => setOpen((current) => !current)}
        data-testid="button-seller-support-fab"
      >
        <MessageCircle size={26} strokeWidth={1.8} />
      </button>
    </div>
  );
}
