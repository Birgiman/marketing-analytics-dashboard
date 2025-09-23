import { Container } from "@/components/ui/container";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Container className="py-8 max-w-4xl">
        <div className="prose prose-gray max-w-none">
          <h1 className="text-3xl font-bold text-foreground mb-8">
            Termos de Uso – LiveShop Data Manager
          </h1>
          
          <div className="space-y-6 text-muted-foreground">
            <p className="text-lg">
              Estes Termos de Uso ("Termos") regulam o acesso e a utilização da plataforma <strong>LiveShop Analytics</strong> ("Aplicativo") e estabelecem as condições para todos os usuários ("Usuário"). Ao criar uma conta ou utilizar o Aplicativo, o Usuário confirma que leu, entendeu e concorda integralmente com estes Termos.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                1. Objeto
              </h2>
              <p>
                A plataforma LiveShop Analytics tem como finalidade integrar, consolidar e exibir dados provenientes de diversas fontes, como:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Contas de mídia paga (ex.: Meta Ads);</li>
                <li>Grupos de WhatsApp;</li>
                <li>Sistemas de e-commerce e RPs;</li>
                <li>Planilhas e arquivos enviados pelo Usuário;</li>
                <li>Outras ferramentas que venham a ser integradas.</li>
              </ul>
              <p className="mt-4">
                O objetivo é permitir a visualização e análise desses dados em um painel personalizado, com métricas de performance e relatórios de apoio à gestão.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                2. Coleta e Tratamento de Dados
              </h2>
              <p>
                2.1. O Usuário autoriza a coleta, registro e armazenamento dos dados provenientes das integrações que configurar na plataforma.
              </p>
              <p>
                2.2. Os dados poderão ser utilizados para:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Exibir métricas, relatórios e análises personalizadas no painel do Usuário;</li>
                <li>Melhorar a experiência, funcionalidades e suporte do Aplicativo;</li>
                <li>Elaborar estudos comparativos e análises de benchmark, sempre de forma <strong>anonimizada e agregada</strong>, sem identificação individual do Usuário ou de sua empresa.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                3. Privacidade e Segurança
              </h2>
              <p>
                3.1. A plataforma adota medidas de segurança técnicas e administrativas razoáveis para proteger os dados contra acessos não autorizados, perda, alteração ou uso indevido.
              </p>
              <p>
                3.2. O Usuário é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                4. Direitos do Usuário
              </h2>
              <p>
                O Usuário poderá, a qualquer momento:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Solicitar informações sobre os dados armazenados;</li>
                <li>Requerer a exclusão definitiva de seus dados, ressalvadas obrigações legais de retenção;</li>
                <li>Solicitar a portabilidade de seus dados, quando aplicável.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                5. Uso Autorizado e Restrições
              </h2>
              <p>
                5.1. O Usuário se compromete a utilizar a plataforma de forma lícita e em conformidade com a legislação aplicável.
              </p>
              <p>
                5.2. Não é permitido:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Utilizar a plataforma de forma que comprometa sua integridade ou funcionamento;</li>
                <li>Tentar acessar, manipular ou obter dados de outros usuários;</li>
                <li>Ceder, comercializar ou compartilhar o acesso à conta sem autorização.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                6. Limitações de Responsabilidade
              </h2>
              <p>
                6.1. A plataforma poderá depender de integrações externas (ex.: Meta Ads, WhatsApp, e-commerce). Eventuais falhas, indisponibilidades ou alterações nessas ferramentas não são de responsabilidade do Aplicativo.
              </p>
              <p>
                6.2. O Aplicativo é disponibilizado "no estado em que se encontra" e não garante resultados específicos, ainda que seja projetado para auxiliar na análise e gestão de dados.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                7. Alterações nos Termos
              </h2>
              <p>
                Estes Termos poderão ser alterados a qualquer momento, mediante publicação da versão atualizada no Aplicativo. O uso contínuo após a atualização será considerado como aceitação das novas condições.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                8. Vigência e Encerramento
              </h2>
              <p>
                O acesso do Usuário à plataforma permanecerá vigente enquanto houver utilização ativa. O acesso poderá ser suspenso ou encerrado em caso de violação destes Termos ou uso indevido da plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                9. Disposições Gerais
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Caso qualquer cláusula destes Termos seja considerada inválida ou inexequível, as demais permanecerão em vigor.</li>
                <li>Estes Termos são regidos pela legislação brasileira, ficando eleito o foro da comarca da sede da empresa responsável pelo Aplicativo para dirimir eventuais controvérsias.</li>
              </ul>
            </section>
          </div>
        </div>
      </Container>
    </div>
  );
}
