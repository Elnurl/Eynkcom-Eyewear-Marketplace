import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createAuthClient } from 'better-auth/react';

// Same origin: the API serves Better Auth at /api/auth.
export const authClient = createAuthClient();

export const googleSignInEnabled = import.meta.env.VITE_GOOGLE_SIGN_IN === 'true';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function useAuthSession() {
  const { data, isPending } = authClient.useSession();
  return {
    isLoaded: !isPending,
    isSignedIn: Boolean(data?.user),
    user: data?.user ?? null,
  };
}

/** Full reload after sign-out so no signed-in data survives in memory. */
export async function signOutAndGo(path = '/'): Promise<void> {
  try {
    await authClient.signOut();
  } finally {
    window.location.assign(`${basePath}${path}`);
  }
}

/** Drops cached API data when a different user signs in on this tab. */
export function useClearQueriesOnUserChange(): void {
  const { user, isLoaded } = useAuthSession();
  const queryClient = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded) return;
    const current = user?.id ?? null;
    if (previous.current !== undefined && previous.current !== current) queryClient.clear();
    previous.current = current;
  }, [isLoaded, user?.id, queryClient]);
}

const errorMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'E-poçt və ya şifrə yanlışdır.',
  EMAIL_NOT_VERIFIED: 'E-poçt ünvanınız hələ təsdiqlənməyib. Təsdiq linkini yenidən göndərdik.',
  USER_ALREADY_EXISTS: 'Bu e-poçtla hesab artıq mövcuddur.',
  PASSWORD_TOO_SHORT: 'Şifrə ən azı 8 simvol olmalıdır.',
  PASSWORD_TOO_LONG: 'Şifrə çox uzundur.',
  INVALID_EMAIL: 'Düzgün e-poçt ünvanı yazın.',
  INVALID_TOKEN: 'Link etibarsızdır və ya vaxtı bitib.',
};

export function authErrorMessage(error: { code?: string; status?: number } | null | undefined): string {
  if (!error) return '';
  if (error.status === 429) return 'Çox sayda cəhd edildi. Bir az sonra yenidən yoxlayın.';
  return (error.code && errorMessages[error.code]) || 'Əməliyyat alınmadı. Yenidən cəhd edin.';
}
