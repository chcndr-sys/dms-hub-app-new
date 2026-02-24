/**
 * FraudMonitorPanel - Pannello anti-frode per Dashboard PA
 *
 * Mostra eventi sospetti, statistiche, e azioni per admin.
 * Usa tRPC tccSecurity.* per i dati.
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { TCC_API_BASE } from '@/config/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield, AlertTriangle, CheckCircle2, XCircle,
  Eye, Clock, TrendingUp, RefreshCw, Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { authenticatedFetch } from '@/hooks/useImpersonation';

// ============================================================================
// FRAUD STATS CARD
// ============================================================================

function FraudStatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['tcc-fraud-stats'],
    queryFn: async () => {
      const res = await fetch(`${TCC_API_BASE}/api/tcc/v2/fraud/stats`);
      if (!res.ok) throw new Error(`Errore ${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-8 bg-muted rounded w-12 mb-2" />
              <div className="h-4 bg-muted rounded w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className={stats.critical > 0 ? 'border-red-500/50 bg-red-950/20' : ''}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-4 h-4 ${stats.critical > 0 ? 'text-red-400' : 'text-muted-foreground'}`} />
            <span className="text-2xl font-bold">{stats.critical}</span>
          </div>
          <p className="text-xs text-muted-foreground">Critici aperti</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-2xl font-bold">{stats.unresolved}</span>
          </div>
          <p className="text-xs text-muted-foreground">Non risolti</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-2xl font-bold">{stats.today}</span>
          </div>
          <p className="text-xs text-muted-foreground">Oggi</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <span className="text-2xl font-bold">{stats.last30Days}</span>
          </div>
          <p className="text-xs text-muted-foreground">Ultimi 30 giorni</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// SEVERITY BADGE
// ============================================================================

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    low: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  };

  return (
    <Badge variant="outline" className={colors[severity] || colors.low}>
      {severity.toUpperCase()}
    </Badge>
  );
}

// ============================================================================
// EVENT TYPE LABEL
// ============================================================================

function EventTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    gps_spoofing: 'GPS Spoofing',
    rate_exceeded: 'Rate Limit',
    duplicate_checkin: 'Checkin Duplicato',
    invalid_qr: 'QR Non Valido',
    amount_anomaly: 'Importo Anomalo',
    impossible_travel: 'Viaggio Impossibile',
    suspicious_pattern: 'Pattern Sospetto',
  };

  return <span className="text-sm">{labels[type] || type}</span>;
}

// ============================================================================
// FRAUD EVENTS LIST
// ============================================================================

function FraudEventsList() {
  const [severity, setSeverity] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tcc-fraud-events', severity, showResolved],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (severity !== 'all') params.append('severity', severity);
      if (!showResolved) params.append('resolved', 'false');
      const res = await fetch(`${TCC_API_BASE}/api/tcc/v2/fraud/events?${params}`);
      if (!res.ok) throw new Error(`Errore ${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (params: { eventId: number; resolution: string; notes: string }) => {
      const res = await authenticatedFetch(`${TCC_API_BASE}/api/tcc/v2/fraud/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`Errore ${res.status}: ${res.statusText}`);
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Eventi Sospetti</CardTitle>
            <CardDescription>
              {data?.total || 0} eventi {!showResolved ? 'non risolti' : 'totali'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Severita'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showResolved ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowResolved(!showResolved)}
            >
              {showResolved ? 'Tutti' : 'Aperti'}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-8 w-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : !data?.events?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-teal-400" />
            <p>Nessun evento sospetto</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.events.map((event: any) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <SeverityBadge severity={event.severity} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <EventTypeLabel type={event.eventType} />
                      {event.userId && (
                        <span className="text-xs text-muted-foreground">
                          User #{event.userId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                      {event.details?.reason || event.details?.message || JSON.stringify(event.details).substring(0, 80)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString('it-IT')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {event.resolved ? (
                    <Badge variant="outline" className="bg-teal-500/20 text-teal-300 border-teal-500/30">
                      Risolto
                    </Badge>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() =>
                          resolveMutation.mutate({
                            eventId: event.id,
                            resolution: 'resolved',
                            notes: 'Risolto da dashboard PA',
                          })
                        }
                        disabled={resolveMutation.isPending}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Risolvi
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() =>
                          resolveMutation.mutate({
                            eventId: event.id,
                            resolution: 'ignored',
                            notes: 'Ignorato da dashboard PA',
                          })
                        }
                        disabled={resolveMutation.isPending}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Ignora
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// AUDIT TRAIL SEARCH
// ============================================================================

function AuditTrailSearch() {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchUserId, setSearchUserId] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tcc-audit-trail', searchEmail, searchUserId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '30' });
      if (searchEmail) params.append('email', searchEmail);
      if (searchUserId) params.append('userId', searchUserId);
      const res = await fetch(`${TCC_API_BASE}/api/tcc/v2/audit?${params}`);
      if (!res.ok) throw new Error(`Errore ${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: false, // Query manuale
  });

  const handleSearch = () => {
    if (searchEmail || searchUserId) {
      refetch();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="w-4 h-4" />
          Audit Trail TCC
        </CardTitle>
        <CardDescription>Cerca operazioni TCC per utente</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Email utente..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="h-8"
          />
          <Input
            placeholder="User ID..."
            value={searchUserId}
            onChange={(e) => setSearchUserId(e.target.value)}
            className="h-8 w-24"
            type="number"
          />
          <Button size="sm" onClick={handleSearch} disabled={isLoading} className="h-8">
            <Search className="w-4 h-4 mr-1" />
            Cerca
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : data?.logs?.length ? (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {data.logs.map((log: any) => (
              <div
                key={log.id}
                className="flex items-center gap-3 p-2 rounded border text-sm"
              >
                <span className="text-xs text-muted-foreground w-32 flex-shrink-0">
                  {new Date(log.createdAt).toLocaleString('it-IT')}
                </span>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {log.action}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">
                  {log.userEmail} - {log.entityType}#{log.entityId}
                </span>
              </div>
            ))}
          </div>
        ) : data ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nessun risultato trovato
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FraudMonitorPanel() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-teal-400" />
        <div>
          <h2 className="text-lg font-semibold">Monitoraggio Anti-Frode TCC</h2>
          <p className="text-sm text-muted-foreground">
            Sorveglianza eventi sospetti, limiti e audit trail
          </p>
        </div>
      </div>

      {/* Stats */}
      <FraudStatsCards />

      {/* Events List */}
      <FraudEventsList />

      {/* Audit Trail */}
      <AuditTrailSearch />
    </div>
  );
}
