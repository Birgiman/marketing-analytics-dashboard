import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SupabaseConfig() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [anon, setAnon] = useState("");

  useEffect(() => {
    const storedUrl = localStorage.getItem("SUPABASE_URL") || "";
    const storedAnon = localStorage.getItem("SUPABASE_ANON_KEY") || "";
    setUrl(storedUrl);
    setAnon(storedAnon);
  }, []);

  const handleSave = () => {
    if (!url || !anon) {
      toast.error("Preencha URL e Anon Key");
      return;
    }
    try {
      localStorage.setItem("SUPABASE_URL", url.trim());
      localStorage.setItem("SUPABASE_ANON_KEY", anon.trim());
      toast.success("Configurações salvas. Recarregando...");
      setTimeout(() => {
        window.location.href = "/auth/signin";
      }, 600);
    } catch (e) {
      toast.error("Erro ao salvar configurações");
    }
  };

  const handleClear = () => {
    localStorage.removeItem("SUPABASE_URL");
    localStorage.removeItem("SUPABASE_ANON_KEY");
    toast.success("Configurações limpas");
  };

  return (
    <div className="flex w-full items-center justify-center py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Configuração do Supabase</CardTitle>
          <CardDescription>
            Defina a URL e a Anon Key do seu novo projeto Supabase. Essas informações ficam salvas no seu navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="url">Supabase URL</Label>
            <Input id="url" placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anon">Supabase Anon Key</Label>
            <Input id="anon" placeholder="eyJhbGciOi..." value={anon} onChange={(e) => setAnon(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave}>Salvar e reiniciar</Button>
            <Button variant="outline" onClick={handleClear}>Limpar</Button>
            <Button variant="secondary" onClick={() => navigate(-1)}>Voltar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
