/**
 * PermissionsContext - Gestione Permessi Tab Dashboard
 * 
 * Questo context carica e memorizza i permessi dell'utente loggato
 * per controllare la visibilità dei tab nella dashboard.
 * 
 * @version 2.0.0
 * @date 24 Gennaio 2026
 * 
 * LOGICA RUOLI:
 * 1. Se utente ha assigned_roles → usa il primo ruolo assegnato
 * 2. Se utente ha base_role: "admin" → usa ruolo admin_pa (ID=2)
 * 3. Se in impersonificazione → usa ruolo admin_pa (ID=2) del comune
 * 4. Altrimenti → usa ruolo citizen (ID=13) - nessun permesso dashboard
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
    console.log('[PermissionsContext] Modalità impersonificazione - usando ruolo admin_pa');
    return { roleId: ROLE_IDS.ADMIN_PA, isImpersonating: true };
  }

  // 2. Controlla se c'è un utente loggato in localStorage
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    console.log('[PermissionsContext] Nessun utente loggato - usando ruolo citizen');
    return { roleId: ROLE_IDS.CITIZEN, isImpersonating: false };
  }

  try {
    const user = JSON.parse(userStr);
    
    // 3. PRIORITÀ MASSIMA: Se l'utente è super admin (flag dal server)
    // Il check avviene solo tramite il flag is_super_admin impostato dal backend
    if (user.is_super_admin) {
      return { roleId: ROLE_IDS.SUPER_ADMIN, isImpersonating: false };
    }

    // 4. Se l'utente ha assigned_roles, usa il primo
    if (user.assigned_roles && user.assigned_roles.length > 0) {
      const firstRole = user.assigned_roles[0];
      console.log(`[PermissionsContext] Utente con ruolo assegnato: ${firstRole.role_code} (ID=${firstRole.role_id})`);
      return { roleId: firstRole.role_id, isImpersonating: false };
    }

    // 5. Se l'utente ha base_role "admin", usa admin_pa
    if (user.base_role === 'admin') {
      console.log('[PermissionsContext] Utente admin - usando ruolo admin_pa');
      return { roleId: ROLE_IDS.ADMIN_PA, isImpersonating: false };
    }

    // 6. Default: citizen
    console.log('[PermissionsContext] Utente standard - usando ruolo citizen');
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
      
      console.log(`[PermissionsContext] Caricamento permessi per ruolo ID=${roleId}`);
      
      // Carica i permessi del ruolo
      const response = await fetch(`${ORCHESTRATORE_API_BASE_URL}/api/security/roles/${roleId}/permissions`);
      const data = await response.json();

      if (data.success && data.data && data.data.permissions) {
        const perms = data.data.permissions;
        setPermissions(perms);
        setPermissionCodes(perms.map((p: Permission) => p.code));
        console.log(`[PermissionsContext] Caricati ${perms.length} permessi`);
      } else if (data.success && Array.isArray(data.data)) {
        // Fallback per vecchio formato API
        setPermissions(data.data);
        setPermissionCodes(data.data.map((p: Permission) => p.code));
        console.log(`[PermissionsContext] Caricati ${data.data.length} permessi (formato legacy)`);
      } else {
        throw new Error(data.error || 'Errore nel caricamento permessi');
      }
    } catch (err: any) {
      console.error('[PermissionsContext] Errore:', err);
      setError(err.message);
      // In caso di errore, impostiamo permessi vuoti
      // Il fallback NON concede più accesso automatico
      setPermissions([]);
      setPermissionCodes([]);
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
