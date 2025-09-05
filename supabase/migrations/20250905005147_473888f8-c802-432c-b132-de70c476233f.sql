-- Inserir dados de teste para demonstração
-- Estes dados serão associados a usuários reais quando forem criados

-- Dados de teste para Lives
INSERT INTO public.lives (
  id, user_id, name, live_date, captacao_start, ta_rolando_start, ta_rolando_end,
  participants, sales, revenue, current_viewers, peak_viewers
) VALUES 
(
  'test-live-1', 
  'test-user-123', 
  'Live Demo - Moda Verão 2024',
  now() + interval '2 days',
  now() + interval '1 day 23 hours',
  now() + interval '2 days',
  now() + interval '2 days 2 hours',
  2340, 45, 8900.50, 0, 2340
),
(
  'test-live-2',
  'test-user-123',
  'Live Black Friday Especial',
  now() + interval '7 days',
  now() + interval '6 days 23 hours', 
  now() + interval '7 days',
  now() + interval '7 days 3 hours',
  0, 0, 0, 0, 0
) ON CONFLICT (id) DO NOTHING;

-- Dados de teste para Grupos
INSERT INTO public.grupos (
  id, user_id, data_hora, data, hora, id_grupo, nome_grupo, telefone, evento
) VALUES 
(
  'test-group-1',
  'test-user-123',
  now() - interval '2 hours',
  to_char(now(), 'YYYY-MM-DD'),
  to_char(now() - interval '2 hours', 'HH24:MI'),
  'test-group-vip@g.us',
  'Grupo VIP - Moda Feminina',
  '+5511987654321',
  'entrada'
),
(
  'test-group-2', 
  'test-user-123',
  now() - interval '4 hours',
  to_char(now(), 'YYYY-MM-DD'),
  to_char(now() - interval '4 hours', 'HH24:MI'),
  'test-group-ofertas@g.us',
  'Ofertas Exclusivas',
  '+5511876543210',
  'mensagem'
) ON CONFLICT (id) DO NOTHING;

-- Dados de teste para Criativos
INSERT INTO public.criativos (
  id, user_id, day, campaign_name, ad_set_name, ad_name, 
  amount_spent, leads, cost_per_lead, creative_link
) VALUES 
(
  'test-creative-1',
  'test-user-123', 
  to_char(now() - interval '1 day', 'YYYY-MM-DD'),
  'Campanha Moda Verão',
  'Público Feminino 25-45',
  'Vestidos Florais - Vídeo',
  1250.90, 87, 14.38,
  'https://facebook.com/ads/test/creative1'
),
(
  'test-creative-2',
  'test-user-123',
  to_char(now(), 'YYYY-MM-DD'), 
  'Campanha Acessórios',
  'Lookalike Compradores',
  'Bolsas Premium - Carrossel',
  890.50, 45, 19.79,
  'https://facebook.com/ads/test/creative2'
) ON CONFLICT (id) DO NOTHING;