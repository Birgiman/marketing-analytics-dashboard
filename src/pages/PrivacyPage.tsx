import { AppSidebar } from "@/components/AppSidebar";
import Header from "@/components/Header";
import { Container } from "@/components/ui/container";
import { SidebarProvider } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export default function PrivacyPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const content = (
    <Container className="py-8 max-w-4xl">
        <div className="prose prose-gray max-w-none">
          <h1 className="text-3xl font-bold text-foreground mb-8">
            Privacy Policy
          </h1>
          
          <div className="space-y-6 text-muted-foreground">
            <p className="text-lg">
              Please fill in your privacy policy here.
            </p>
            <p>
              This is a placeholder for your application's privacy policy. Replace this content with your actual privacy policy and data handling practices.
            </p>

            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-muted-foreground">
                Last updated: September 2025
              </p>
            </div>
          </div>
        </div>
      </Container>
  );

  if (isAuthenticated) {
    return (
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 bg-background">
            <Header />
            {content}
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {content}
    </div>
  );
}
