export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AuthRole = "student" | "staff";

export type Citation = {
  page: number | null;
  excerpt: string;
  score: number;
};

export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          auth_user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant";
          content: string;
          citations: Citation[];
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant";
          content: string;
          citations?: Citation[];
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: "user" | "assistant";
          content?: string;
          citations?: Citation[];
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          auth_user_id: string;
          role: AuthRole;
          email: string;
          display_name: string;
          student_id: string | null;
          teacher_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          role: AuthRole;
          email: string;
          display_name: string;
          student_id?: string | null;
          teacher_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          role?: AuthRole;
          email?: string;
          display_name?: string;
          student_id?: string | null;
          teacher_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      profile_role: AuthRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
