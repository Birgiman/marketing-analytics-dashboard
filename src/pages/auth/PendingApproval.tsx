import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function PendingApproval() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <>
      <title>Aguardando Aprovação - Live Shop Analytics</title>
      
      <main className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-muted rounded-full">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">
                Conta Aguardando Aprovação
              </h2>
              <p className="text-muted-foreground">
                Sua conta foi temporariamente desabilitada.
              </p>
              <p className="text-muted-foreground">
                Entre em contato com o administrador para reativar sua conta.
              </p>
            </div>

            <Button 
              onClick={handleSignOut}
              variant="outline"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Sair da Conta
            </Button>

            <div className="text-sm text-muted-foreground">
              LiveShop Analytics - Sistema de Gestão
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}