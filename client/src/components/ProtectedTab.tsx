/**
 * ProtectedTab Component - Wrapper per tab protetti da permessi
 * 
 * Questo componente nasconde i tab per cui l'utente non ha permesso.
 * Usato per implementare il controllo accessi nella DashboardPA.
 * 
 * @version 1.0.0
 * @date 23 Gennaio 2026
 */

import React, { ReactNode } from 'react';
import { usePermissions } from '@/contexts/PermissionsContext';

interface ProtectedTabProps {
  /** ID del tab (es. 'dashboard', 'users', 'security') */
  tabId: string;
  /** Contenuto da renderizzare se l'utente ha il permesso */
  children: ReactNode;
  /** Se true, mostra il tab anche durante il caricamento dei permessi */
  showWhileLoading?: boolean;
  /** Componente alternativo da mostrare se non ha permesso (opzionale) */
  fallback?: ReactNode;
}

/**
 * Wrapper per proteggere i tab della sidebar in base ai permessi utente.
 * 
 * Esempio d'uso:
 * ```tsx
 * <ProtectedTab tabId="security">
 *   <button onClick={() => setActiveTab('security')}>
 *     Sicurezza
 *   </button>
 * </ProtectedTab>
 * ```
 */
export function ProtectedTab({
  tabId,
  children,
  showWhileLoading = false,
  fallback = null
}: ProtectedTabProps) {
  const { canViewTab, loading } = usePermissions();

  // Durante il caricamento, mostra o nascondi in base a showWhileLoading
  if (loading) {
    return showWhileLoading ? <>{children}</> : null;
  }

  // Verifica il permesso
  if (!canViewTab(tabId)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Wrapper per proteggere i quick access in base ai permessi utente.
 */
interface ProtectedQuickAccessProps {
  /** ID del quick access (es. 'home', 'wallet', 'bus_hub') */
  quickId: string;
  /** Contenuto da renderizzare se l'utente ha il permesso */
  children: ReactNode;
  /** Se true, mostra il quick access anche durante il caricamento dei permessi */
  showWhileLoading?: boolean;
  /** Componente alternativo da mostrare se non ha permesso (opzionale) */
  fallback?: ReactNode;
}

export function ProtectedQuickAccess({
  quickId,
  children,
  showWhileLoading = false,
  fallback = null
}: ProtectedQuickAccessProps) {
  const { canViewQuickAccess, loading } = usePermissions();

  // Durante il caricamento, mostra o nascondi in base a showWhileLoading
  if (loading) {
    return showWhileLoading ? <>{children}</> : null;
  }

  // Verifica il permesso
  if (!canViewQuickAccess(quickId)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook per verificare se un tab è visibile
 */
export function useTabVisibility(tabId: string): boolean {
  const { canViewTab, loading } = usePermissions();

  // Durante il caricamento, nascondi il tab (secure by default)
  if (loading) return false;

  return canViewTab(tabId);
}

/**
 * Hook per verificare se un quick access è visibile
 */
export function useQuickAccessVisibility(quickId: string): boolean {
  const { canViewQuickAccess, loading } = usePermissions();

  // Durante il caricamento, nascondi il quick access (secure by default)
  if (loading) return false;

  return canViewQuickAccess(quickId);
}

export default ProtectedTab;
