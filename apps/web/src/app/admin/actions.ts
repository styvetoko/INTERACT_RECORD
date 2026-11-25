'use server';

/**
 * Actions serveur du back-office. Next vérifie l'origine de chaque appel (protection CSRF) ;
 * les cookies de session sont SameSite=Strict et httpOnly (ADR-0009).
 */
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminApiError, adminApi } from '@/lib/admin/admin-api';
import { checkReason, errorKey, type ErrorKey, type FormState } from '@/lib/admin/errors';
import { homeFor, isInternalRole, isStaff } from '@/lib/admin/permissions';
import {
  ACCESS_COOKIE, cookieOptions, DEVICE_NAME, LOGIN_PATH, REFRESH_COOKIE, REFRESH_COOKIE_MAX_AGE_SECONDS, safeAdminPath,
} from '@/lib/admin/session-core';

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
};

/** Seule une erreur de l'API devient un message ; une redirection ou une panne inattendue continue son chemin. */
function asFormError(e: unknown): FormState {
  if (e instanceof AdminApiError) return { status: 'error', code: errorKey(e.code) };
  throw e;
}

// ---------- Connexion par code SMS (ACC-01, ADM-01) ----------

export interface LoginState {
  step: 'phone' | 'code';
  phone: string;
  error: ErrorKey | null;
  resent: boolean;
}

export async function loginAction(prev: LoginState, fd: FormData): Promise<LoginState> {
  const intent = text(fd, 'intent');
  if (intent === 'restart') return { step: 'phone', phone: '', error: null, resent: false };

  if (intent === 'request' || intent === 'resend') {
    const phone = intent === 'resend' ? prev.phone : text(fd, 'phone');
    if (!phone) return { ...prev, error: 'PHONE_INVALID', resent: false };
    try {
      const res = await adminApi.requestOtp(phone);
      return { step: 'code', phone: res.phone, error: null, resent: intent === 'resend' };
    } catch (e) {
      if (e instanceof AdminApiError) return { ...prev, phone, error: errorKey(e.code), resent: false };
      throw e;
    }
  }

  // intent === 'verify'
  const code = text(fd, 'code').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return { ...prev, error: 'OTP_INVALID', resent: false };

  let destination: string | null;
  try {
    const session = await adminApi.verifyOtp(prev.phone, code, DEVICE_NAME);
    if (!isStaff(session.user.roles)) {
      // Pas membre de l'équipe : la session ouverte est refermée aussitôt.
      await adminApi.logout(session.accessToken).catch(() => undefined);
      return { step: 'phone', phone: '', error: 'ADMIN_ACCESS_DENIED', resent: false };
    }
    const store = await cookies();
    store.set(ACCESS_COOKIE, session.accessToken, cookieOptions(session.accessTokenExpiresIn));
    store.set(REFRESH_COOKIE, session.refreshToken, cookieOptions(REFRESH_COOKIE_MAX_AGE_SECONDS));
    const wanted = text(fd, 'suite');
    destination = wanted ? safeAdminPath(wanted) : homeFor(session.user.roles) ?? '/admin';
  } catch (e) {
    if (e instanceof AdminApiError) return { ...prev, error: errorKey(e.code), resent: false };
    throw e;
  }
  redirect(destination);
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (token) await adminApi.logout(token).catch(() => undefined);
  store.set(ACCESS_COOKIE, '', cookieOptions(0));
  store.set(REFRESH_COOKIE, '', cookieOptions(0));
  redirect(LOGIN_PATH);
}

// ---------- Comptes (ADM-01) ----------

export async function suspensionAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = text(fd, 'id');
  const intent = text(fd, 'intent');
  const reason = checkReason(fd.get('reason'));
  if (!reason.ok) return { status: 'error', code: reason.code };
  try {
    if (intent === 'suspend') await adminApi.suspend(id, reason.reason);
    else await adminApi.reactivate(id, reason.reason);
  } catch (e) {
    return asFormError(e);
  }
  revalidatePath(`/admin/comptes/${id}`);
  return { status: 'success' };
}

export async function rolesAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = text(fd, 'id');
  const roles = fd.getAll('roles').filter((r): r is string => typeof r === 'string' && isInternalRole(r));
  const reason = checkReason(fd.get('reason'));
  if (!reason.ok) return { status: 'error', code: reason.code };
  try {
    await adminApi.setRoles(id, [...new Set(roles)], reason.reason);
  } catch (e) {
    return asFormError(e);
  }
  revalidatePath(`/admin/comptes/${id}`);
  return { status: 'success' };
}

// ---------- Artistes : badge vérifié (ACC-06) ----------

export async function verificationAction(_: FormState, fd: FormData): Promise<FormState> {
  const slug = text(fd, 'slug');
  const verified = text(fd, 'verified') === 'true';
  const reason = checkReason(fd.get('reason'));
  if (!reason.ok) return { status: 'error', code: reason.code };
  try {
    await adminApi.setVerified(slug, verified, reason.reason);
  } catch (e) {
    return asFormError(e);
  }
  revalidatePath(`/admin/artistes/${slug}`);
  return { status: 'success' };
}
