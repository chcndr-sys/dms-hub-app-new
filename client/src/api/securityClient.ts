/**
 * Security API Client
 * Collegamento al backend mihub-backend-rest per il sistema RBAC
 * 
 * @version 1.0.0
 * @date 9 Gennaio 2026
 */

import { ORCHESTRATORE_API_BASE_URL } from '@/config/api';

const API_BASE_URL = ORCHESTRATORE_API_BASE_URL;

// ============================================================================
// TYPES
// ============================================================================

export interface UserRole {
  id: number;
  code: string;
  name: string;
  description: string;
  sector: string;
  level: number;
  is_system: boolean;
  can_delegate: boolean;
  max_delegation_depth: number;
  created_at: string;
  updated_at: string;
  permissions_count: string | number;
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string;
  is_sensitive: boolean;
  requires_audit: boolean;
  created_at: string;
  roles_count?: string | number;
}

export interface RolePermission {
  role_id: number;
  role_code: string;
  role_name: string;
  role_level: number;
  permission_id: number;
  permission_code: string;
  permission_name: string;
  permission_category: string;
  scope: string;
  conditions?: any;
}

export interface SecurityStats {
  users: {
    total: number;
    withRoles: number;
  };
  roles: {
    total: number;
    permissions: number;
    mappings: number;
  };
  sessions: {
    active: number;
  };
  security: {
    events: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      unresolved: number;
    };
    blockedIPs: number;
  };
  logins: {
    total: number;
    successful: number;
    failed: number;
  };
  access: {
    total: number;
  };
}

export interface SecurityEvent {
  id: number;
  event_type: string;
  severity: string;
  user_id?: number;
  user_email?: string;
  user_name?: string;
  ip_address?: string;
  user_agent?: string;
  description?: string;
  details?: any;
  is_resolved: boolean;
  resolved_by?: number;
  resolved_by_email?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
}

export interface LoginAttempt {
  id: number;
  user_id?: number;
  user_email?: string;
  user_name?: string;
  email_attempted: string;
  ip_address: string;
  user_agent?: string;
  success: boolean;
  failure_reason?: string;
  created_at: string;
}

export interface IPBlacklist {
  id: number;
  ip_address: string;
  reason?: string;
  blocked_by?: number;
  blocked_by_email?: string;
  blocked_at: string;
  expires_at?: string;
  is_permanent: boolean;
  unblocked_at?: string;
  unblocked_by?: number;
  unblocked_by_email?: string;
}

export interface AccessLog {
  id: number;
  user_id?: number;
  user_email?: string;
  user_name?: string;
  action: string;
  resource?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  location?: string;
  details?: any;
  created_at: string;
}

