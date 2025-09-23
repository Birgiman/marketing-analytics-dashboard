import { Container } from "@/components/ui/container";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Container className="py-8 max-w-4xl">
        <div className="prose prose-gray max-w-none">
          <h1 className="text-3xl font-bold text-foreground mb-8">
            Termos de Uso
          </h1>
          
          <div className="space-y-6 text-muted-foreground">
            <p className="text-sm text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                1. Aceitação dos Termos
              </h2>
              <p>
                Ao acessar e usar a plataforma LiveShop, você concorda em cumprir e estar 
                sujeito aos seguintes termos e condições de uso.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                2. Descrição do Serviço
              </h2>
              <p>
                O LiveShop é uma plataforma de análise e gestão de campanhas publicitárias 
                que permite:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Integração com Meta Ads para análise de campanhas</li>
                <li>Monitoramento de grupos do WhatsApp</li>
                <li>Geração de relatórios de performance</li>
                <li>Cálculo de métricas de ROI e CPL</li>
                <li>Gestão de leads e conversões</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                3. Conta de Usuário
              </h2>
              <p>
                Para usar nossos serviços, você deve:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fornecer informações verdadeiras e atualizadas</li>
                <li>Manter a confidencialidade de sua senha</li>
                <li>Ser responsável por todas as atividades em sua conta</li>
                <li>Notificar-nos imediatamente sobre uso não autorizado</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                4. Uso Aceitável
              </h2>
              <p>
                Você concorda em não usar a plataforma para:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Atividades ilegais ou não autorizadas</li>
                <li>Violar direitos de terceiros</li>
                <li>Interferir no funcionamento da plataforma</li>
                <li>Tentar acessar contas de outros usuários</li>
                <li>Distribuir malware ou código malicioso</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                5. Integrações de Terceiros
              </h2>
              <p>
                Nossa plataforma integra com:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Meta Ads:</strong> Para acesso a dados de campanhas publicitárias</li>
                <li><strong>WhatsApp:</strong> Para monitoramento de grupos</li>
                <li><strong>Google Forms:</strong> Para coleta de leads</li>
              </ul>
              <p className="mt-4">
                Você é responsável por cumprir os termos de uso desses serviços de terceiros.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                6. Propriedade Intelectual
              </h2>
              <p>
                Todo o conteúdo da plataforma, incluindo textos, gráficos, logos, ícones, 
                imagens e software, é propriedade do LiveShop e está protegido por leis de 
                direitos autorais e marcas registradas.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                7. Limitação de Responsabilidade
              </h2>
              <p>
                O LiveShop não será responsável por:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Perda de dados ou interrupção de serviço</li>
                <li>Danos indiretos ou consequenciais</li>
                <li>Problemas com serviços de terceiros</li>
                <li>Decisões baseadas em dados da plataforma</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                8. Modificações do Serviço
              </h2>
              <p>
                Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer 
                aspecto do serviço a qualquer momento, com ou sem aviso prévio.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                9. Rescisão
              </h2>
              <p>
                Podemos encerrar ou suspender sua conta imediatamente, sem aviso prévio, 
                por violação destes termos ou por qualquer outro motivo a nosso critério.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                10. Lei Aplicável
              </h2>
              <p>
                Estes termos são regidos pelas leis brasileiras. Qualquer disputa será 
                resolvida nos tribunais competentes do Brasil.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                11. Contato
              </h2>
              <p>
                Para questões sobre estes Termos de Uso, entre em contato conosco:
              </p>
              <div className="bg-muted p-4 rounded-lg mt-4">
                <p><strong>E-mail:</strong> suporte@liveshop.com</p>
                <p><strong>Assunto:</strong> Termos de Uso</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                12. Alterações
              </h2>
              <p>
                Estes Termos de Uso podem ser atualizados periodicamente. 
                Notificaremos sobre mudanças significativas através da plataforma ou por e-mail.
              </p>
            </section>
          </div>
        </div>
      </Container>
    </div>
  );
}
