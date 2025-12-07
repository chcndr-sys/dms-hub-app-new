import { Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CouncilPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="h-[calc(100vh-2rem)] border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20 bg-purple-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Scale className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Concilio AI
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Il Consiglio degli LLM per decisioni ponderate
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-5rem)]">
          <iframe
            src="https://council.mio-hub.me"
            className="w-full h-full border-0"
            title="LLM Council"
            allow="clipboard-read; clipboard-write"
          />
        </CardContent>
      </Card>
    </div>
  );
}
