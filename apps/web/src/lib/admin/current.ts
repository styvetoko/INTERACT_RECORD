import { cache } from 'react';
import { adminApi } from './admin-api';

/** Compte connecté, lu une seule fois par requête (mise en page et page partagent le résultat). */
export const getCurrentAdmin = cache(() => adminApi.me());
