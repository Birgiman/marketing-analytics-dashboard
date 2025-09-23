import { Container } from "@/components/ui/container";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Container className="py-8 max-w-4xl">
        <div className="prose prose-gray max-w-none">
          <h1 className="text-3xl font-bold text-foreground mb-8">
            Política de Privacidade
          </h1>
          
          <div className="space-y-6 text-muted-foreground">
            <p className="text-lg">
              A sua privacidade é importante para nós. Esta Política de Privacidade explica como o LiveShop coleta, usa e protege os seus dados.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Dados que coletamos
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Informações de cadastro (nome, e-mail, senha).</li>
                <li>Dados de login via Facebook/Meta para integração com a Marketing API.</li>
                <li>Dados de campanhas e anúncios fornecidos pela API do Meta.</li>
                <li>Informações de uso da plataforma (relatórios e interações com as lives).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Como utilizamos seus dados
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Para permitir login e autenticação segura.</li>
                <li>Para exibir relatórios de desempenho das campanhas de anúncios.</li>
                <li>Para melhorar a experiência de uso e oferecer suporte técnico.</li>
                <li>Para manter registros internos e análises de uso da plataforma.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Compartilhamento de dados
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Seus dados não são vendidos a terceiros.</li>
                <li>O compartilhamento ocorre apenas quando necessário para o funcionamento do serviço, como no caso da API do Meta ou do Google Forms.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Direitos do usuário
              </h2>
              <p>
                Você pode, a qualquer momento, solicitar acesso, correção ou exclusão dos seus dados pessoais entrando em contato com nosso suporte.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Contato
              </h2>
              <p>
                Para dúvidas ou solicitações relacionadas à privacidade, entre em contato pelo e-mail: <strong>suporte@liveshop.com</strong>
              </p>
            </section>

            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-muted-foreground">
                Última atualização: Setembro de 2025
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
