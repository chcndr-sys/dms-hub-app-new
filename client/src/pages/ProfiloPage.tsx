import { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Shield, Key, LogOut, Download, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLocation } from 'wouter';

interface UserInfo {
  email: string;
  name?: string;
  fiscalCode?: string;
  base_role?: string;
  is_super_admin?: boolean;
  authMethod?: string;
  assigned_roles?: Array<{ role_code: string; role_id: number }>;
}

export default function ProfiloPage() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleExportData = () => {
    if (!user) return;
    const data = {
      exportDate: new Date().toISOString(),
      userData: user,
      note: "Esportazione dati personali ai sensi dell'Art. 20 GDPR",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dms-hub-dati-personali-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteRequest = () => {
    const subject = encodeURIComponent('Richiesta cancellazione dati - Art. 17 GDPR');
    const body = encodeURIComponent(
      `Richiedo la cancellazione dei miei dati personali ai sensi dell'Art. 17 del GDPR.\n\nEmail: ${user?.email || ''}\nData: ${new Date().toISOString()}`
    );
    window.location.href = `mailto:privacy@dms-hub.it?subject=${subject}&body=${body}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full border-border">
          <CardContent className="p-8 text-center space-y-4">
            <User className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Accesso richiesto</h2>
            <p className="text-sm text-muted-foreground">
              Effettua il login per vedere il tuo profilo.
            </p>
            <Button onClick={() => navigate('/login')} className="bg-teal-600 hover:bg-teal-500">
              Vai al login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1 as unknown as string)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>

        <Card className="border-teal-500/20">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-teal-500/10">
                <User className="h-8 w-8 text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-xl">{user.name || 'Utente'}</CardTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Info base */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Informazioni</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Ruolo</span>
                  <div className="mt-1">
                    <Badge variant="outline" className="border-teal-500/30 text-teal-400">
                      <Shield className="h-3 w-3 mr-1" />
                      {user.is_super_admin ? 'Super Admin' : user.base_role || 'Utente'}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Metodo di accesso</span>
                  <div className="mt-1">
                    <Badge variant="outline">
                      <Key className="h-3 w-3 mr-1" />
                      {user.authMethod || 'Email'}
                    </Badge>
                  </div>
                </div>
                {user.fiscalCode && (
                  <div className="p-3 rounded-lg bg-muted/30 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">Codice Fiscale</span>
                    <p className="mt-1 font-mono text-sm">{user.fiscalCode}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Ruoli assegnati */}
            {user.assigned_roles && user.assigned_roles.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Ruoli assegnati</h3>
                <div className="flex flex-wrap gap-2">
                  {user.assigned_roles.map((role) => (
                    <Badge key={role.role_id} variant="secondary">
                      {role.role_code}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            <Separator />

            {/* Diritti GDPR */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">I tuoi diritti (GDPR)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleExportData}
                  className="justify-start border-teal-500/20 hover:bg-teal-500/10"
                >
                  <Download className="h-4 w-4 mr-2 text-teal-400" />
                  Scarica i miei dati
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeleteRequest}
                  className="justify-start border-red-500/20 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4 mr-2 text-red-400" />
                  Richiedi cancellazione
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ai sensi degli Art. 15-22 del Regolamento (UE) 2016/679. La richiesta di
                cancellazione non si applica ai dati soggetti a obbligo legale di conservazione.
              </p>
            </section>

            <Separator />

            {/* Logout */}
            <Button
              variant="destructive"
              onClick={() => {
                localStorage.removeItem('user');
                sessionStorage.clear();
                navigate('/');
              }}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Esci dall'account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
