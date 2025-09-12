export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      criativos: {
        Row: {
          ad_name: string | null
          ad_set_name: string | null
          amount_spent: number | null
          campaign_name: string | null
          cost_per_lead: number | null
          created_at: string
          creative_link: string | null
          day: string | null
          id: string
          leads: number | null
          user_id: string | null
        }
        Insert: {
          ad_name?: string | null
          ad_set_name?: string | null
          amount_spent?: number | null
          campaign_name?: string | null
          cost_per_lead?: number | null
          created_at?: string
          creative_link?: string | null
          day?: string | null
          id?: string
          leads?: number | null
          user_id?: string | null
        }
        Update: {
          ad_name?: string | null
          ad_set_name?: string | null
          amount_spent?: number | null
          campaign_name?: string | null
          cost_per_lead?: number | null
          created_at?: string
          creative_link?: string | null
          day?: string | null
          id?: string
          leads?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      deleted_live_groups: {
        Row: {
          created_at: string
          deleted_at: string
          group_id: string
          group_name: string
          group_size: number | null
          id: string
          monitoring: boolean | null
          original_live_group_id: string
          original_live_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at: string
          deleted_at?: string
          group_id: string
          group_name: string
          group_size?: number | null
          id?: string
          monitoring?: boolean | null
          original_live_group_id: string
          original_live_id: string
          updated_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string
          group_id?: string
          group_name?: string
          group_size?: number | null
          id?: string
          monitoring?: boolean | null
          original_live_group_id?: string
          original_live_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deleted_lives: {
        Row: {
          ad_budget: number | null
          captacao_start: string | null
          created_at: string
          current_viewers: number | null
          deleted_at: string
          id: string
          leads_goal: number | null
          live_date: string | null
          name: string
          original_live_id: string
          participants: number | null
          peak_viewers: number | null
          revenue: number | null
          sales: number | null
          sales_goal: number | null
          ta_rolando_end: string | null
          ta_rolando_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_budget?: number | null
          captacao_start?: string | null
          created_at: string
          current_viewers?: number | null
          deleted_at?: string
          id?: string
          leads_goal?: number | null
          live_date?: string | null
          name: string
          original_live_id: string
          participants?: number | null
          peak_viewers?: number | null
          revenue?: number | null
          sales?: number | null
          sales_goal?: number | null
          ta_rolando_end?: string | null
          ta_rolando_start?: string | null
          updated_at: string
          user_id: string
        }
        Update: {
          ad_budget?: number | null
          captacao_start?: string | null
          created_at?: string
          current_viewers?: number | null
          deleted_at?: string
          id?: string
          leads_goal?: number | null
          live_date?: string | null
          name?: string
          original_live_id?: string
          participants?: number | null
          peak_viewers?: number | null
          revenue?: number | null
          sales?: number | null
          sales_goal?: number | null
          ta_rolando_end?: string | null
          ta_rolando_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      live_groups: {
        Row: {
          created_at: string
          group_id: string
          group_name: string
          group_size: number | null
          id: string
          live_id: string
          monitoring: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          group_name: string
          group_size?: number | null
          id?: string
          live_id: string
          monitoring?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          group_name?: string
          group_size?: number | null
          id?: string
          live_id?: string
          monitoring?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_groups_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "lives"
            referencedColumns: ["id"]
          },
        ]
      }
      lives: {
        Row: {
          ad_budget: number | null
          captacao_start: string | null
          created_at: string
          current_viewers: number | null
          id: string
          leads_goal: number | null
          live_date: string | null
          name: string
          participants: number | null
          peak_viewers: number | null
          revenue: number | null
          sales: number | null
          sales_goal: number | null
          ta_rolando_end: string | null
          ta_rolando_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_budget?: number | null
          captacao_start?: string | null
          created_at?: string
          current_viewers?: number | null
          id?: string
          leads_goal?: number | null
          live_date?: string | null
          name: string
          participants?: number | null
          peak_viewers?: number | null
          revenue?: number | null
          sales?: number | null
          sales_goal?: number | null
          ta_rolando_end?: string | null
          ta_rolando_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_budget?: number | null
          captacao_start?: string | null
          created_at?: string
          current_viewers?: number | null
          id?: string
          leads_goal?: number | null
          live_date?: string | null
          name?: string
          participants?: number | null
          peak_viewers?: number | null
          revenue?: number | null
          sales?: number | null
          sales_goal?: number | null
          ta_rolando_end?: string | null
          ta_rolando_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meta_ad_accounts: {
        Row: {
          access_token: string
          account_name: string | null
          ad_account_id: string
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          timezone_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          account_name?: string | null
          ad_account_id: string
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          timezone_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          account_name?: string | null
          ad_account_id?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          timezone_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meta_ad_sets: {
        Row: {
          adset_id: string
          bid_amount: number | null
          bid_strategy: string | null
          campaign_id: string
          created_at: string | null
          created_time: string | null
          daily_budget: number | null
          end_time: string | null
          id: string
          last_fetched_at: string | null
          lifetime_budget: number | null
          name: string
          start_time: string | null
          status: string | null
          targeting_age_max: number | null
          targeting_age_min: number | null
          targeting_gender: string[] | null
          targeting_interests: string[] | null
          targeting_location: string[] | null
          updated_at: string | null
          updated_time: string | null
          user_id: string
        }
        Insert: {
          adset_id: string
          bid_amount?: number | null
          bid_strategy?: string | null
          campaign_id: string
          created_at?: string | null
          created_time?: string | null
          daily_budget?: number | null
          end_time?: string | null
          id?: string
          last_fetched_at?: string | null
          lifetime_budget?: number | null
          name: string
          start_time?: string | null
          status?: string | null
          targeting_age_max?: number | null
          targeting_age_min?: number | null
          targeting_gender?: string[] | null
          targeting_interests?: string[] | null
          targeting_location?: string[] | null
          updated_at?: string | null
          updated_time?: string | null
          user_id: string
        }
        Update: {
          adset_id?: string
          bid_amount?: number | null
          bid_strategy?: string | null
          campaign_id?: string
          created_at?: string | null
          created_time?: string | null
          daily_budget?: number | null
          end_time?: string | null
          id?: string
          last_fetched_at?: string | null
          lifetime_budget?: number | null
          name?: string
          start_time?: string | null
          status?: string | null
          targeting_age_max?: number | null
          targeting_age_min?: number | null
          targeting_gender?: string[] | null
          targeting_interests?: string[] | null
          targeting_location?: string[] | null
          updated_at?: string | null
          updated_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ad_sets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads: {
        Row: {
          ad_id: string
          adset_id: string
          created_at: string | null
          created_time: string | null
          creative_asset_feed_spec: Json | null
          creative_id: string | null
          creative_link_url: string | null
          creative_name: string | null
          creative_object_story_spec: Json | null
          id: string
          last_fetched_at: string | null
          name: string
          status: string | null
          tracking_parameters: Json | null
          updated_at: string | null
          updated_time: string | null
          user_id: string
        }
        Insert: {
          ad_id: string
          adset_id: string
          created_at?: string | null
          created_time?: string | null
          creative_asset_feed_spec?: Json | null
          creative_id?: string | null
          creative_link_url?: string | null
          creative_name?: string | null
          creative_object_story_spec?: Json | null
          id?: string
          last_fetched_at?: string | null
          name: string
          status?: string | null
          tracking_parameters?: Json | null
          updated_at?: string | null
          updated_time?: string | null
          user_id: string
        }
        Update: {
          ad_id?: string
          adset_id?: string
          created_at?: string | null
          created_time?: string | null
          creative_asset_feed_spec?: Json | null
          creative_id?: string | null
          creative_link_url?: string | null
          creative_name?: string | null
          creative_object_story_spec?: Json | null
          id?: string
          last_fetched_at?: string | null
          name?: string
          status?: string | null
          tracking_parameters?: Json | null
          updated_at?: string | null
          updated_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_adset_id_fkey"
            columns: ["adset_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_campaigns: {
        Row: {
          ad_account_id: string
          budget_remaining: number | null
          campaign_id: string
          created_at: string | null
          created_time: string | null
          daily_budget: number | null
          id: string
          last_fetched_at: string | null
          lifetime_budget: number | null
          name: string
          objective: string | null
          start_time: string | null
          status: string | null
          stop_time: string | null
          updated_at: string | null
          updated_time: string | null
          user_id: string
        }
        Insert: {
          ad_account_id: string
          budget_remaining?: number | null
          campaign_id: string
          created_at?: string | null
          created_time?: string | null
          daily_budget?: number | null
          id?: string
          last_fetched_at?: string | null
          lifetime_budget?: number | null
          name: string
          objective?: string | null
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          updated_at?: string | null
          updated_time?: string | null
          user_id: string
        }
        Update: {
          ad_account_id?: string
          budget_remaining?: number | null
          campaign_id?: string
          created_at?: string | null
          created_time?: string | null
          daily_budget?: number | null
          id?: string
          last_fetched_at?: string | null
          lifetime_budget?: number | null
          name?: string
          objective?: string | null
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          updated_at?: string | null
          updated_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_campaigns_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_insights: {
        Row: {
          ad_id: string | null
          adset_id: string | null
          campaign_id: string | null
          clicks: number | null
          conversions: number | null
          cost_per_click: number | null
          cost_per_lead: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          date_start: string
          date_stop: string
          engagement_rate: number | null
          fetched_at: string | null
          frequency: number | null
          id: string
          impressions: number | null
          leads: number | null
          raw_data: Json | null
          reach: number | null
          spend: number | null
          updated_at: string | null
          user_id: string
          video_completion_rate: number | null
          video_views: number | null
        }
        Insert: {
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cost_per_click?: number | null
          cost_per_lead?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date_start: string
          date_stop: string
          engagement_rate?: number | null
          fetched_at?: string | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          raw_data?: Json | null
          reach?: number | null
          spend?: number | null
          updated_at?: string | null
          user_id: string
          video_completion_rate?: number | null
          video_views?: number | null
        }
        Update: {
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cost_per_click?: number | null
          cost_per_lead?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date_start?: string
          date_stop?: string
          engagement_rate?: number | null
          fetched_at?: string | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          raw_data?: Json | null
          reach?: number | null
          spend?: number | null
          updated_at?: string | null
          user_id?: string
          video_completion_rate?: number | null
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_insights_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "meta_ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_insights_adset_id_fkey"
            columns: ["adset_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_insights_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_integrations: {
        Row: {
          access_token: string
          account_count: number | null
          connected_at: string
          created_at: string
          id: string
          is_active: boolean
          last_validated_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          account_count?: number | null
          connected_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_validated_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          account_count?: number | null
          connected_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_validated_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meta_sync_logs: {
        Row: {
          ad_account_id: string | null
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          records_created: number | null
          records_failed: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string | null
          status: string
          sync_type: string
          user_id: string
        }
        Insert: {
          ad_account_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status: string
          sync_type: string
          user_id: string
        }
        Update: {
          ad_account_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_sync_logs_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisa: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          company_instagram: string | null
          company_name: string | null
          country: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_admin: boolean
          last_name: string
          phone: string | null
          state: string | null
          status: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_instagram?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_admin?: boolean
          last_name: string
          phone?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_instagram?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_admin?: boolean
          last_name?: string
          phone?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      whatsapp_deletion_logs: {
        Row: {
          action: string
          error: string | null
          id: string
          instance_name: string
          ip_address: string | null
          timestamp: string
          user_agent: string | null
          user_id: string
          validation_passed: boolean
        }
        Insert: {
          action: string
          error?: string | null
          id?: string
          instance_name: string
          ip_address?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id: string
          validation_passed?: boolean
        }
        Update: {
          action?: string
          error?: string | null
          id?: string
          instance_name?: string
          ip_address?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string
          validation_passed?: boolean
        }
        Relationships: []
      }
      whatsapp_groups: {
        Row: {
          created_at: string
          group_created_at: string | null
          group_id: string
          group_name: string
          group_owner: string | null
          group_size: number | null
          id: string
          monitoring: boolean | null
          participant_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_created_at?: string | null
          group_id: string
          group_name: string
          group_owner?: string | null
          group_size?: number | null
          id?: string
          monitoring?: boolean | null
          participant_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_created_at?: string | null
          group_id?: string
          group_name?: string
          group_owner?: string | null
          group_size?: number | null
          id?: string
          monitoring?: boolean | null
          participant_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_groups_log: {
        Row: {
          created_at: string
          event: string | null
          group_name: string | null
          id: string
          id_grupo: string | null
          phone_number: string | null
          user_id: string | null
          whatsapp_phone_id: string | null
        }
        Insert: {
          created_at?: string
          event?: string | null
          group_name?: string | null
          id?: string
          id_grupo?: string | null
          phone_number?: string | null
          user_id?: string | null
          whatsapp_phone_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string | null
          group_name?: string | null
          id?: string
          id_grupo?: string | null
          phone_number?: string | null
          user_id?: string | null
          whatsapp_phone_id?: string | null
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          api_token: string | null
          created_at: string
          id: string
          instance_id: string | null
          instance_name: string
          phone_number: string | null
          qr_code: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_token?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name: string
          phone_number?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_token?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string
          phone_number?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          action: string
          created_at: string
          data: Json | null
          error: string | null
          id: string
          instance_name: string
          timestamp: string
          user_agent: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          data?: Json | null
          error?: string | null
          id?: string
          instance_name: string
          timestamp?: string
          user_agent?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          data?: Json | null
          error?: string | null
          id?: string
          instance_name?: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      approval_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      approval_status: ["pending", "approved", "rejected"],
    },
  },
} as const
