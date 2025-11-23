/**
 * Utilità per gestione stati posteggi
 * 
 * Stati tecnici (backend): libero, occupato, riservato
 * Mappati a etichette italiane e colori per il frontend
 */

export type StallStatus = 'libero' | 'occupato' | 'riservato';

export interface StallStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  mapFillColor: string;
}

/**
 * Configurazione completa degli stati posteggi
 */
export const STALL_STATUS_CONFIG: Record<StallStatus, StallStatusConfig> = {
  libero: {
    label: 'LIBERO',
    color: '#10b981',
    bgColor: 'bg-[#10b981]/20',
    borderColor: 'border-[#10b981]/30',
    mapFillColor: '#10b981',
  },
  occupato: {
    label: 'OCCUPATO',
    color: '#ef4444',
    bgColor: 'bg-[#ef4444]/20',
    borderColor: 'border-[#ef4444]/30',
    mapFillColor: '#ef4444',
  },
  riservato: {
    label: 'IN ASSEGNAZIONE',
    color: '#f59e0b',
    bgColor: 'bg-[#f59e0b]/20',
    borderColor: 'border-[#f59e0b]/30',
    mapFillColor: '#f59e0b',
  },
};

/**
 * Ottiene l'etichetta italiana per uno stato
 */
export function getStallStatusLabel(status: string): string {
  const normalizedStatus = status.toLowerCase() as StallStatus;
  return STALL_STATUS_CONFIG[normalizedStatus]?.label || status.toUpperCase();
}

/**
 * Ottiene il colore per uno stato (per badge, testo, ecc.)
 */
export function getStallStatusColor(status: string): string {
  const normalizedStatus = status.toLowerCase() as StallStatus;
  return STALL_STATUS_CONFIG[normalizedStatus]?.color || '#14b8a6';
}

/**
 * Ottiene le classi CSS Tailwind per un badge di stato
 */
export function getStallStatusClasses(status: string): string {
  const normalizedStatus = status.toLowerCase() as StallStatus;
  const config = STALL_STATUS_CONFIG[normalizedStatus];
  
  if (!config) {
    return 'bg-[#14b8a6]/20 text-[#14b8a6] border-[#14b8a6]/30';
  }
  
  return `${config.bgColor} text-[${config.color}] ${config.borderColor}`;
}

/**
 * Ottiene il colore di riempimento per la mappa
 */
export function getStallMapFillColor(status: string): string {
  const normalizedStatus = status.toLowerCase() as StallStatus;
  return STALL_STATUS_CONFIG[normalizedStatus]?.mapFillColor || '#14b8a6';
}

/**
 * Lista di tutti gli stati disponibili per select/dropdown
 */
export const STALL_STATUS_OPTIONS: Array<{ value: StallStatus; label: string }> = [
  { value: 'libero', label: 'LIBERO' },
  { value: 'occupato', label: 'OCCUPATO' },
  { value: 'riservato', label: 'IN ASSEGNAZIONE' },
];
