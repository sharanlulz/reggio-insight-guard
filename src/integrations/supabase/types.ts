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
      badges: {
        Row: {
          awarded_at: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      form_scores: {
        Row: {
          created_at: string
          exercise: string
          id: string
          quest_id: string
          score: number
          tips: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise: string
          id?: string
          quest_id: string
          score: number
          tips?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          exercise?: string
          id?: string
          quest_id?: string
          score?: number
          tips?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_scores_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      leaderboard_cache: {
        Row: {
          streak: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          streak?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          streak?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          bio: string | null
          created_at: string
          equipment: string[] | null
          gender: string | null
          goals: string[] | null
          height_cm: number | null
          name: string | null
          time_available_minutes: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          bio?: string | null
          created_at?: string
          equipment?: string[] | null
          gender?: string | null
          goals?: string[] | null
          height_cm?: number | null
          name?: string | null
          time_available_minutes?: number | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          bio?: string | null
          created_at?: string
          equipment?: string[] | null
          gender?: string | null
          goals?: string[] | null
          height_cm?: number | null
          name?: string | null
          time_available_minutes?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      quests: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          id: string
          quest_json: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date: string
          id?: string
          quest_json: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          id?: string
          quest_json?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      regulatory_access_log: {
        Row: {
          action: string
          id: string
          ip_address: unknown | null
          table_name: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown | null
          table_name: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown | null
          table_name?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      clause_coverage_by_document_v: {
        Row: {
          clauses_total: number | null
          document_id: string | null
          obligation_pct: number | null
          obligation_tagged: number | null
          regulation_id: string | null
          regulation_title: string | null
          risk_pct: number | null
          risk_tagged: number | null
          short_code: string | null
          version_label: string | null
        }
        Relationships: []
      }
      clause_coverage_by_regulation_v: {
        Row: {
          clauses_total: number | null
          obligation_pct: number | null
          obligation_tagged: number | null
          regulation_id: string | null
          regulation_title: string | null
          risk_pct: number | null
          risk_tagged: number | null
          short_code: string | null
        }
        Relationships: []
      }
      clauses: {
        Row: {
          citations_json: Json | null
          created_at: string | null
          created_by: string | null
          document_id: string | null
          id: string | null
          importance_score: number | null
          industries: string[] | null
          number_label: string | null
          obligation_type:
            | "MANDATORY"
            | "RECOMMENDED"
            | "REPORTING"
            | "DISCLOSURE"
            | "RESTRICTION"
            | "GOVERNANCE"
            | "RISK_MANAGEMENT"
            | "RECORD_KEEPING"
            | null
          path_hierarchy: string | null
          regulation_id: string | null
          risk_area: string | null
          risk_area_text: string | null
          summary_plain: string | null
          text_raw: string | null
          themes: string[] | null
        }
        Insert: {
          citations_json?: Json | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          id?: string | null
          importance_score?: number | null
          industries?: string[] | null
          number_label?: string | null
          obligation_type?:
            | "MANDATORY"
            | "RECOMMENDED"
            | "REPORTING"
            | "DISCLOSURE"
            | "RESTRICTION"
            | "GOVERNANCE"
            | "RISK_MANAGEMENT"
            | "RECORD_KEEPING"
            | null
          path_hierarchy?: string | null
          regulation_id?: string | null
          risk_area?: string | null
          risk_area_text?: string | null
          summary_plain?: string | null
          text_raw?: string | null
          themes?: string[] | null
        }
        Update: {
          citations_json?: Json | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          id?: string | null
          importance_score?: number | null
          industries?: string[] | null
          number_label?: string | null
          obligation_type?:
            | "MANDATORY"
            | "RECOMMENDED"
            | "REPORTING"
            | "DISCLOSURE"
            | "RESTRICTION"
            | "GOVERNANCE"
            | "RISK_MANAGEMENT"
            | "RECORD_KEEPING"
            | null
          path_hierarchy?: string | null
          regulation_id?: string | null
          risk_area?: string | null
          risk_area_text?: string | null
          summary_plain?: string | null
          text_raw?: string | null
          themes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "clauses_doc_fk"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "clauses_doc_fk"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_doc_fk"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents_detail_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "clauses_doc_fk"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "clauses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "clauses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents_detail_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "clauses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "clauses_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "clauses_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_regulation_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "clauses_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "clauses_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_regulation_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "clauses_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations_v"
            referencedColumns: ["id"]
          },
        ]
      }
      clauses_change_log_v: {
        Row: {
          after: Json | null
          before: Json | null
          changed_at: string | null
          changed_by: string | null
          clause_id: string | null
          id: string | null
        }
        Insert: {
          after?: Json | null
          before?: Json | null
          changed_at?: string | null
          changed_by?: string | null
          clause_id?: string | null
          id?: string | null
        }
        Update: {
          after?: Json | null
          before?: Json | null
          changed_at?: string | null
          changed_by?: string | null
          clause_id?: string | null
          id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clauses_change_log_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_change_log_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses_v"
            referencedColumns: ["id"]
          },
        ]
      }
      clauses_v: {
        Row: {
          created_at: string | null
          document_id: string | null
          id: string | null
          industries: string[] | null
          number_label: string | null
          obligation_type:
            | "MANDATORY"
            | "RECOMMENDED"
            | "REPORTING"
            | "DISCLOSURE"
            | "RESTRICTION"
            | "GOVERNANCE"
            | "RISK_MANAGEMENT"
            | "RECORD_KEEPING"
            | null
          path_hierarchy: string | null
          regulation_id: string | null
          regulation_short_code: string | null
          regulation_title: string | null
          risk_area: string | null
          summary_plain: string | null
          text_raw: string | null
          themes: string[] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clauses_doc_fk"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "clauses_doc_fk"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_doc_fk"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents_detail_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "clauses_doc_fk"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "clauses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "clauses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents_detail_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "clauses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "clauses_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "clauses_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_regulation_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "clauses_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "clauses_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_regulation_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "clauses_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations_v"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestions: {
        Row: {
          chunks_done: number | null
          chunks_total: number | null
          error: string | null
          finished_at: string | null
          id: string | null
          regulation_document_id: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          chunks_done?: number | null
          chunks_total?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string | null
          regulation_document_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          chunks_done?: number | null
          chunks_total?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string | null
          regulation_document_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingestions_regulation_document_id_fkey"
            columns: ["regulation_document_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "ingestions_regulation_document_id_fkey"
            columns: ["regulation_document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestions_regulation_document_id_fkey"
            columns: ["regulation_document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents_detail_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "ingestions_regulation_document_id_fkey"
            columns: ["regulation_document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents_v"
            referencedColumns: ["document_id"]
          },
        ]
      }
      ingestions_v: {
        Row: {
          chunks_done: number | null
          chunks_total: number | null
          error: string | null
          finished_at: string | null
          id: string | null
          jurisdiction_tagged_count: number | null
          ratio_tagged_count: number | null
          regulation_document_id: string | null
          regulation_id: string | null
          regulation_short_code: string | null
          regulation_title: string | null
          status: string | null
          updated_at: string | null
          version_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingestions_regulation_document_id_fkey"
            columns: ["regulation_document_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "ingestions_regulation_document_id_fkey"
            columns: ["regulation_document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestions_regulation_document_id_fkey"
            columns: ["regulation_document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents_detail_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "ingestions_regulation_document_id_fkey"
            columns: ["regulation_document_id"]
            isOneToOne: false
            referencedRelation: "regulation_documents_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_regulation_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_regulation_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations_v"
            referencedColumns: ["id"]
          },
        ]
      }
      obligations: {
        Row: {
          action_text: string | null
          clause_id: string | null
          created_at: string | null
          due_date_estimate: string | null
          evidence_required: string | null
          frequency: string | null
          id: string | null
          obligation_text: string | null
          penalty_summary: string | null
          related_clause_path: string | null
          responsible_role: string | null
        }
        Insert: {
          action_text?: string | null
          clause_id?: string | null
          created_at?: string | null
          due_date_estimate?: string | null
          evidence_required?: string | null
          frequency?: string | null
          id?: string | null
          obligation_text?: string | null
          penalty_summary?: string | null
          related_clause_path?: string | null
          responsible_role?: string | null
        }
        Update: {
          action_text?: string | null
          clause_id?: string | null
          created_at?: string | null
          due_date_estimate?: string | null
          evidence_required?: string | null
          frequency?: string | null
          id?: string | null
          obligation_text?: string | null
          penalty_summary?: string | null
          related_clause_path?: string | null
          responsible_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligations_clause_fk"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_clause_fk"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses_v"
            referencedColumns: ["id"]
          },
        ]
      }
      obligations_v: {
        Row: {
          clause_id: string | null
          created_at: string | null
          description: string | null
          due_date_estimate: string | null
          id: string | null
          obligation_text: string | null
          related_clause_path: string | null
        }
        Insert: {
          clause_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date_estimate?: string | null
          id?: string | null
          obligation_text?: string | null
          related_clause_path?: string | null
        }
        Update: {
          clause_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date_estimate?: string | null
          id?: string | null
          obligation_text?: string | null
          related_clause_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligations_clause_fk"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_clause_fk"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses_v"
            referencedColumns: ["id"]
          },
        ]
      }
      regulation_documents: {
        Row: {
          checksum_sha256: string | null
          created_at: string | null
          doc_type: string | null
          id: string | null
          language: string | null
          published_at: string | null
          regulation_id: string | null
          source_url: string | null
          version_label: string | null
        }
        Insert: {
          checksum_sha256?: string | null
          created_at?: string | null
          doc_type?: string | null
          id?: string | null
          language?: string | null
          published_at?: string | null
          regulation_id?: string | null
          source_url?: string | null
          version_label?: string | null
        }
        Update: {
          checksum_sha256?: string | null
          created_at?: string | null
          doc_type?: string | null
          id?: string | null
          language?: string | null
          published_at?: string | null
          regulation_id?: string | null
          source_url?: string | null
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_regulation_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_regulation_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations_v"
            referencedColumns: ["id"]
          },
        ]
      }
      regulation_documents_detail_v: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          doc_type: string | null
          document_id: string | null
          is_deleted: boolean | null
          language: string | null
          published_at: string | null
          regulation_id: string | null
          regulation_title: string | null
          short_code: string | null
          source_url: string | null
          version_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_regulation_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_regulation_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations_v"
            referencedColumns: ["id"]
          },
        ]
      }
      regulation_documents_v: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          doc_type: string | null
          document_id: string | null
          is_deleted: boolean | null
          language: string | null
          published_at: string | null
          regulation_id: string | null
          regulation_title: string | null
          short_code: string | null
          source_url: string | null
          version_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_regulation_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regdoc_reg_fk"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_document_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "clause_coverage_by_regulation_v"
            referencedColumns: ["regulation_id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_documents_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations_v"
            referencedColumns: ["id"]
          },
        ]
      }
      regulations: {
        Row: {
          citation: string | null
          created_at: string | null
          created_by: string | null
          effective_date: string | null
          id: string | null
          jurisdiction: string | null
          last_updated_at: string | null
          org_id: string | null
          regulator: string | null
          short_code: string | null
          source_url: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          citation?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_date?: string | null
          id?: string | null
          jurisdiction?: string | null
          last_updated_at?: string | null
          org_id?: string | null
          regulator?: string | null
          short_code?: string | null
          source_url?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          citation?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_date?: string | null
          id?: string | null
          jurisdiction?: string | null
          last_updated_at?: string | null
          org_id?: string | null
          regulator?: string | null
          short_code?: string | null
          source_url?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: []
      }
      regulations_v: {
        Row: {
          created_at: string | null
          id: string | null
          jurisdiction: string | null
          org_id: string | null
          regulator: string | null
          short_code: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          jurisdiction?: string | null
          org_id?: string | null
          regulator?: string | null
          short_code?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          jurisdiction?: string | null
          org_id?: string | null
          regulator?: string | null
          short_code?: string | null
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_authenticated_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
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
