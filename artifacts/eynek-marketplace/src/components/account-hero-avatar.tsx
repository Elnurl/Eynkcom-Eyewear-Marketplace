import { type ChangeEvent, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { uploadedStoreImageUrl } from '@/lib/uploaded-image-url';

async function readUploadError(response: Response) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error || 'Profil şəkli yüklənmədi.';
}

function avatarContentType(file: File): 'image/jpeg' | 'image/png' | null {
  if (file.type === 'image/png') return 'image/png';
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') return 'image/jpeg';
  return null;
}

export async function uploadBuyerAvatar(file: File): Promise<string> {
  const contentType = avatarContentType(file);
  if (!contentType) throw new Error('Yalnız JPG və ya PNG qəbul olunur.');
  const response = await fetch('/api/storage/uploads/avatar', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: file,
    credentials: 'include',
  });
  if (!response.ok) throw new Error(await readUploadError(response));
  const payload = await response.json() as { objectPath: string };
  return payload.objectPath;
}

type AccountHeroAvatarProps = {
  imagePath: string;
  canUpload: boolean;
  displayName?: string;
  onImagePath: (path: string) => void;
  onError?: (message: string) => void;
  /** Dev önizləmə: şəkil yükləmə API olmadan, yalnız brauzerdə göstərir. */
  localPreviewOnly?: boolean;
  /** Statik nümunə şəkli (məs. /public-dən). */
  sampleSrc?: string | null;
};

export function AccountHeroAvatar({
  imagePath,
  canUpload,
  displayName,
  onImagePath,
  onError,
  localPreviewOnly = false,
  sampleSrc = null,
}: AccountHeroAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localSrc, setLocalSrc] = useState<string | null>(null);
  const src = localSrc ?? sampleSrc ?? (imagePath ? uploadedStoreImageUrl(imagePath) : null);
  const alt = displayName ? `${displayName} profil şəkli` : 'Profil şəkli';

  const pickFile = () => {
    if (!canUpload || uploading) return;
    inputRef.current?.click();
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !canUpload) return;
    if (localPreviewOnly) {
      if (!avatarContentType(file)) {
        onError?.('Yalnız JPG və ya PNG qəbul olunur.');
        return;
      }
      setLocalSrc(URL.createObjectURL(file));
      onImagePath('');
      return;
    }
    setUploading(true);
    try {
      const objectPath = await uploadBuyerAvatar(file);
      setLocalSrc(null);
      onImagePath(objectPath);
      await authClient.updateUser({ image: uploadedStoreImageUrl(objectPath) });
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Profil şəkli yüklənmədi.');
    } finally {
      setUploading(false);
    }
  };

  const shell = (
    <div className={`account-hero-avatar${uploading ? ' is-uploading' : ''}`} data-testid="account-hero-avatar">
      {src ? (
        <img src={src} alt={alt} width={200} height={200} decoding="async" />
      ) : (
        <span className="account-hero-avatar-placeholder" aria-hidden="true">
          <UserRound size={56} strokeWidth={1.6} />
        </span>
      )}
    </div>
  );

  return (
    <div className="account-hero-avatar-wrap">
      {canUpload ? (
        <>
          <button
            type="button"
            className="account-hero-avatar-button"
            onClick={pickFile}
            disabled={uploading}
            aria-label={src ? 'Profil şəklini dəyiş' : 'Profil şəkli əlavə et'}
            data-testid="button-account-avatar"
          >
            {shell}
            <span className="account-hero-avatar-hint">{uploading ? 'Yüklənir…' : src ? 'Dəyiş' : 'Şəkil əlavə et'}</span>
          </button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(e) => void onFile(e)} />
        </>
      ) : (
        shell
      )}
    </div>
  );
}