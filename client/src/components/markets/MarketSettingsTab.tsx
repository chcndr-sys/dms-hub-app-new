/**
 * MarketSettingsTab - Impostazioni Orari Mercato
 * 
 * Sotto-tab per configurare:
 * - Orari presenza (inizio/fine)
 * - Orari spazzatura (inizio/fine)
 * - Orari uscita (inizio/fine)
 * - Regole verbali automatici
 * - Giorni per giustifica
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Save, 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  Settings,
  Trash2,
  Calendar,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { MIHUB_API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/hooks/useImpersonation';

interface MarketSettings {
  market_id: number;
  presence_start_time: string;
  presence_end_time: string;
  spunta_presence_start_time: string;
  waste_disposal_start_time: string;
  waste_disposal_end_time: string;
  exit_market_start_time: string;
  exit_market_end_time: string;
  is_active: boolean;
  justification_days: number;
  auto_sanction_rules: {
    PRESENZA_TARDIVA: boolean;
    SPAZZATURA_TARDIVA: boolean;
    USCITA_ANTICIPATA: boolean;
  };
}

interface MarketSettingsTabProps {
  marketId: number;
  marketName: string;
}

export function MarketSettingsTab({ marketId, marketName }: MarketSettingsTabProps) {
  const [settings, setSettings] = useState<MarketSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDefault, setIsDefault] = useState(true);

  // Carica impostazioni
  useEffect(() => {
    loadSettings();
  }, [marketId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${MIHUB_API_BASE_URL}/api/market-settings/${marketId}`);
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
        setIsDefault(data.isDefault);
      } else {
        toast.error('Errore nel caricamento delle impostazioni');
      }
    } catch (error) {
      console.error('Errore:', error);
      toast.error('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const response = await authenticatedFetch(`${MIHUB_API_BASE_URL}/api/market-settings/${marketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || 'Impostazioni salvate');
        setIsDefault(false);
      } else {
        toast.error(data.error || 'Errore nel salvataggio');
      }
    } catch (error) {
      console.error('Errore:', error);
      toast.error('Errore di connessione');
    } finally {
      setSaving(false);
    }
  };

  const updateTime = (field: keyof MarketSettings, value: string) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  const updateAutoSanction = (rule: keyof MarketSettings['auto_sanction_rules'], value: boolean) => {
    if (settings) {
      setSettings({
        ...settings,
        auto_sanction_rules: {
          ...settings.auto_sanction_rules,
          [rule]: value
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
        <span className="ml-2 text-gray-400">Caricamento impostazioni...</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-gray-400">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
        <p>Impossibile caricare le impostazioni</p>
        <Button onClick={loadSettings} className="mt-4">Riprova</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#14b8a6]" />
            Impostazioni Orari - {marketName}
          </h3>
          <p className="text-sm text-gray-400">
            Configura gli orari e le regole per il monitoraggio automatico delle trasgressioni
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isDefault && (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Non configurato
            </Badge>
          )}
          <div className="flex items-center gap-2">
            <Label htmlFor="is-active" className="text-gray-300">Monitoraggio Attivo</Label>
            <Switch
              id="is-active"
              checked={settings.is_active}
              onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
              className="data-[state=checked]:bg-[#14b8a6]"
            />
          </div>
        </div>
      </div>

      {/* Griglia Orari */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Orari Presenza */}
        <Card className="bg-[#0b1220]/50 border-[#14b8a6]/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              Orari Presenza
            </CardTitle>
            <CardDescription className="text-xs">
              Finestra per marcatura presenza titolari
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-400">Inizio</Label>
                <Input
                  type="time"
                  value={settings.presence_start_time}
                  onChange={(e) => updateTime('presence_start_time', e.target.value)}
                  className="bg-[#0b1220] border-[#14b8a6]/30 text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Fine</Label>
                <Input
                  type="time"
                  value={settings.presence_end_time}
                  onChange={(e) => updateTime('presence_end_time', e.target.value)}
                  className="bg-[#0b1220] border-[#14b8a6]/30 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-400">Inizio Spuntisti</Label>
              <Input
                type="time"
                value={settings.spunta_presence_start_time}
                onChange={(e) => updateTime('spunta_presence_start_time', e.target.value)}
                className="bg-[#0b1220] border-[#14b8a6]/30 text-white"
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#14b8a6]/10">
              <span className="text-xs text-gray-400">Verbale automatico</span>
              <Switch
                checked={settings.auto_sanction_rules.PRESENZA_TARDIVA}
                onCheckedChange={(checked) => updateAutoSanction('PRESENZA_TARDIVA', checked)}
                className="data-[state=checked]:bg-red-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Orari Spazzatura */}
        <Card className="bg-[#0b1220]/50 border-[#14b8a6]/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-green-400" />
              Orari Spazzatura
            </CardTitle>
            <CardDescription className="text-xs">
              Finestra per deposito rifiuti
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-400">Inizio</Label>
                <Input
                  type="time"
                  value={settings.waste_disposal_start_time}
                  onChange={(e) => updateTime('waste_disposal_start_time', e.target.value)}
                  className="bg-[#0b1220] border-[#14b8a6]/30 text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Fine</Label>
                <Input
                  type="time"
                  value={settings.waste_disposal_end_time}
                  onChange={(e) => updateTime('waste_disposal_end_time', e.target.value)}
                  className="bg-[#0b1220] border-[#14b8a6]/30 text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#14b8a6]/10">
              <span className="text-xs text-gray-400">Verbale automatico</span>
              <Switch
                checked={settings.auto_sanction_rules.SPAZZATURA_TARDIVA}
                onCheckedChange={(checked) => updateAutoSanction('SPAZZATURA_TARDIVA', checked)}
                className="data-[state=checked]:bg-red-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Orari Uscita */}
        <Card className="bg-[#0b1220]/50 border-[#14b8a6]/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-400" />
              Orari Uscita
            </CardTitle>
            <CardDescription className="text-xs">
              Finestra per uscita dal mercato
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-400">Inizio</Label>
                <Input
                  type="time"
                  value={settings.exit_market_start_time}
                  onChange={(e) => updateTime('exit_market_start_time', e.target.value)}
                  className="bg-[#0b1220] border-[#14b8a6]/30 text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Fine</Label>
                <Input
                  type="time"
                  value={settings.exit_market_end_time}
                  onChange={(e) => updateTime('exit_market_end_time', e.target.value)}
                  className="bg-[#0b1220] border-[#14b8a6]/30 text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#14b8a6]/10">
              <span className="text-xs text-gray-400">Verbale automatico</span>
              <Switch
                checked={settings.auto_sanction_rules.USCITA_ANTICIPATA}
                onCheckedChange={(checked) => updateAutoSanction('USCITA_ANTICIPATA', checked)}
                className="data-[state=checked]:bg-red-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impostazioni Giustifiche */}
      <Card className="bg-[#0b1220]/50 border-[#14b8a6]/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-400" />
            Impostazioni Giustifiche
          </CardTitle>
          <CardDescription className="text-xs">
            Configura i giorni disponibili per inviare giustifiche
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-xs text-gray-400">Giorni per inviare giustifica</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={settings.justification_days}
                onChange={(e) => setSettings({ ...settings, justification_days: parseInt(e.target.value) || 3 })}
                className="bg-[#0b1220] border-[#14b8a6]/30 text-white w-24"
              />
            </div>
            <div className="text-sm text-gray-400">
              Le imprese avranno <span className="text-[#14b8a6] font-semibold">{settings.justification_days} giorni</span> per inviare un certificato di giustifica dopo una trasgressione rilevata.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Riepilogo e Salva */}
      <Card className="bg-[#0b1220]/50 border-[#14b8a6]/20">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-400">
                Stato monitoraggio: {' '}
                {settings.is_active ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Attivo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-gray-500/50 text-gray-400">
                    Disattivato
                  </Badge>
                )}
              </p>
              <p className="text-xs text-gray-500">
                Verbali automatici: {' '}
                {Object.entries(settings.auto_sanction_rules).filter(([_, v]) => v).length} / 3 attivi
              </p>
            </div>
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salva Impostazioni
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
