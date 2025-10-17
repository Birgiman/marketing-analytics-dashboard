// Mock Supabase client SIMPLES para versão demo
// Usa dados diretos do arquivo src/mocks/data.ts

import { DEMO_MODE } from '@/lib/demo-mode';
import {
  MOCK_LIVE,
  MOCK_META_ACCOUNT,
  MOCK_META_CAMPAIGNS,
  MOCK_USER,
  MOCK_WHATSAPP_GROUPS
} from '@/mocks/data';

// Estado simples com persistência no localStorage
const STORAGE_KEY = 'demo_has_created_live';

// Inicializar estado a partir do localStorage
let isLoggedIn = DEMO_MODE; // No demo mode, sempre logado
let hasCreatedLive = localStorage.getItem(STORAGE_KEY) === 'true'; // Flag persistente

export const supabase = {
  auth: {
    getUser: async () => {
      if (!isLoggedIn) {
        return { data: { user: null }, error: null };
      }
      
      return { 
        data: { 
          user: {
            id: MOCK_USER.id,
            email: MOCK_USER.email,
            user_metadata: { 
              full_name: `${MOCK_USER.first_name} ${MOCK_USER.last_name}` 
            },
            created_at: MOCK_USER.created_at
          }
        }, 
        error: null 
      };
    },

    getSession: async () => {
      if (!isLoggedIn) {
        return { data: { session: null }, error: null };
      }

      return { 
        data: { 
          session: {
            access_token: 'demo-token',
            refresh_token: 'demo-refresh-token',
            expires_in: 3600,
            user: {
              id: MOCK_USER.id,
              email: MOCK_USER.email,
              user_metadata: { 
                full_name: `${MOCK_USER.first_name} ${MOCK_USER.last_name}` 
              },
              created_at: MOCK_USER.created_at
            }
          }
        }, 
        error: null 
      };
    },

    signOut: async () => {
      isLoggedIn = false;
      hasCreatedLive = false;
      localStorage.removeItem(STORAGE_KEY); // Limpar localStorage
      return { error: null };
    },

    signInWithPassword: async (credentials: { email: string; password: string }) => {
      if (credentials.email === 'demo@marketing-analytics.com' && credentials.password === '12345678') {
        isLoggedIn = true;
        
        return { 
          data: { 
            user: {
              id: MOCK_USER.id,
              email: MOCK_USER.email,
              user_metadata: { 
                full_name: `${MOCK_USER.first_name} ${MOCK_USER.last_name}` 
              },
              created_at: MOCK_USER.created_at
            },
            session: {
              access_token: 'demo-token',
              refresh_token: 'demo-refresh-token',
              expires_in: 3600,
              user: {
                id: MOCK_USER.id,
                email: MOCK_USER.email,
                user_metadata: { 
                  full_name: `${MOCK_USER.first_name} ${MOCK_USER.last_name}` 
                },
                created_at: MOCK_USER.created_at
              }
            }
          }, 
          error: null 
        };
      }
      
      return { data: null, error: { message: 'Invalid login credentials' } };
    },

    signUp: async () => ({ data: { user: null, session: null }, error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
  },

  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        eq: (column2: string, value2: any) => ({
          single: async () => {
            return { data: null, error: null };
          },
          limit: (count: number) => ({
            data: [],
            error: null
          }),
          data: [],
          error: null,
        }),
        single: async () => {
          // Retornar profile do usuário
          if (table === 'profiles') {
            return {
              data: {
                id: `profile-${MOCK_USER.id}`,
                user_id: MOCK_USER.id,
                status: MOCK_USER.status,
                first_name: MOCK_USER.first_name,
                last_name: MOCK_USER.last_name,
                phone: MOCK_USER.phone,
                created_at: MOCK_USER.created_at
              },
              error: null
            };
          }

          // Retornar live específica por ID (suporta tabelas 'lives' e 'captações')
          if ((table === 'lives' || table === 'captações') && column === 'id' && value === MOCK_LIVE.id) {
            return { data: MOCK_LIVE, error: null };
          }

          return { data: null, error: null };
        },
        order: (column: string, options?: { ascending?: boolean }) => ({
          data: [],
          error: null,
        }),
        data: [],
        error: null,
      }),
      data: [],
      error: null,
    }),

    insert: (data: any) => ({
      select: () => ({
        single: async () => {
          if (table === 'captações') {
            hasCreatedLive = true;
            localStorage.setItem(STORAGE_KEY, 'true'); // Persistir no localStorage
            return { data: MOCK_LIVE, error: null };
          }

          if (table === 'whatsapp_groups' || table === 'live_groups' || table === 'live_campaigns') {
            return { data: data, error: null };
          }

          return { data: null, error: null };
        },
        // Para compatibilidade com código que não usa .single()
        then: async (resolve: any) => {
          if (table === 'captações') {
            hasCreatedLive = true;
            localStorage.setItem(STORAGE_KEY, 'true');
            return resolve({ data: [MOCK_LIVE], error: null });
          }
          return resolve({ data: [], error: null });
        }
      }),
      then: async (resolve: any) => {
        if (table === 'captações') {
          hasCreatedLive = true;
          localStorage.setItem(STORAGE_KEY, 'true');
          return resolve({ data: [MOCK_LIVE], error: null });
        }
        return resolve({ data: [], error: null });
      }
    }),

    // Funções personalizadas para busca
    searchGroups: async (searchTerm: string) => {
      return { data: MOCK_WHATSAPP_GROUPS, error: null };
    },

    searchCampaigns: async (searchTerm: string) => {
      return { data: MOCK_META_CAMPAIGNS, error: null };
    },

    update: () => ({
      eq: async (column: string, value: any) => {
        return { data: [], error: null };
      },
    }),

    delete: () => ({
      eq: async (column: string, value: any) => {
        if (table === 'captações') {
          hasCreatedLive = false;
          localStorage.removeItem(STORAGE_KEY);
        }
        return { data: null, error: null };
      },
    }),
  }),

  // Mock para Edge Functions
  functions: {
    invoke: async (functionName: string, options?: any) => {
      // No modo demo, não fazer nada e retornar sucesso
      return {
        data: { 
          status: 'success',
          message: 'Modo demo - Edge Function não executada' 
        },
        error: null
      };
    }
  }
};

// Função auxiliar para obter a conta Meta
export function getMockMetaAccount() {
  return MOCK_META_ACCOUNT;
}

// Função auxiliar para verificar se criou live
export function hasUserCreatedLive() {
  // SEMPRE ler do localStorage para garantir persistência
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

// Função auxiliar para obter captações
export function getMockLives() {
  // No modo demo, SEMPRE retornar a live mocada por padrão
  return [MOCK_LIVE];
}
