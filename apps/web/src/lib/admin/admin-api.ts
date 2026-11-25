/**
 * Client de l'API pour le back-office, côté serveur uniquement (ADR-0009).
 * Le jeton d'accès vient du cookie httpOnly ; il n'est jamais envoyé au navigateur.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ArtistCard, ArtistPublic, Page } from '@/lib/api';
import { ACCESS_COOKIE, LOGIN_PATH, type TokenPair } from './session-core';
import type { Role } from './permissions';

export const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export class AdminApiError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(`API ${status} ${code}`);
  }
}

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETION_PENDING';

export interface AdminMe {
  id: string;
  displayName: string | null;
  roles: Role[];
  status: UserStatus;
}

export interface UserRow {
  id: string;
  phone: string;
  displayName: string | null;
  city: string | null;
  roles: Role[];
  status: UserStatus;
  kycLevel: number;
  createdAt: string;
}

export interface UserDetail extends Omit<UserRow, 'phone'> {
  phone: string;
  email: string | null;
  locale: 'fr' | 'en';
  country: string;
  suspendedReason: string | null;
  suspendedById: string | null;
  hasPin: boolean;
  deletionRequestedAt: string | null;
  activeSessions: number;
  artists: { slug: string; stageName: string; verified: boolean; memberRole: string }[];
}

export interface AuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  data: unknown;
  createdAt: string;
}

interface CallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Route publique : pas de jeton, et un 401 ne renvoie pas vers la connexion. */
  anonymous?: boolean;
  token?: string;
}

const query = (params: Record<string, string | undefined>) => {
  const qs = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));
  const s = qs.toString();
  return s ? `?${s}` : '';
};

async function call<T>(path: string, options: CallOptions = {}): Promise<T> {
  const token = options.anonymous ? undefined : options.token ?? (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!options.anonymous && !token) redirect(LOGIN_PATH);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new AdminApiError('API_UNAVAILABLE', 503);
  }

  if (res.status === 204) return undefined as T;
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code = typeof payload === 'object' && payload && 'code' in payload ? String((payload as { code: unknown }).code) : 'GENERIC';
    // Session fermée ou expirée : retour à la connexion.
    if (res.status === 401 && !options.anonymous) redirect(LOGIN_PATH);
    throw new AdminApiError(code, res.status);
  }
  return payload as T;
}

export const adminApi = {
  // Connexion (ACC-01)
  requestOtp: (phone: string) => call<{ phone: string }>('/v1/auth/otp/request', { method: 'POST', body: { phone }, anonymous: true }),
  verifyOtp: (phone: string, code: string, deviceName: string) =>
    call<TokenPair & { user: AdminMe }>('/v1/auth/otp/verify', { method: 'POST', body: { phone, code, deviceName }, anonymous: true }),
  logout: (token?: string) => call<void>('/v1/auth/logout', { method: 'POST', token }),

  me: () => call<AdminMe>('/v1/me'),

  // Comptes (ADM-01)
  searchUsers: (p: { q?: string; status?: string; role?: string; cursor?: string }) =>
    call<Page<UserRow>>(`/v1/admin/users${query({ ...p, limit: '20' })}`),
  user: (id: string) => call<UserDetail>(`/v1/admin/users/${encodeURIComponent(id)}`),
  suspend: (id: string, reason: string) =>
    call<UserDetail>(`/v1/admin/users/${encodeURIComponent(id)}/suspend`, { method: 'POST', body: { reason } }),
  reactivate: (id: string, reason: string) =>
    call<UserDetail>(`/v1/admin/users/${encodeURIComponent(id)}/reactivate`, { method: 'POST', body: { reason } }),
  setRoles: (id: string, roles: string[], reason: string) =>
    call<UserDetail>(`/v1/admin/users/${encodeURIComponent(id)}/roles`, { method: 'PUT', body: { roles, reason } }),

  // Artistes (ACC-06)
  artists: (p: { q?: string; cursor?: string }) => call<Page<ArtistCard>>(`/v1/artists${query({ ...p, limit: '20' })}`),
  artist: (slug: string) => call<ArtistPublic>(`/v1/artists/${encodeURIComponent(slug)}`),
  setVerified: (slug: string, verified: boolean, reason: string) =>
    call<ArtistPublic>(`/v1/admin/artists/${encodeURIComponent(slug)}/verification`, { method: 'POST', body: { verified, reason } }),

  // Journal d'audit (ADM-10)
  audit: (p: { action?: string; entityType?: string; entityId?: string; actorId?: string; cursor?: string }) =>
    call<Page<AuditEntry>>(`/v1/admin/audit-logs${query({ ...p, limit: '30' })}`),
};
