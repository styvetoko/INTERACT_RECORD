import { User } from '@prisma/client';

/** Vue de l'utilisateur sur lui-même : jamais d'empreinte de PIN ni de données internes. */
export function toPrivateUser(user: User) {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    displayName: user.displayName,
    locale: user.locale,
    country: user.country,
    city: user.city,
    roles: user.roles,
    status: user.status,
    kycLevel: user.kycLevel,
    hasPin: user.pinHash !== null,
    birthYear: user.birthYear,
    deletionRequestedAt: user.deletionRequestedAt,
    createdAt: user.createdAt,
  };
}
