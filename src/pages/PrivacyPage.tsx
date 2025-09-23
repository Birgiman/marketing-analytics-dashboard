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
            <p className="text-sm text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                1. Informações que Coletamos
              </h2>
              <p>
                Coletamos as seguintes informações quando você usa nossa plataforma:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Dados de cadastro (nome, e-mail, senha)</li>
                <li>Dados de login e autenticação</li>
                <li>Dados de campanhas do Meta Ads (quando autorizado)</li>
                <li>Dados de grupos do WhatsApp (quando autorizado)</li>
                <li>Informações de uso da plataforma</li>
                <li>Dados de performance e métricas das suas campanhas</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                2. Como Usamos suas Informações
              </h2>
              <p>
                Utilizamos suas informações para:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fornecer acesso à plataforma e funcionalidades</li>
                <li>Exibir relatórios de performance das suas campanhas</li>
                <li>Permitir integração com Meta Ads e WhatsApp</li>
                <li>Oferecer suporte técnico</li>
                <li>Melhorar nossos serviços</li>
                <li>Cumprir obrigações legais</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                3. Compartilhamento de Dados
              </h2>
              <p>
                Não compartilhamos seus dados pessoais com terceiros, exceto:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Com o Meta (Facebook) para integração de campanhas publicitárias</li>
                <li>Com provedores de serviços essenciais (hospedagem, segurança)</li>
                <li>Quando exigido por lei ou ordem judicial</li>
                <li>Com seu consentimento explícito</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                4. Seus Direitos
              </h2>
              <p>
                Você tem o direito de:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir informações incorretas</li>
                <li>Solicitar a exclusão de seus dados</li>
                <li>Revogar consentimentos dados</li>
                <li>Portabilidade dos dados</li>
                <li>Oposição ao processamento</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                5. Segurança dos Dados
              </h2>
              <p>
                Implementamos medidas de segurança técnicas e organizacionais para proteger 
                seus dados contra acesso não autorizado, alteração, divulgação ou destruição.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                6. Retenção de Dados
              </h2>
              <p>
                Mantemos seus dados apenas pelo tempo necessário para cumprir as finalidades 
                descritas nesta política ou conforme exigido por lei.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                7. Contato
              </h2>
              <p>
                Para questões sobre esta Política de Privacidade ou para exercer seus direitos, 
                entre em contato conosco:
              </p>
              <div className="bg-muted p-4 rounded-lg mt-4">
                <p><strong>E-mail:</strong> suporte@liveshop.com</p>
                <p><strong>Assunto:</strong> Política de Privacidade</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                8. Alterações
              </h2>
              <p>
                Esta Política de Privacidade pode ser atualizada periodicamente. 
                Notificaremos sobre mudanças significativas através da plataforma ou por e-mail.
              </p>
            </section>
          </div>
        </div>
      </Container>
    </div>
  );
}
