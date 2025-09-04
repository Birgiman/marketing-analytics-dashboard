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
      grupos: {
        Row: {
          created_at: string
          data: string | null
          data_hora: string | null
          evento: string | null
          hora: string | null
          id: string
          id_grupo: string | null
          nome_grupo: string | null
          telefone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: string | null
          data_hora?: string | null
          evento?: string | null
          hora?: string | null
          id?: string
          id_grupo?: string | null
          nome_grupo?: string | null
          telefone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: string | null
          data_hora?: string | null
          evento?: string | null
          hora?: string | null
          id?: string
          id_grupo?: string | null
          nome_grupo?: string | null
          telefone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lives: {
        Row: {
          captacao_start: string | null
          created_at: string
          current_viewers: number | null
          id: string
          live_date: string | null
          name: string
          participants: number | null
          peak_viewers: number | null
          revenue: number | null
          sales: number | null
          ta_rolando_end: string | null
          ta_rolando_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          captacao_start?: string | null
          created_at?: string
          current_viewers?: number | null
          id?: string
          live_date?: string | null
          name: string
          participants?: number | null
          peak_viewers?: number | null
          revenue?: number | null
          sales?: number | null
          ta_rolando_end?: string | null
          ta_rolando_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          captacao_start?: string | null
          created_at?: string
          current_viewers?: number | null
          id?: string
          live_date?: string | null
          name?: string
          participants?: number | null
          peak_viewers?: number | null
          revenue?: number | null
          sales?: number | null
          ta_rolando_end?: string | null
          ta_rolando_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
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
      whatsapp_instances: {
        Row: {
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
      [_ in never]: never
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
