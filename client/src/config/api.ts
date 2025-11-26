/**
 * API Configuration
 * 
 * Centralized API base URLs for the DMS Hub application.
 * All API calls should use these constants instead of hardcoded URLs.
 */

/**
 * MIHUB Backend API (Hetzner)
 * Used for:
 * - Markets data (/markets/...)
 * - Stalls data (/stalls/...)
 * - GIS data (/gis/...)
 * - Companies data (/markets/:code/companies)
 * - Concessions data (/markets/:code/concessions)
 * - Admin endpoints (/admin/...)
 * - Guardian logs (/admin/guardian/...)
 */
export const MIHUB_API_BASE_URL = import.meta.env.VITE_MIHUB_API_URL || 'https://mihub.157-90-29-66.nip.io';

/**
 * Legacy: Orchestratore MIO Hub
 * Only used for specific orchestrator operations if needed.
 * DO NOT use for DMS data (markets, stalls, companies, concessions).
 */
export const ORCHESTRATORE_API_BASE_URL = 'https://orchestratore.mio-hub.me';

/**
 * AI Chat API
 * Used for AI assistant and chat features.
 */
export const AI_API_BASE_URL = import.meta.env.VITE_API_URL || 'https://8000-iot4ac202gehqh0qqxx5z-ce5d3831.manusvm.computer/api/v1';
