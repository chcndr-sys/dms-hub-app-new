/**
 * PermissionsContext - Gestione Permessi Tab Dashboard
 *
 * Questo context carica e memorizza i permessi dell'utente loggato
 * per controllare la visibilità dei tab nella dashboard.
 *
 * @version 2.1.0
 * @date 16 Febbraio 2026
 *
 * LOGICA RUOLI:
 * 1. Se in impersonificazione → usa ruolo admin_pa (ID=2) del comune
 * 2. Se utente è super_admin → usa ruolo super_admin (ID=1)
 * 3. Se utente ha assigned_roles NON-citizen → usa il primo ruolo non-citizen
 * 4. Se utente ha base_role: "admin" → usa ruolo admin_pa (ID=2)
 * 5. Altrimenti → usa ruolo citizen (ID=13)
 *
 * PERMESSI CLIENT-SIDE:
 * - Utenti con impresa_id o base_role "business" → tab impresa
 * - Utenti con base_role "admin" o is_super_admin → tab dashboard PA
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ORCHESTRATORE_API_BASE_URL } from '@/config/api';
import { getImpersonationParams } from '@/hooks/useImpersonation';

// Costanti per i ruoli
const ROLE_IDS = {
  SUPER_ADMIN: 1,
  ADMIN_PA: 2,
  CITIZEN: 13,
};

// Permessi client-side per utenti business (impresa)
const IMPRESA_PERMISSION_CODES = [
  'tab.view.dashboard',
  'tab.view.wallet_impresa',
  'quick.view.hub_operatore',
  'quick.view.notifiche',
  'tab.view.anagrafica',
  'tab.view.presenze',
  'tab.view.mercati',
  'tab.view.imprese',
  'tab.view.wallet',
  'tab.view.commercio',
];

// Permessi client-side per utenti admin/PA (super_admin)
const ADMIN_PERMISSION_CODES = [
  'tab.view.dashboard',
  'tab.view.hub',
  'tab.view.controlli',
  'tab.view.reports',
  'tab.view.workspace',
  'tab.view.comuni',
  'tab.view.security',
  'tab.view.sistema',
  'tab.view.ai',
  'tab.view.integrations',
];

/**
 * Genera permessi extra basati sui dati utente in localStorage.
 * Questi si aggiungono ai permessi caricati dall'orchestratore.
 */
function getClientSidePermissions(): Permission[] {
  const userStr = localStorage.getItem('user');
  if (!userStr) return [];

  try {
    const user = JSON.parse(userStr);
    const extraPerms: Permission[] = [];
    let id = 9000;

    // Utenti business (con impresa_id o base_role 'business') → tab impresa
    if (user.impresa_id || user.base_role === 'business') {
      for (const code of IMPRESA_PERMISSION_CODES) {
        extraPerms.push({ id: id++, code, name: code, category: code.startsWith('tab') ? 'tab' : 'quick', is_sensitive: false });
      }
    }

    // Utenti admin/super_admin → tab dashboard PA
    if (user.is_super_admin || user.base_role === 'admin') {
      for (const code of ADMIN_PERMISSION_CODES) {
        extraPerms.push({ id: id++, code, name: code, category: 'tab', is_sensitive: false });
      }
    }

    return extraPerms;
  } catch {
    return [];
  }
}

// Tipi
interface Permission {
  id: number;
  code: string;
  name: string;
  category: string;
  is_sensitive: boolean;
}

interface PermissionsContextType {
  permissions: Permission[];
  permissionCodes: string[];
  loading: boolean;
  error: string | null;
  userRoleId: number | null;
  isImpersonating: boolean;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasAllPermissions: (codes: string[]) => boolean;
  canViewTab: (tabId: string) => boolean;
  canViewQuickAccess: (quickId: string) => boolean;
  refresh: () => Promise<void>;
}

// Context
const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

// Provider Props
interface PermissionsProviderProps {
  children: ReactNode;
}

// Funzione per determinare il ruolo dell'utente
async function determineUserRoleId(): Promise<{ roleId: number; isImpersonating: boolean }> {
  // 1. Controlla se siamo in modalità impersonificazione
  const impersonation = getImpersonationParams();
  if (impersonation.isImpersonating && impersonation.comuneId) {
    console.warn('[PermissionsContext] Modalita impersonificazione - usando ruolo admin_pa');
    return { roleId: ROLE_IDS.ADMIN_PA, isImpersonating: true };
  }

  // 2. Controlla se c'è un utente loggato in localStorage
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    console.warn('[PermissionsContext] Nessun utente loggato - usando ruolo citizen');
    return { roleId: ROLE_IDS.CITIZEN, isImpersonating: false };
  }

  try {
    const user = JSON.parse(userStr);
    
    // 3. PRIORITÀ MASSIMA: Se l'utente è super admin (flag dal server)
    // Il check avviene solo tramite il flag is_super_admin impostato dal backend
    if (user.is_super_admin) {
      return { roleId: ROLE_IDS.SUPER_ADMIN, isImpersonating: false };
    }

    // 4. Se l'utente ha assigned_roles NON-citizen, usa il primo non-citizen
    if (user.assigned_roles && user.assigned_roles.length > 0) {
      const nonCitizenRole = user.assigned_roles.find(
        (r: { role_id: number; role_code: string }) => r.role_id !== ROLE_IDS.CITIZEN
      );
      if (nonCitizenRole) {
        console.warn(`[PermissionsContext] Utente con ruolo assegnato: ${nonCitizenRole.role_code} (ID=${nonCitizenRole.role_id})`);
        return { roleId: nonCitizenRole.role_id, isImpersonating: false };
      }
      // Se solo ruoli citizen, prosegui con i check base_role
    }

    // 5. Se l'utente ha base_role "admin", usa admin_pa
    if (user.base_role === 'admin') {
      console.warn('[PermissionsContext] Utente admin - usando ruolo admin_pa');
      return { roleId: ROLE_IDS.ADMIN_PA, isImpersonating: false };
    }

    // 6. Default: citizen
    // Nota: utenti business con impresa_id riceveranno permessi impresa via client-side injection
    console.warn(`[PermissionsContext] Utente standard (base_role=${user.base_role || 'none'}) - usando ruolo citizen`);
    return { roleId: ROLE_IDS.CITIZEN, isImpersonating: false };

  } catch (err) {
    console.error('[PermissionsContext] Errore parsing user:', err);
    return { roleId: ROLE_IDS.CITIZEN, isImpersonating: false };
  }
}