export interface SecurityHealthResponse {
  success: boolean;
  status: string;
  timestamp: string;
  database: {
    connected: boolean;
    tables: {
      expected: number;
      found: number;
      missing: number;
    };
  };
  version: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * GET /api/security/health
 * Health check del modulo security
 */
export async function getSecurityHealth(): Promise<SecurityHealthResponse> {
  const url = `${API_BASE_URL}/api/security/health`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch security health: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * GET /api/security/stats
 * Statistiche generali per la dashboard
 */
export async function getSecurityStats(): Promise<{ success: boolean; data: SecurityStats; timestamp: string }> {
  const url = `${API_BASE_URL}/api/security/stats`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch security stats: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * GET /api/security/roles
 * Lista tutti i ruoli con conteggio permessi
 */
export async function getRoles(): Promise<{ success: boolean; data: UserRole[]; count: number }> {
  const url = `${API_BASE_URL}/api/security/roles`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch roles: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * GET /api/security/roles/:id
 * Dettaglio singolo ruolo con permessi
 */
export async function getRoleById(id: number): Promise<{ success: boolean; data: UserRole & { permissions: Permission[] } }> {
  const url = `${API_BASE_URL}/api/security/roles/${id}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch role: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * GET /api/security/permissions
 * Lista tutti i permessi raggruppati per categoria
 */
export async function getPermissions(category?: string): Promise<{ 
  success: boolean; 
  data: Permission[]; 
  byCategory: Record<string, Permission[]>;
  count: number 
}> {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  
  const url = `${API_BASE_URL}/api/security/permissions?${params.toString()}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch permissions: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * GET /api/security/matrix
 * Matrice completa ruoli-permessi
 */
export async function getRolePermissionsMatrix(): Promise<{ success: boolean; data: RolePermission[]; count: number }> {
  const url = `${API_BASE_URL}/api/security/matrix`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch matrix: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * GET /api/security/access-logs
 * Log degli accessi con filtri
 */
export async function getAccessLogs(filters?: {
  user_id?: number;
  action?: string;
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
}): Promise<{ 
  success: boolean; 
  data: AccessLog[]; 
  pagination: { total: number; limit: number; offset: number } 
}> {
  const params = new URLSearchParams();
  
  if (filters?.user_id) params.append('user_id', filters.user_id.toString());
  if (filters?.action) params.append('action', filters.action);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());
  if (filters?.from) params.append('from', filters.from);
  if (filters?.to) params.append('to', filters.to);
  
  const url = `${API_BASE_URL}/api/security/access-logs?${params.toString()}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch access logs: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * GET /api/security/events
 * Eventi di sicurezza con filtri
 */
export async function getSecurityEvents(filters?: {
  event_type?: string;
  severity?: string;
  is_resolved?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; data: SecurityEvent[]; count: number }> {
  const params = new URLSearchParams();
  
  if (filters?.event_type) params.append('event_type', filters.event_type);
  if (filters?.severity) params.append('severity', filters.severity);
  if (filters?.is_resolved !== undefined) params.append('is_resolved', filters.is_resolved.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());
  
  const url = `${API_BASE_URL}/api/security/events?${params.toString()}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch security events: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * POST /api/security/events
 * Registra un nuovo evento di sicurezza
 */
export async function createSecurityEvent(event: {
  event_type: string;
  severity?: string;
  user_id?: number;
  ip_address?: string;
  user_agent?: string;
  description?: string;
  details?: any;
}): Promise<{ success: boolean; data: SecurityEvent }> {
  const url = `${API_BASE_URL}/api/security/events`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create security event: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * GET /api/security/login-attempts
 * Tentativi di login con filtri
 */
export async function getLoginAttempts(filters?: {
  ip_address?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; data: LoginAttempt[]; count: number }> {
  const params = new URLSearchParams();
  
  if (filters?.ip_address) params.append('ip_address', filters.ip_address);
  if (filters?.success !== undefined) params.append('success', filters.success.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());
  
  const url = `${API_BASE_URL}/api/security/login-attempts?${params.toString()}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch login attempts: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * GET /api/security/ip-blacklist
 * Lista IP bloccati
 */
export async function getIPBlacklist(activeOnly?: boolean): Promise<{ success: boolean; data: IPBlacklist[]; count: number }> {
  const params = new URLSearchParams();
  if (activeOnly) params.append('active_only', 'true');
  
  const url = `${API_BASE_URL}/api/security/ip-blacklist?${params.toString()}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch IP blacklist: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * POST /api/security/ip-blacklist
 * Blocca un IP
 */
export async function blockIP(data: {
  ip_address: string;
  reason?: string;
  blocked_by?: number;
  expires_at?: string;
  is_permanent?: boolean;
}): Promise<{ success: boolean; data: IPBlacklist }> {
  const url = `${API_BASE_URL}/api/security/ip-blacklist`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to block IP: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * DELETE /api/security/ip-blacklist/:ip
 * Sblocca un IP
 */
export async function unblockIP(ip: string, unblocked_by?: number): Promise<{ success: boolean; data: IPBlacklist }> {
  const url = `${API_BASE_URL}/api/security/ip-blacklist/${encodeURIComponent(ip)}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ unblocked_by }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to unblock IP: ${response.statusText}`);
  }
  
  return response.json();
}
