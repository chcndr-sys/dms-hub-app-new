import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-lg mx-4 border-border bg-card">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <AlertCircle className="h-16 w-16 text-destructive" aria-hidden="true" />
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>

          <h2 className="text-xl font-semibold text-muted-foreground mb-4">
            Pagina non trovata
          </h2>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            La pagina che stai cercando non esiste.
            <br />
            Potrebbe essere stata spostata o rimossa.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleGoHome}
              className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-2.5 rounded-lg"
            >
              <Home className="w-4 h-4 mr-2" aria-hidden="true" />
              Torna alla home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
