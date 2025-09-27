-- ===============================================
-- QUERIES DE DEBUG PARA INVESTIGAR DADOS WHATSAPP
-- ===============================================
-- Use estas queries no Dashboard do Supabase para investigar os dados manualmente

-- ===============================================
-- 1. VERIFICAR QUANTOS REGISTROS EXISTEM NO TOTAL
-- ===============================================
-- Esta query mostra se realmente temos mais de 1000 registros
SELECT
    event,
    COUNT(*) as total_registros
FROM whatsapp_groups_log
WHERE created_at >= '2025-09-20'
    AND created_at <= '2025-09-27'
GROUP BY event
ORDER BY event;

-- ===============================================
-- 2. CONTAR REGISTROS POR DIA (TODOS OS GRUPOS)
-- ===============================================
-- Esta query mostra a distribuição por data
SELECT
    DATE(created_at) as data,
    event,
    COUNT(*) as quantidade
FROM whatsapp_groups_log
WHERE created_at >= '2025-09-20'
    AND created_at <= '2025-09-27'
GROUP BY DATE(created_at), event
ORDER BY data, event;

-- ===============================================
-- 3. QUERY EXATA QUE A EDGE FUNCTION FAZ (JOINS)
-- ===============================================
-- Substitua os IDs pelos IDs reais dos seus 14 grupos
SELECT id_grupo, created_at
FROM whatsapp_groups_log
WHERE id_grupo IN (
    '120363401335190479@g.us',
    '120363403452656181@g.us',
    '120363404126599412@g.us',
    '120363404583977918@g.us',
    '120363405322637646@g.us',
    '120363419675473627@g.us',
    '120363420119643441@g.us',
    '120363420366624775@g.us',
    '120363420975355965@g.us',
    '120363421446339161@g.us',
    '120363421655730980@g.us',
    '120363421765818010@g.us',
    '120363422081581308@g.us',
    '120363422157564090@g.us'
)
AND event = 'join'
AND created_at >= '2025-09-20'
AND created_at <= '2025-09-27'
ORDER BY created_at;

-- ===============================================
-- 4. QUERY EXATA QUE A EDGE FUNCTION FAZ (EXITS)
-- ===============================================
SELECT id_grupo, created_at
FROM whatsapp_groups_log
WHERE id_grupo IN (
    '120363401335190479@g.us',
    '120363403452656181@g.us',
    '120363404126599412@g.us',
    '120363404583977918@g.us',
    '120363405322637646@g.us',
    '120363419675473627@g.us',
    '120363420119643441@g.us',
    '120363420366624775@g.us',
    '120363420975355965@g.us',
    '120363421446339161@g.us',
    '120363421655730980@g.us',
    '120363421765818010@g.us',
    '120363422081581308@g.us',
    '120363422157564090@g.us'
)
AND event = 'leave'
AND created_at >= '2025-09-20'
AND created_at <= '2025-09-27'
ORDER BY created_at;

-- ===============================================
-- 5. BUSCAR IDS DOS GRUPOS DA LIVE
-- ===============================================
-- Use esta query para pegar os IDs corretos dos grupos da sua live
SELECT
    lg.group_id,
    lg.group_name
FROM lives_groups lg
WHERE lg.live_id = 'SEU_LIVE_ID_AQUI'
ORDER BY lg.group_name;

-- ===============================================
-- 6. VERIFICAR FORMATO DAS DATAS
-- ===============================================
-- Esta query mostra o formato exato das datas no banco
SELECT
    created_at,
    DATE(created_at) as data_extraida,
    id_grupo,
    event
FROM whatsapp_groups_log
WHERE created_at >= '2025-09-20'
    AND created_at <= '2025-09-27'
ORDER BY created_at
LIMIT 10;

-- ===============================================
-- 7. CONTAR REGISTROS POR GRUPO ESPECÍFICO
-- ===============================================
-- Esta query mostra quantos registros cada grupo tem
SELECT
    id_grupo,
    event,
    COUNT(*) as total
FROM whatsapp_groups_log
WHERE created_at >= '2025-09-20'
    AND created_at <= '2025-09-27'
    AND id_grupo IN (
        '120363401335190479@g.us',
        '120363403452656181@g.us',
        '120363404126599412@g.us',
        '120363404583977918@g.us',
        '120363405322637646@g.us',
        '120363419675473627@g.us',
        '120363420119643441@g.us',
        '120363420366624775@g.us',
        '120363420975355965@g.us',
        '120363421446339161@g.us',
        '120363421655730980@g.us',
        '120363421765818010@g.us',
        '120363422081581308@g.us',
        '120363422157564090@g.us'
    )
GROUP BY id_grupo, event
ORDER BY id_grupo, event;

-- ===============================================
-- 8. BUSCAR AMOSTRAS DOS DADOS "PERDIDOS"
-- ===============================================
-- Esta query vai mostrar registros dos dias 22-27 se existirem
SELECT
    DATE(created_at) as data,
    id_grupo,
    event,
    COUNT(*) as quantidade
FROM whatsapp_groups_log
WHERE DATE(created_at) IN ('2025-09-22', '2025-09-23', '2025-09-24', '2025-09-25', '2025-09-26', '2025-09-27')
    AND id_grupo IN (
        '120363401335190479@g.us',
        '120363403452656181@g.us',
        '120363404126599412@g.us',
        '120363404583977918@g.us',
        '120363405322637646@g.us',
        '120363419675473627@g.us',
        '120363420119643441@g.us',
        '120363420366624775@g.us',
        '120363420975355965@g.us',
        '120363421446339161@g.us',
        '120363421655730980@g.us',
        '120363421765818010@g.us',
        '120363422081581308@g.us',
        '120363422157564090@g.us'
    )
GROUP BY DATE(created_at), id_grupo, event
ORDER BY data, id_grupo, event;

-- ===============================================
-- 9. VERIFICAR SE HÁ MAIS DE 1000 JOINS
-- ===============================================
-- Esta query vai confirmar se o problema é realmente a paginação
SELECT COUNT(*) as total_joins
FROM whatsapp_groups_log
WHERE event = 'join'
    AND created_at >= '2025-09-20'
    AND created_at <= '2025-09-27'
    AND id_grupo IN (
        '120363401335190479@g.us',
        '120363403452656181@g.us',
        '120363404126599412@g.us',
        '120363404583977918@g.us',
        '120363405322637646@g.us',
        '120363419675473627@g.us',
        '120363420119643441@g.us',
        '120363420366624775@g.us',
        '120363420975355965@g.us',
        '120363421446339161@g.us',
        '120363421655730980@g.us',
        '120363421765818010@g.us',
        '120363422081581308@g.us',
        '120363422157564090@g.us'
    );

-- ===============================================
-- INSTRUÇÕES DE USO:
-- ===============================================
-- 1. Copie e cole estas queries uma por vez no Dashboard do Supabase
-- 2. Substitua 'SEU_LIVE_ID_AQUI' pelo ID real da sua live na query #5
-- 3. A query #1 vai te dizer se temos mais de 1000 registros total
-- 4. A query #2 vai mostrar se existem dados nos dias 22-27
-- 5. As queries #3 e #4 são exatamente o que a Edge Function fazia antes da paginação
-- 6. Se a query #9 retornar mais de 1000, confirmamos que era problema de paginação
-- ===============================================