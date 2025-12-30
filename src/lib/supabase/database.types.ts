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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          prompt: string
          result: string | null
          status: string
          system_prompt: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          prompt: string
          result?: string | null
          status?: string
          system_prompt?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          prompt?: string
          result?: string | null
          status?: string
          system_prompt?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          model: string
          system_prompt: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          model?: string
          system_prompt?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          model?: string
          system_prompt?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_costs: {
        Row: {
          conversation_id: string
          cost_usd: number
          created_at: string
          id: string
          input_tokens: number
          message_id: string
          model: string
          output_tokens: number
          reasoning_tokens: number
          user_id: string
        }
        Insert: {
          conversation_id: string
          cost_usd?: number
          created_at?: string
          id?: string
          input_tokens?: number
          message_id: string
          model: string
          output_tokens?: number
          reasoning_tokens?: number
          user_id: string
        }
        Update: {
          conversation_id?: string
          cost_usd?: number
          created_at?: string
          id?: string
          input_tokens?: number
          message_id?: string
          model?: string
          output_tokens?: number
          reasoning_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_costs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_costs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          input_tokens: number | null
          output_tokens: number | null
          role: string
          tool_calls: Json | null
          tool_results: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          role: string
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          role?: string
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      demo: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      expenditure_sources: {
        Row: {
          base_cost: number
          billing_cycle: string
          billing_day_of_month: number
          billing_month: number | null
          consumption_cost: number
          created_at: string
          details_url: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          base_cost?: number
          billing_cycle?: string
          billing_day_of_month?: number
          billing_month?: number | null
          consumption_cost?: number
          created_at?: string
          details_url?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          base_cost?: number
          billing_cycle?: string
          billing_day_of_month?: number
          billing_month?: number | null
          consumption_cost?: number
          created_at?: string
          details_url?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      github_accounts: {
        Row: {
          access_token: string
          account_label: string
          avatar_url: string | null
          created_at: string
          github_user_id: number
          github_username: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          account_label?: string
          avatar_url?: string | null
          created_at?: string
          github_user_id: number
          github_username: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          account_label?: string
          avatar_url?: string | null
          created_at?: string
          github_user_id?: number
          github_username?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mail_account_settings: {
        Row: {
          account_name: string
          created_at: string
          email_address: string
          id: string
          is_enabled: boolean
          provider: string
          sync_frequency_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          created_at?: string
          email_address: string
          id?: string
          is_enabled?: boolean
          provider: string
          sync_frequency_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          created_at?: string
          email_address?: string
          id?: string
          is_enabled?: boolean
          provider?: string
          sync_frequency_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mail_oauth_tokens: {
        Row: {
          account_id: string
          auth_tag: string
          created_at: string
          encrypted_access_token: string
          encrypted_refresh_token: string | null
          id: string
          iv: string
          refresh_token_auth_tag: string | null
          refresh_token_iv: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          auth_tag: string
          created_at?: string
          encrypted_access_token: string
          encrypted_refresh_token?: string | null
          id?: string
          iv: string
          refresh_token_auth_tag?: string | null
          refresh_token_iv?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          auth_tag?: string
          created_at?: string
          encrypted_access_token?: string
          encrypted_refresh_token?: string | null
          id?: string
          iv?: string
          refresh_token_auth_tag?: string | null
          refresh_token_iv?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_oauth_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "mail_account_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      news_items: {
        Row: {
          created_at: string
          guid_hash: string
          id: string
          image_url: string | null
          link: string
          published_at: string
          source_id: string
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string
          guid_hash: string
          id?: string
          image_url?: string | null
          link: string
          published_at: string
          source_id: string
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string
          guid_hash?: string
          id?: string
          image_url?: string | null
          link?: string
          published_at?: string
          source_id?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "news_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      news_sources: {
        Row: {
          brand_color: string
          category: string
          created_at: string
          created_by: string | null
          icon_name: string
          id: string
          is_active: boolean
          name: string
          url: string
        }
        Insert: {
          brand_color?: string
          category: string
          created_at?: string
          created_by?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean
          name: string
          url: string
        }
        Update: {
          brand_color?: string
          category?: string
          created_at?: string
          created_by?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean
          name?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bg_brightness_dark: number | null
          bg_brightness_light: number | null
          display_name: string | null
          email: string | null
          fg_brightness_dark: number | null
          fg_brightness_light: number | null
          font: string | null
          hidden_chat_models: string[] | null
          id: string
          last_login: string | null
          news_last_seen_at: string | null
          role: string | null
          sidebar_width: number | null
          theme: string | null
          total_chat_spent: number
          updated_at: string | null
          widget_settings: Json | null
        }
        Insert: {
          bg_brightness_dark?: number | null
          bg_brightness_light?: number | null
          display_name?: string | null
          email?: string | null
          fg_brightness_dark?: number | null
          fg_brightness_light?: number | null
          font?: string | null
          hidden_chat_models?: string[] | null
          id: string
          last_login?: string | null
          news_last_seen_at?: string | null
          role?: string | null
          sidebar_width?: number | null
          theme?: string | null
          total_chat_spent?: number
          updated_at?: string | null
          widget_settings?: Json | null
        }
        Update: {
          bg_brightness_dark?: number | null
          bg_brightness_light?: number | null
          display_name?: string | null
          email?: string | null
          fg_brightness_dark?: number | null
          fg_brightness_light?: number | null
          font?: string | null
          hidden_chat_models?: string[] | null
          id?: string
          last_login?: string | null
          news_last_seen_at?: string | null
          role?: string | null
          sidebar_width?: number | null
          theme?: string | null
          total_chat_spent?: number
          updated_at?: string | null
          widget_settings?: Json | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      timers: {
        Row: {
          alarm_sound: string
          completion_color: string
          created_at: string
          display_order: number
          duration_seconds: number
          enable_alarm: boolean
          enable_completion_color: boolean
          end_time: string | null
          id: string
          name: string
          remaining_seconds: number
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alarm_sound?: string
          completion_color?: string
          created_at?: string
          display_order?: number
          duration_seconds?: number
          enable_alarm?: boolean
          enable_completion_color?: boolean
          end_time?: string | null
          id?: string
          name?: string
          remaining_seconds?: number
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alarm_sound?: string
          completion_color?: string
          created_at?: string
          display_order?: number
          duration_seconds?: number
          enable_alarm?: boolean
          enable_completion_color?: boolean
          end_time?: string | null
          id?: string
          name?: string
          remaining_seconds?: number
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_news_source_exclusions: {
        Row: {
          created_at: string
          source_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          source_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          source_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_news_source_exclusions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "news_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_news_source_exclusions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_themes: {
        Row: {
          created_at: string | null
          dark_variables: Json
          id: string
          is_active: boolean | null
          light_variables: Json
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dark_variables: Json
          id?: string
          is_active?: boolean | null
          light_variables: Json
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dark_variables?: Json
          id?: string
          is_active?: boolean | null
          light_variables?: Json
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_themes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
