export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      assistant_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          analysis: Json | null;
          created_at: string;
          doc_type: string | null;
          id: string;
          original_text: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          analysis?: Json | null;
          created_at?: string;
          doc_type?: string | null;
          id?: string;
          original_text?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          analysis?: Json | null;
          created_at?: string;
          doc_type?: string | null;
          id?: string;
          original_text?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      hospitals: {
        Row: {
          address: string | null;
          created_at: string;
          id: string;
          latitude: number;
          longitude: number;
          name: string;
          phone: string | null;
          raw: Json | null;
          rating: number | null;
          review_count: number | null;
          source: string;
          source_id: string | null;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          id?: string;
          latitude: number;
          longitude: number;
          name: string;
          phone?: string | null;
          raw?: Json | null;
          rating?: number | null;
          review_count?: number | null;
          source: string;
          source_id?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          id?: string;
          latitude?: number;
          longitude?: number;
          name?: string;
          phone?: string | null;
          raw?: Json | null;
          rating?: number | null;
          review_count?: number | null;
          source?: string;
          source_id?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      hospital_search_cache: {
        Row: {
          cache_key: string;
          created_at: string;
          expires_at: string;
          payload: Json;
        };
        Insert: {
          cache_key: string;
          created_at?: string;
          expires_at: string;
          payload: Json;
        };
        Update: {
          cache_key?: string;
          created_at?: string;
          expires_at?: string;
          payload?: Json;
        };
        Relationships: [];
      };
      hospital_specialties: {
        Row: {
          hospital_id: string;
          id: string;
          specialty_id: string;
        };
        Insert: {
          hospital_id: string;
          id?: string;
          specialty_id: string;
        };
        Update: {
          hospital_id?: string;
          id?: string;
          specialty_id?: string;
        };
        Relationships: [];
      };
      medicines: {
        Row: {
          brand_names: string[];
          common_uses: string[];
          created_at: string;
          description: string | null;
          drug_class: string | null;
          generic_name: string | null;
          id: string;
          name: string;
          precautions: string[];
          prescription_required: boolean;
          side_effects: string[];
          updated_at: string;
        };
        Insert: {
          brand_names?: string[];
          common_uses?: string[];
          created_at?: string;
          description?: string | null;
          drug_class?: string | null;
          generic_name?: string | null;
          id?: string;
          name: string;
          precautions?: string[];
          prescription_required?: boolean;
          side_effects?: string[];
          updated_at?: string;
        };
        Update: {
          brand_names?: string[];
          common_uses?: string[];
          created_at?: string;
          description?: string | null;
          drug_class?: string | null;
          generic_name?: string | null;
          id?: string;
          name?: string;
          precautions?: string[];
          prescription_required?: boolean;
          side_effects?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      medicine_symptoms: {
        Row: {
          id: string;
          medicine_id: string;
          relationship_type: string;
          symptom_id: string;
        };
        Insert: {
          id?: string;
          medicine_id: string;
          relationship_type?: string;
          symptom_id: string;
        };
        Update: {
          id?: string;
          medicine_id?: string;
          relationship_type?: string;
          symptom_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          age: number | null;
          allergies: string | null;
          created_at: string;
          email: string | null;
          email_reminders_enabled: boolean;
          full_name: string | null;
          gender: string | null;
          id: string;
          medical_history: string | null;
          updated_at: string;
        };
        Insert: {
          age?: number | null;
          allergies?: string | null;
          created_at?: string;
          email?: string | null;
          email_reminders_enabled?: boolean;
          full_name?: string | null;
          gender?: string | null;
          id: string;
          medical_history?: string | null;
          updated_at?: string;
        };
        Update: {
          age?: number | null;
          allergies?: string | null;
          created_at?: string;
          email?: string | null;
          email_reminders_enabled?: boolean;
          full_name?: string | null;
          gender?: string | null;
          id?: string;
          medical_history?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      symptom_analyses: {
        Row: {
          age_group: string | null;
          created_at: string;
          duration: string | null;
          follow_up_symptoms: Json | null;
          id: string;
          initial_symptoms: string;
          medical_history: string | null;
          result: Json | null;
          severity: string | null;
          user_id: string;
        };
        Insert: {
          age_group?: string | null;
          created_at?: string;
          duration?: string | null;
          follow_up_symptoms?: Json | null;
          id?: string;
          initial_symptoms: string;
          medical_history?: string | null;
          result?: Json | null;
          severity?: string | null;
          user_id: string;
        };
        Update: {
          age_group?: string | null;
          created_at?: string;
          duration?: string | null;
          follow_up_symptoms?: Json | null;
          id?: string;
          initial_symptoms?: string;
          medical_history?: string | null;
          result?: Json | null;
          severity?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      specialties: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      symptoms: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
