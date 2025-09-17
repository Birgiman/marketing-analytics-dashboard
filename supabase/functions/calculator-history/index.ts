import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface CalculatorInputs {
  ticketMedio: number;
  diasCaptacao: number;
  orcamento: number;
  cplLiquido: number;
  comparecimento: number;
  conversao: number;
}

interface CalculatorResults {
  leadsPrevistos: number;
  participantesPrevistos: number;
  vendasPrevistas: number;
  receitaPrevista: number;
  roi: number;
  lucro: number;
  margemLucro: number;
}

interface CalculatorHistoryRecord {
  id: string;
  name: string;
  inputs: CalculatorInputs;
  results: CalculatorResults;
  created_at: string;
  updated_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the JWT token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const url = new URL(req.url)
    const method = req.method

    // GET - List calculator history
    if (method === 'GET') {
      const { data, error } = await supabaseClient
        .from('calculator_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching calculator history:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch calculator history' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ data }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // POST - Save new calculation
    if (method === 'POST') {
      const body = await req.json()
      const { name, inputs, results } = body

      // Validate required fields
      if (!name || !inputs || !results) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: name, inputs, results' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate inputs structure
      const requiredInputFields = ['ticketMedio', 'diasCaptacao', 'orcamento', 'cplLiquido', 'comparecimento', 'conversao']
      for (const field of requiredInputFields) {
        if (typeof inputs[field] !== 'number') {
          return new Response(
            JSON.stringify({ error: `Invalid input field: ${field} must be a number` }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }

      // Validate results structure
      const requiredResultFields = ['leadsPrevistos', 'participantesPrevistos', 'vendasPrevistas', 'receitaPrevista', 'roi', 'lucro', 'margemLucro']
      for (const field of requiredResultFields) {
        if (typeof results[field] !== 'number') {
          return new Response(
            JSON.stringify({ error: `Invalid result field: ${field} must be a number` }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }

      const { data, error } = await supabaseClient
        .from('calculator_history')
        .insert({
          user_id: user.id,
          name,
          inputs,
          results
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving calculator history:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to save calculation' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ data }),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // DELETE - Remove calculation
    if (method === 'DELETE') {
      const calculationId = url.searchParams.get('id')

      if (!calculationId) {
        return new Response(
          JSON.stringify({ error: 'Missing calculation ID' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { error } = await supabaseClient
        .from('calculator_history')
        .delete()
        .eq('id', calculationId)
        .eq('user_id', user.id) // Ensure user can only delete their own calculations

      if (error) {
        console.error('Error deleting calculator history:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to delete calculation' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
