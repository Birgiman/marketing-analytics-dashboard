import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create live_campaigns table
    const { error: createTableError } = await supabase.rpc('execute_sql', {
      sql: `
        -- Create live_campaigns table to link Meta campaigns to lives
        CREATE TABLE IF NOT EXISTS public.live_campaigns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          live_id UUID NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
          campaign_id TEXT NOT NULL,
          campaign_name TEXT NOT NULL,
          account_id TEXT,
          account_name TEXT,
          objective TEXT,
          status TEXT,
          daily_budget NUMERIC,
          lifetime_budget NUMERIC,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(live_id, campaign_id)
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_live_campaigns_live_id ON public.live_campaigns(live_id);
        CREATE INDEX IF NOT EXISTS idx_live_campaigns_campaign_id ON public.live_campaigns(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_live_campaigns_status ON public.live_campaigns(status);

        -- RLS Policies
        ALTER TABLE public.live_campaigns ENABLE ROW LEVEL SECURITY;
      `
    })

    if (createTableError) {
      console.error('Error creating table:', createTableError)
      return new Response(JSON.stringify({ error: createTableError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create RLS policies
    const policies = [
      {
        name: 'Users can view campaign links for own lives',
        definition: `CREATE POLICY "Users can view campaign links for own lives" ON public.live_campaigns
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.lives l 
              WHERE l.id = live_campaigns.live_id 
              AND l.user_id = auth.uid()
            )
          )`
      },
      {
        name: 'Users can insert campaign links for own lives',
        definition: `CREATE POLICY "Users can insert campaign links for own lives" ON public.live_campaigns
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.lives l 
              WHERE l.id = live_campaigns.live_id 
              AND l.user_id = auth.uid()
            )
          )`
      },
      {
        name: 'Users can update campaign links for own lives',
        definition: `CREATE POLICY "Users can update campaign links for own lives" ON public.live_campaigns
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM public.lives l 
              WHERE l.id = live_campaigns.live_id 
              AND l.user_id = auth.uid()
            )
          )`
      },
      {
        name: 'Users can delete campaign links for own lives',
        definition: `CREATE POLICY "Users can delete campaign links for own lives" ON public.live_campaigns
          FOR DELETE USING (
            EXISTS (
              SELECT 1 FROM public.lives l 
              WHERE l.id = live_campaigns.live_id 
              AND l.user_id = auth.uid()
            )
          )`
      }
    ]

    for (const policy of policies) {
      const { error: policyError } = await supabase.rpc('execute_sql', {
        sql: `DROP POLICY IF EXISTS "${policy.name}" ON public.live_campaigns; ${policy.definition};`
      })

      if (policyError) {
        console.error(`Error creating policy ${policy.name}:`, policyError)
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'live_campaigns table created successfully with RLS policies' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Migration error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})