// Provider Component
export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Carica i permessi dell'utente
  const loadUserPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Determina il ruolo dell'utente
      const { roleId, isImpersonating: impersonating } = await determineUserRoleId();
      setUserRoleId(roleId);
      setIsImpersonating(impersonating);
      
      console.warn(`[PermissionsContext] Caricamento permessi per ruolo ID=${roleId}`);
      
      // Carica i permessi del ruolo
      const response = await fetch(`${ORCHESTRATORE_API_BASE_URL}/api/security/roles/${roleId}/permissions`);
      const data = await response.json();

      let serverPerms: Permission[] = [];
      if (data.success && data.data && data.data.permissions) {
        serverPerms = data.data.permissions;
        console.warn(`[PermissionsContext] Caricati ${serverPerms.length} permessi dal server`);
      } else if (data.success && Array.isArray(data.data)) {
        serverPerms = data.data;
        console.warn(`[PermissionsContext] Caricati ${serverPerms.length} permessi (formato legacy)`);
      } else {
        throw new Error(data.error || 'Errore nel caricamento permessi');
      }

      // Unisci permessi server con permessi client-side basati su dati utente
      const clientPerms = getClientSidePermissions();
      const serverCodes = new Set(serverPerms.map((p: Permission) => p.code));
      const extraPerms = clientPerms.filter(p => !serverCodes.has(p.code));
      const allPerms = [...serverPerms, ...extraPerms];

      if (extraPerms.length > 0) {
        console.warn(`[PermissionsContext] Aggiunti ${extraPerms.length} permessi client-side: ${extraPerms.map(p => p.code).join(', ')}`);
      }

      setPermissions(allPerms);
      setPermissionCodes(allPerms.map((p: Permission) => p.code));
    } catch (err: any) {
      console.error('[PermissionsContext] Errore:', err);
      setError(err.message);
      // In caso di errore, usa solo permessi client-side basati su dati utente
      const clientPerms = getClientSidePermissions();
      if (clientPerms.length > 0) {
        console.warn(`[PermissionsContext] Fallback: usando ${clientPerms.length} permessi client-side`);
        setPermissions(clientPerms);
        setPermissionCodes(clientPerms.map(p => p.code));
      } else {
        setPermissions([]);
        setPermissionCodes([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Carica permessi all'avvio e quando cambia l'URL (impersonificazione)
  useEffect(() => {
    loadUserPermissions();
    
    // Ricarica quando cambia l'URL (per impersonificazione)
    const handleUrlChange = () => {
      loadUserPermissions();
    };
    
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [loadUserPermissions]);

  // Verifica se l'utente ha un permesso specifico
  const hasPermission = useCallback((code: string): boolean => {
    // Se stiamo ancora caricando, non bloccare l'accesso
    if (loading) {
      return true;
    }
    // Se non ci sono permessi caricati, nega l'accesso (tranne per super admin)
    if (permissionCodes.length === 0) {
      // Controlla se è super admin tramite flag dal server
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.is_super_admin) {
            return true;
          }
        } catch {}
      }
      return false;
    }
    return permissionCodes.includes(code);
  }, [permissionCodes, loading]);

  // Verifica se l'utente ha almeno uno dei permessi
  const hasAnyPermission = useCallback((codes: string[]): boolean => {
    if (loading) return true;
    if (permissionCodes.length === 0) return false;
    return codes.some(code => permissionCodes.includes(code));
  }, [permissionCodes, loading]);

  // Verifica se l'utente ha tutti i permessi
  const hasAllPermissions = useCallback((codes: string[]): boolean => {
    if (loading) return true;
    if (permissionCodes.length === 0) return false;
    return codes.every(code => permissionCodes.includes(code));
  }, [permissionCodes, loading]);

  // Verifica se l'utente può vedere un tab specifico
  const canViewTab = useCallback((tabId: string): boolean => {
    const permissionCode = `tab.view.${tabId}`;
    return hasPermission(permissionCode);
  }, [hasPermission]);

  // Verifica se l'utente può vedere un quick access specifico
  const canViewQuickAccess = useCallback((quickId: string): boolean => {
    const permissionCode = `quick.view.${quickId}`;
    return hasPermission(permissionCode);
  }, [hasPermission]);

  // Refresh manuale dei permessi
  const refresh = useCallback(async () => {
    await loadUserPermissions();
  }, [loadUserPermissions]);

  const value: PermissionsContextType = {
    permissions,
    permissionCodes,
    loading,
    error,
    userRoleId,
    isImpersonating,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canViewTab,
    canViewQuickAccess,
    refresh,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

// Hook per usare il context
export function usePermissions(): PermissionsContextType {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

// Export default
export default PermissionsContext;
