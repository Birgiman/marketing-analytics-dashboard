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

    // Create live_campaigns table using raw SQL execution
    const createTableSql = `
        -- Create live_campaigns table to link Meta campaigns to lives
        CREATE TABLE IF NOT EXISTS public.live_campaigns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          live_id UUID NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          instance_name TEXT,
          campaign_id TEXT NOT NULL,
          campaign_name TEXT NOT NULL,
          ad_set_name TEXT,
          account_id TEXT,
          account_name TEXT,
          objective TEXT,
          status TEXT,
          daily_budget NUMERIC,
          lifetime_budget NUMERIC,
          budget_remaining NUMERIC,
          start_time TIMESTAMPTZ,
          stop_time TIMESTAMPTZ,
          leads INTEGER DEFAULT 0,
          spend NUMERIC DEFAULT 0,
          impressions INTEGER DEFAULT 0,
          clicks INTEGER DEFAULT 0,
          cpl NUMERIC DEFAULT 0,
          cpm NUMERIC DEFAULT 0,
          ctr NUMERIC DEFAULT 0,
          last_insight_sync_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(live_id, campaign_id)
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_live_campaigns_live_id ON public.live_campaigns(live_id);
        CREATE INDEX IF NOT EXISTS idx_live_campaigns_campaign_id ON public.live_campaigns(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_live_campaigns_status ON public.live_campaigns(status);
        CREATE INDEX IF NOT EXISTS idx_live_campaigns_user_id ON public.live_campaigns(user_id);

        -- Add missing columns if they don't exist
        DO $$
        BEGIN
          -- Add user_id column if it doesn't exist
          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'user_id') THEN
            ALTER TABLE public.live_campaigns ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
          END IF;

          -- Add instance_name column if it doesn't exist
          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'instance_name') THEN
            ALTER TABLE public.live_campaigns ADD COLUMN instance_name TEXT;
          END IF;

          -- Add other missing columns
          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'ad_set_name') THEN
            ALTER TABLE public.live_campaigns ADD COLUMN ad_set_name TEXT;
          END IF;

          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'budget_remaining') THEN
            ALTER TABLE public.live_campaigns ADD COLUMN budget_remaining NUMERIC;
          END IF;

          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'start_time') THEN
            ALTER TABLE public.live_campaigns ADD COLUMN start_time TIMESTAMPTZ;
          END IF;

          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'stop_time') THEN
            ALTER TABLE public.live_campaigns ADD COLUMN stop_time TIMESTAMPTZ;
          END IF;

          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'leads') THEN
            ALTER TABLE public.live_campaigns ADD COLUMN leads INTEGER DEFAULT 0;
          END IF;

          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'spend') THEN
            ALTER TABLE public.live_campaigns ADD COLUMN spend NUMERIC DEFAULT 0;
          END IF;

          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'impressions') THEN
            ALTER TABLE public.live_campaigns ADD COLUMN impressions INTEGER DEFAULT 0;
          END IF;

          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'clicks') THEN
            ALTER TABLE public.live_campaigns ADD COLUMN clicks INTEGER DEFAULT 0;
          END IF;

          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'cpl') THEN
            ALTER TABLE public.live_campaigns ADD COLUMN cpl NUMERIC DEFAULT 0;
          END IF;

          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'cpm') THEN
            ALTER TABLE public.live_campaigns ADD COLUMN cpm NUMERIC DEFAULT 0;
          END IF;

          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'ctr') THEN
            ALTER TABLE public.live_campaigns ADD COLUMN ctr NUMERIC DEFAULT 0;
          END IF;

          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'last_insight_sync_at') THEN
            ALTER TABLE public.live_campaigns ADD COLUMN last_insight_sync_at TIMESTAMPTZ;
          END IF;
        END $$;

        -- RLS Policies
        ALTER TABLE public.live_campaigns ENABLE ROW LEVEL SECURITY;
      `;

    const { error: createTableError } = await supabase.rpc('execute_sql', {
      sql: createTableSql
    });

    if (createTableError) {
      console.error('Error creating table:', createTableError);
      return new Response(JSON.stringify({ error: createTableError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
    ];

    for (const policy of policies) {
      const { error: policyError } = await supabase.rpc('execute_sql', {
        sql: `DROP POLICY IF EXISTS "${policy.name}" ON public.live_campaigns; ${policy.definition};`
      });

      if (policyError) {
        console.error(`Error creating policy ${policy.name}:`, policyError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'live_campaigns table created successfully with RLS policies' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});