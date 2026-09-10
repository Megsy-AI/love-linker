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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abliteration_keys: {
        Row: {
          api_key: string
          cooldown_until: string | null
          created_at: string
          id: string
          label: string | null
          last_error: string | null
          last_used_at: string | null
          notes: string | null
          priority: number
          status: string
          updated_at: string
        }
        Insert: {
          api_key: string
          cooldown_until?: string | null
          created_at?: string
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          notes?: string | null
          priority?: number
          status?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          cooldown_until?: string | null
          created_at?: string
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          notes?: string | null
          priority?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_bot_state: {
        Row: {
          awaiting_provider: string | null
          chat_id: string
          updated_at: string
        }
        Insert: {
          awaiting_provider?: string | null
          chat_id: string
          updated_at?: string
        }
        Update: {
          awaiting_provider?: string | null
          chat_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_error_log: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string
          notified: boolean
          raw_error: string | null
          route: string | null
          source: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message: string
          notified?: boolean
          raw_error?: string | null
          route?: string | null
          source: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string
          notified?: boolean
          raw_error?: string | null
          route?: string | null
          source?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read: boolean
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          type?: string
        }
        Relationships: []
      }
      agent_checkpoints: {
        Row: {
          created_at: string
          fingerprint: string | null
          id: string
          last_action: string | null
          run_id: string | null
          state: Json | null
          step_number: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          fingerprint?: string | null
          id?: string
          last_action?: string | null
          run_id?: string | null
          state?: Json | null
          step_number?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          fingerprint?: string | null
          id?: string
          last_action?: string | null
          run_id?: string | null
          state?: Json | null
          step_number?: number
          user_id?: string | null
        }
        Relationships: []
      }
      agent_credentials: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          login_email: string | null
          notes: string | null
          password: string | null
          site: string
          site_url: string | null
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          login_email?: string | null
          notes?: string | null
          password?: string | null
          site: string
          site_url?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          login_email?: string | null
          notes?: string | null
          password?: string | null
          site?: string
          site_url?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      agent_evals: {
        Row: {
          created_at: string
          criterion: string
          id: string
          judge_model: string
          passed: boolean | null
          reasoning: string | null
          score: number | null
          trace_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          criterion: string
          id?: string
          judge_model: string
          passed?: boolean | null
          reasoning?: string | null
          score?: number | null
          trace_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          criterion?: string
          id?: string
          judge_model?: string
          passed?: boolean | null
          reasoning?: string | null
          score?: number | null
          trace_id?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_golden_dataset: {
        Row: {
          created_at: string
          expected_criteria: Json
          id: string
          input: string
          is_active: boolean | null
          label: string
          tags: string[] | null
        }
        Insert: {
          created_at?: string
          expected_criteria?: Json
          id?: string
          input: string
          is_active?: boolean | null
          label: string
          tags?: string[] | null
        }
        Update: {
          created_at?: string
          expected_criteria?: Json
          id?: string
          input?: string
          is_active?: boolean | null
          label?: string
          tags?: string[] | null
        }
        Relationships: []
      }
      agent_incidents: {
        Row: {
          agent_id: string | null
          description: string | null
          id: string
          metadata: Json | null
          opened_at: string
          resolved_at: string | null
          severity: string
          status: string
          title: string
        }
        Insert: {
          agent_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
        }
        Update: {
          agent_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      agent_memory: {
        Row: {
          confidence: number | null
          content: string | null
          created_at: string
          domain: string | null
          hits: number | null
          id: string
          key: string | null
          kind: string | null
          last_used_at: string | null
          source_run_id: string | null
          updated_at: string
          user_id: string | null
          value: string | null
        }
        Insert: {
          confidence?: number | null
          content?: string | null
          created_at?: string
          domain?: string | null
          hits?: number | null
          id?: string
          key?: string | null
          kind?: string | null
          last_used_at?: string | null
          source_run_id?: string | null
          updated_at?: string
          user_id?: string | null
          value?: string | null
        }
        Update: {
          confidence?: number | null
          content?: string | null
          created_at?: string
          domain?: string | null
          hits?: number | null
          id?: string
          key?: string | null
          kind?: string | null
          last_used_at?: string | null
          source_run_id?: string | null
          updated_at?: string
          user_id?: string | null
          value?: string | null
        }
        Relationships: []
      }
      agent_memory_files: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          path: string
          tokens_estimate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          path: string
          tokens_estimate?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          path?: string
          tokens_estimate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          metadata: Json
          role: string
          session_id: string
          tool_calls: Json | null
          tool_results: Json | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          role: string
          session_id: string
          tool_calls?: Json | null
          tool_results?: Json | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          session_id?: string
          tool_calls?: Json | null
          tool_results?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      agent_observations: {
        Row: {
          agent_id: string | null
          context: Json | null
          created_at: string
          id: string
          message: string | null
          metric: string
          severity: string
          threshold: number | null
          value: number | null
        }
        Insert: {
          agent_id?: string | null
          context?: Json | null
          created_at?: string
          id?: string
          message?: string | null
          metric: string
          severity?: string
          threshold?: number | null
          value?: number | null
        }
        Update: {
          agent_id?: string | null
          context?: Json | null
          created_at?: string
          id?: string
          message?: string | null
          metric?: string
          severity?: string
          threshold?: number | null
          value?: number | null
        }
        Relationships: []
      }
      agent_plans: {
        Row: {
          created_at: string
          goal: string | null
          id: string
          review: Json | null
          run_id: string | null
          steps: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          goal?: string | null
          id?: string
          review?: Json | null
          run_id?: string | null
          steps?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          goal?: string | null
          id?: string
          review?: Json | null
          run_id?: string | null
          steps?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      agent_proposals: {
        Row: {
          agent_id: string | null
          created_at: string
          decided_by: string | null
          executed_at: string | null
          id: string
          kind: string
          payload: Json
          rationale: string | null
          result: Json | null
          run_id: string | null
          status: string
          telegram_chat_id: number | null
          telegram_message_id: number | null
          title: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          decided_by?: string | null
          executed_at?: string | null
          id?: string
          kind: string
          payload?: Json
          rationale?: string | null
          result?: Json | null
          run_id?: string | null
          status?: string
          telegram_chat_id?: number | null
          telegram_message_id?: number | null
          title: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          decided_by?: string | null
          executed_at?: string | null
          id?: string
          kind?: string
          payload?: Json
          rationale?: string | null
          result?: Json | null
          run_id?: string | null
          status?: string
          telegram_chat_id?: number | null
          telegram_message_id?: number | null
          title?: string
        }
        Relationships: []
      }
      agent_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          asked_at: string
          created_at: string
          id: string
          options: Json | null
          question: string
          reason: string | null
          run_id: string | null
          sensitive: boolean | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          asked_at?: string
          created_at?: string
          id?: string
          options?: Json | null
          question: string
          reason?: string | null
          run_id?: string | null
          sensitive?: boolean | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          asked_at?: string
          created_at?: string
          id?: string
          options?: Json | null
          question?: string
          reason?: string | null
          run_id?: string | null
          sensitive?: boolean | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          agent_id: string
          e2b_ms: number | null
          ended_at: string | null
          error: string | null
          id: string
          output_summary: string | null
          proposals_count: number | null
          started_at: string
          status: string
          tokens_used: number | null
          trigger: string
        }
        Insert: {
          agent_id: string
          e2b_ms?: number | null
          ended_at?: string | null
          error?: string | null
          id?: string
          output_summary?: string | null
          proposals_count?: number | null
          started_at?: string
          status?: string
          tokens_used?: number | null
          trigger?: string
        }
        Update: {
          agent_id?: string
          e2b_ms?: number | null
          ended_at?: string | null
          error?: string | null
          id?: string
          output_summary?: string | null
          proposals_count?: number | null
          started_at?: string
          status?: string
          tokens_used?: number | null
          trigger?: string
        }
        Relationships: []
      }
      agent_sessions: {
        Row: {
          agent_slug: string
          created_at: string
          ended_at: string | null
          id: string
          last_message_at: string | null
          manus_api_key_id: string | null
          manus_cursor: string | null
          manus_task_id: string | null
          manus_task_url: string | null
          metadata: Json
          sandbox_id: string | null
          sandbox_status: string | null
          started_at: string
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_slug: string
          created_at?: string
          ended_at?: string | null
          id?: string
          last_message_at?: string | null
          manus_api_key_id?: string | null
          manus_cursor?: string | null
          manus_task_id?: string | null
          manus_task_url?: string | null
          metadata?: Json
          sandbox_id?: string | null
          sandbox_status?: string | null
          started_at?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_slug?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          last_message_at?: string | null
          manus_api_key_id?: string | null
          manus_cursor?: string | null
          manus_task_id?: string | null
          manus_task_url?: string | null
          metadata?: Json
          sandbox_id?: string | null
          sandbox_status?: string | null
          started_at?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_tick_config: {
        Row: {
          created_at: string
          id: boolean
          secret: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          secret?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          secret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_tool_bindings: {
        Row: {
          agent_slug: string
          config: Json
          created_at: string
          enabled: boolean
          id: string
          tool_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_slug: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          tool_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_slug?: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          tool_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_tool_invocations: {
        Row: {
          agent_slug: string | null
          created_at: string
          credits_charged: number
          error: string | null
          id: string
          input: Json
          latency_ms: number | null
          output: Json | null
          session_id: string | null
          status: string
          tool_key: string
          user_id: string
        }
        Insert: {
          agent_slug?: string | null
          created_at?: string
          credits_charged?: number
          error?: string | null
          id?: string
          input?: Json
          latency_ms?: number | null
          output?: Json | null
          session_id?: string | null
          status?: string
          tool_key: string
          user_id: string
        }
        Update: {
          agent_slug?: string | null
          created_at?: string
          credits_charged?: number
          error?: string | null
          id?: string
          input?: Json
          latency_ms?: number | null
          output?: Json | null
          session_id?: string | null
          status?: string
          tool_key?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_tools_registry: {
        Row: {
          base_credits: number
          category: string
          created_at: string
          credit_formula: Json | null
          description: string | null
          description_ar: string | null
          edge_function: string
          icon: string | null
          id: string
          input_schema: Json
          is_active: boolean
          name: string
          name_ar: string | null
          output_kind: string
          requires_premium: boolean
          sort_order: number
          tool_key: string
          updated_at: string
        }
        Insert: {
          base_credits?: number
          category: string
          created_at?: string
          credit_formula?: Json | null
          description?: string | null
          description_ar?: string | null
          edge_function: string
          icon?: string | null
          id?: string
          input_schema?: Json
          is_active?: boolean
          name: string
          name_ar?: string | null
          output_kind?: string
          requires_premium?: boolean
          sort_order?: number
          tool_key: string
          updated_at?: string
        }
        Update: {
          base_credits?: number
          category?: string
          created_at?: string
          credit_formula?: Json | null
          description?: string | null
          description_ar?: string | null
          edge_function?: string
          icon?: string | null
          id?: string
          input_schema?: Json
          is_active?: boolean
          name?: string
          name_ar?: string | null
          output_kind?: string
          requires_premium?: boolean
          sort_order?: number
          tool_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_traces: {
        Row: {
          activity: Json | null
          cached_tokens: number | null
          completion_tokens: number | null
          conversation_id: string | null
          created_at: string
          deferred: boolean | null
          error: string | null
          id: string
          input: Json | null
          iters: number | null
          latency_ms: number | null
          model: string | null
          output: string | null
          path: string | null
          prompt_tokens: number | null
          status: string | null
          tools_used: Json | null
          user_id: string
        }
        Insert: {
          activity?: Json | null
          cached_tokens?: number | null
          completion_tokens?: number | null
          conversation_id?: string | null
          created_at?: string
          deferred?: boolean | null
          error?: string | null
          id?: string
          input?: Json | null
          iters?: number | null
          latency_ms?: number | null
          model?: string | null
          output?: string | null
          path?: string | null
          prompt_tokens?: number | null
          status?: string | null
          tools_used?: Json | null
          user_id: string
        }
        Update: {
          activity?: Json | null
          cached_tokens?: number | null
          completion_tokens?: number | null
          conversation_id?: string | null
          created_at?: string
          deferred?: boolean | null
          error?: string | null
          id?: string
          input?: Json | null
          iters?: number | null
          latency_ms?: number | null
          model?: string | null
          output?: string | null
          path?: string | null
          prompt_tokens?: number | null
          status?: string | null
          tools_used?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      ai_agents: {
        Row: {
          approval_mode: string
          category: string
          config: Json
          created_at: string
          cron_schedule: string | null
          description: string | null
          enabled: boolean
          fail_count: number
          id: string
          last_run_at: string | null
          name: string
          slug: string
          success_count: number
          system_prompt: string
          updated_at: string
        }
        Insert: {
          approval_mode?: string
          category: string
          config?: Json
          created_at?: string
          cron_schedule?: string | null
          description?: string | null
          enabled?: boolean
          fail_count?: number
          id?: string
          last_run_at?: string | null
          name: string
          slug: string
          success_count?: number
          system_prompt: string
          updated_at?: string
        }
        Update: {
          approval_mode?: string
          category?: string
          config?: Json
          created_at?: string
          cron_schedule?: string | null
          description?: string | null
          enabled?: boolean
          fail_count?: number
          id?: string
          last_run_at?: string | null
          name?: string
          slug?: string
          success_count?: number
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_personalization: {
        Row: {
          about: string | null
          active_persona_id: string | null
          ai_traits: string | null
          call_name: string | null
          created_at: string | null
          custom_instructions: string | null
          id: string
          interests: string[]
          language_style: string
          preferred_tier: string
          profession: string | null
          tone_creativity: number
          tone_formality: number
          tone_verbosity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          about?: string | null
          active_persona_id?: string | null
          ai_traits?: string | null
          call_name?: string | null
          created_at?: string | null
          custom_instructions?: string | null
          id?: string
          interests?: string[]
          language_style?: string
          preferred_tier?: string
          profession?: string | null
          tone_creativity?: number
          tone_formality?: number
          tone_verbosity?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          about?: string | null
          active_persona_id?: string | null
          ai_traits?: string | null
          call_name?: string | null
          created_at?: string | null
          custom_instructions?: string | null
          id?: string
          interests?: string[]
          language_style?: string
          preferred_tier?: string
          profession?: string | null
          tone_creativity?: number
          tone_formality?: number
          tone_verbosity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_project_files: {
        Row: {
          content: string
          created_at: string
          id: string
          path: string
          project_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          path: string
          project_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          path?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_project_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json
          project_id: string
          role: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          project_id: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          project_id?: string
          role?: string
        }
        Relationships: []
      }
      ai_project_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          file_count: number
          files: Json
          id: string
          label: string | null
          project_id: string
          total_bytes: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_count?: number
          files?: Json
          id?: string
          label?: string | null
          project_id: string
          total_bytes?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_count?: number
          files?: Json
          id?: string
          label?: string | null
          project_id?: string
          total_bytes?: number
          user_id?: string | null
        }
        Relationships: []
      }
      ai_project_usage: {
        Row: {
          action: string
          completion_tokens: number
          created_at: string
          duration_ms: number
          id: string
          mc_cost: number
          model: string | null
          project_id: string
          prompt_tokens: number
          user_id: string | null
        }
        Insert: {
          action?: string
          completion_tokens?: number
          created_at?: string
          duration_ms?: number
          id?: string
          mc_cost?: number
          model?: string | null
          project_id: string
          prompt_tokens?: number
          user_id?: string | null
        }
        Update: {
          action?: string
          completion_tokens?: number
          created_at?: string
          duration_ms?: number
          id?: string
          mc_cost?: number
          model?: string | null
          project_id?: string
          prompt_tokens?: number
          user_id?: string | null
        }
        Relationships: []
      }
      alibaba_keys: {
        Row: {
          api_key: string
          category: string
          created_at: string
          failure_count: number
          id: string
          label: string | null
          last_error: string | null
          last_used_at: string | null
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          api_key: string
          category: string
          created_at?: string
          failure_count?: number
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          category?: string
          created_at?: string
          failure_count?: number
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      alibaba_video_models: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          model_id_api: string | null
          name: string | null
          provider: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          model_id_api?: string | null
          name?: string | null
          provider?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          model_id_api?: string | null
          name?: string | null
          provider?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      anonymous_chat_usage: {
        Row: {
          fingerprint_hash: string
          id: string
          ip_hash: string
          used_at: string
          user_agent: string | null
        }
        Insert: {
          fingerprint_hash: string
          id?: string
          ip_hash: string
          used_at?: string
          user_agent?: string | null
        }
        Update: {
          fingerprint_hash?: string
          id?: string
          ip_hash?: string
          used_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          block_reason: string | null
          cooldown_until: string | null
          created_at: string | null
          credit_limit_usd: number
          credit_used_usd: number
          error_count: number | null
          id: string
          is_active: boolean | null
          is_blocked: boolean | null
          label: string | null
          last_error_at: string | null
          last_used_at: string | null
          provider_meta: Json
          service: string
          usage_count: number | null
        }
        Insert: {
          api_key: string
          block_reason?: string | null
          cooldown_until?: string | null
          created_at?: string | null
          credit_limit_usd?: number
          credit_used_usd?: number
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          is_blocked?: boolean | null
          label?: string | null
          last_error_at?: string | null
          last_used_at?: string | null
          provider_meta?: Json
          service: string
          usage_count?: number | null
        }
        Update: {
          api_key?: string
          block_reason?: string | null
          cooldown_until?: string | null
          created_at?: string | null
          credit_limit_usd?: number
          credit_used_usd?: number
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          is_blocked?: boolean | null
          label?: string | null
          last_error_at?: string | null
          last_used_at?: string | null
          provider_meta?: Json
          service?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      apify_keys: {
        Row: {
          api_key: string
          balance_usd: number | null
          created_at: string
          failure_count: number
          id: string
          label: string | null
          last_error: string | null
          last_used_at: string | null
          notes: string | null
          spent_usd: number | null
          status: string
          updated_at: string
        }
        Insert: {
          api_key: string
          balance_usd?: number | null
          created_at?: string
          failure_count?: number
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          notes?: string | null
          spent_usd?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          balance_usd?: number | null
          created_at?: string
          failure_count?: number
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          notes?: string | null
          spent_usd?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_kv: {
        Row: {
          created_at: string
          id: string
          key: string
          project_id: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          project_id: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          project_id?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      app_updates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          media_type: string | null
          media_url: string | null
          published: boolean | null
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          published?: boolean | null
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          published?: boolean | null
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      appsumo_licenses: {
        Row: {
          activated_at: string | null
          activation_email: string | null
          created_at: string
          event: string | null
          id: string
          invoiced_at: string | null
          license_id: string | null
          license_key: string
          plan_id: string | null
          product_id: string | null
          raw: Json | null
          status: string
          tier: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          activation_email?: string | null
          created_at?: string
          event?: string | null
          id?: string
          invoiced_at?: string | null
          license_id?: string | null
          license_key: string
          plan_id?: string | null
          product_id?: string | null
          raw?: Json | null
          status?: string
          tier?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          activation_email?: string | null
          created_at?: string
          event?: string | null
          id?: string
          invoiced_at?: string | null
          license_id?: string | null
          license_key?: string
          plan_id?: string | null
          product_id?: string | null
          raw?: Json | null
          status?: string
          tier?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      appsumo_oauth_states: {
        Row: {
          created_at: string
          redirect_to: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          redirect_to?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          redirect_to?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      attachment_chunks: {
        Row: {
          chunk_index: number
          content: string
          conversation_id: string | null
          created_at: string
          embedding: string | null
          file_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          chunk_index?: number
          content: string
          conversation_id?: string | null
          created_at?: string
          embedding?: string | null
          file_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          conversation_id?: string | null
          created_at?: string
          embedding?: string | null
          file_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      background_jobs: {
        Row: {
          attempt: number
          checkpoint: Json
          clarify: Json | null
          conversation_id: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          input: Json
          kind: string
          last_heartbeat_at: string
          max_attempts: number
          message_id: string | null
          meta: Json
          next_run_at: string | null
          output: Json
          phase: string | null
          progress: number
          provider_errors: Json
          resumable: boolean
          runner: string | null
          status: string
          status_text: string | null
          stream_text: string
          tokens_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt?: number
          checkpoint?: Json
          clarify?: Json | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          kind: string
          last_heartbeat_at?: string
          max_attempts?: number
          message_id?: string | null
          meta?: Json
          next_run_at?: string | null
          output?: Json
          phase?: string | null
          progress?: number
          provider_errors?: Json
          resumable?: boolean
          runner?: string | null
          status?: string
          status_text?: string | null
          stream_text?: string
          tokens_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt?: number
          checkpoint?: Json
          clarify?: Json | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          kind?: string
          last_heartbeat_at?: string
          max_attempts?: number
          message_id?: string | null
          meta?: Json
          next_run_at?: string | null
          output?: Json
          phase?: string | null
          progress?: number
          provider_errors?: Json
          resumable?: boolean
          runner?: string | null
          status?: string
          status_text?: string | null
          stream_text?: string
          tokens_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_audit_log: {
        Row: {
          actor_role: string
          actor_user_id: string | null
          column_name: string
          entity_id: string
          id: string
          new_value: string | null
          occurred_at: string
          old_value: string | null
          reason: string | null
          table_name: string
        }
        Insert: {
          actor_role: string
          actor_user_id?: string | null
          column_name: string
          entity_id: string
          id?: string
          new_value?: string | null
          occurred_at?: string
          old_value?: string | null
          reason?: string | null
          table_name: string
        }
        Update: {
          actor_role?: string
          actor_user_id?: string | null
          column_name?: string
          entity_id?: string
          id?: string
          new_value?: string | null
          occurred_at?: string
          old_value?: string | null
          reason?: string | null
          table_name?: string
        }
        Relationships: []
      }
      billing_skus: {
        Row: {
          active: boolean
          amount_egp: number
          amount_usd: number | null
          created_at: string
          credits: number
          display_name: string
          interval: string | null
          kind: string
          plan_key: string | null
          sku: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_egp: number
          amount_usd?: number | null
          created_at?: string
          credits?: number
          display_name: string
          interval?: string | null
          kind: string
          plan_key?: string | null
          sku: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_egp?: number
          amount_usd?: number | null
          created_at?: string
          credits?: number
          display_name?: string
          interval?: string | null
          kind?: string
          plan_key?: string | null
          sku?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          ai_agent_id: string | null
          author_name: string
          category: string | null
          content_html: string | null
          content_md: string
          created_at: string
          excerpt: string | null
          faq: Json | null
          hero_image_url: string | null
          id: string
          is_original: boolean
          jsonld: Json | null
          keywords: string[] | null
          language: string
          meta_description: string | null
          published_at: string | null
          reading_minutes: number | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          translation_group_id: string | null
          updated_at: string
          views: number
        }
        Insert: {
          ai_agent_id?: string | null
          author_name?: string
          category?: string | null
          content_html?: string | null
          content_md: string
          created_at?: string
          excerpt?: string | null
          faq?: Json | null
          hero_image_url?: string | null
          id?: string
          is_original?: boolean
          jsonld?: Json | null
          keywords?: string[] | null
          language?: string
          meta_description?: string | null
          published_at?: string | null
          reading_minutes?: number | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          translation_group_id?: string | null
          updated_at?: string
          views?: number
        }
        Update: {
          ai_agent_id?: string | null
          author_name?: string
          category?: string | null
          content_html?: string | null
          content_md?: string
          created_at?: string
          excerpt?: string | null
          faq?: Json | null
          hero_image_url?: string | null
          id?: string
          is_original?: boolean
          jsonld?: Json | null
          keywords?: string[] | null
          language?: string
          meta_description?: string | null
          published_at?: string | null
          reading_minutes?: number | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          translation_group_id?: string | null
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      blog_topic_queue: {
        Row: {
          angle: string | null
          created_at: string
          done_at: string | null
          error: string | null
          id: string
          language: string
          picked_at: string | null
          priority: number
          requested_by: string | null
          result_post_id: string | null
          source: string
          status: string
          topic: string
        }
        Insert: {
          angle?: string | null
          created_at?: string
          done_at?: string | null
          error?: string | null
          id?: string
          language?: string
          picked_at?: string | null
          priority?: number
          requested_by?: string | null
          result_post_id?: string | null
          source?: string
          status?: string
          topic: string
        }
        Update: {
          angle?: string | null
          created_at?: string
          done_at?: string | null
          error?: string | null
          id?: string
          language?: string
          picked_at?: string | null
          priority?: number
          requested_by?: string | null
          result_post_id?: string | null
          source?: string
          status?: string
          topic?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          content: Json | null
          cover_url: string | null
          created_at: string
          credits_used: number | null
          id: string
          language: string
          outline: Json | null
          pages_count: number
          pdf_url: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json | null
          cover_url?: string | null
          created_at?: string
          credits_used?: number | null
          id?: string
          language?: string
          outline?: Json | null
          pages_count?: number
          pdf_url?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json | null
          cover_url?: string | null
          created_at?: string
          credits_used?: number | null
          id?: string
          language?: string
          outline?: Json | null
          pages_count?: number
          pdf_url?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_pending_actions: {
        Row: {
          action: string
          chat_id: number
          created_at: string
          payload: Json
        }
        Insert: {
          action: string
          chat_id: number
          created_at?: string
          payload?: Json
        }
        Update: {
          action?: string
          chat_id?: number
          created_at?: string
          payload?: Json
        }
        Relationships: []
      }
      brave_keys: {
        Row: {
          api_key: string
          created_at: string
          failure_count: number
          id: string
          label: string | null
          last_error: string | null
          last_used_at: string | null
          monthly_quota: number | null
          notes: string | null
          status: string
          updated_at: string
          used_this_month: number
        }
        Insert: {
          api_key: string
          created_at?: string
          failure_count?: number
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          monthly_quota?: number | null
          notes?: string | null
          status?: string
          updated_at?: string
          used_this_month?: number
        }
        Update: {
          api_key?: string
          created_at?: string
          failure_count?: number
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          monthly_quota?: number | null
          notes?: string | null
          status?: string
          updated_at?: string
          used_this_month?: number
        }
        Relationships: []
      }
      browser_use_keys: {
        Row: {
          api_key: string
          cooldown_until: string | null
          created_at: string
          failure_count: number | null
          id: string
          label: string | null
          last_error: string | null
          last_used_at: string | null
          notes: string | null
          priority: number | null
          status: string
          updated_at: string
        }
        Insert: {
          api_key: string
          cooldown_until?: string | null
          created_at?: string
          failure_count?: number | null
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          notes?: string | null
          priority?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          cooldown_until?: string | null
          created_at?: string
          failure_count?: number | null
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          notes?: string | null
          priority?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_connections: {
        Row: {
          access_token: string | null
          calendar_email: string | null
          created_at: string
          id: string
          provider: string
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          calendar_email?: string | null
          created_at?: string
          id?: string
          provider?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          calendar_email?: string | null
          created_at?: string
          id?: string
          provider?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_citations: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          index_num: number
          message_id: string | null
          snippet: string | null
          source_type: string | null
          title: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          index_num: number
          message_id?: string | null
          snippet?: string | null
          source_type?: string | null
          title?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          index_num?: number
          message_id?: string | null
          snippet?: string | null
          source_type?: string | null
          title?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_followups: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          message_id: string | null
          questions: Json
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          questions?: Json
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          questions?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      chat_interaction_events: {
        Row: {
          conversation_id: string | null
          created_at: string
          event_type: string
          id: string
          message_id: string | null
          metadata: Json
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          message_id?: string | null
          metadata?: Json
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          message_id?: string | null
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      chat_models: {
        Row: {
          capabilities: Json
          context_window: number
          created_at: string
          display_name: string
          display_order: number
          id: string
          is_active: boolean
          is_default: boolean
          max_output: number | null
          model_id: string
          price_in_per_1m: number | null
          price_out_per_1m: number | null
          provider: string
          tier: string
          updated_at: string
        }
        Insert: {
          capabilities?: Json
          context_window: number
          created_at?: string
          display_name: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_output?: number | null
          model_id: string
          price_in_per_1m?: number | null
          price_out_per_1m?: number | null
          provider?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          capabilities?: Json
          context_window?: number
          created_at?: string
          display_name?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_output?: number | null
          model_id?: string
          price_in_per_1m?: number | null
          price_out_per_1m?: number | null
          provider?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_router_logs: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          latency_ms: number | null
          routed: Json
          user_id: string | null
          user_text: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          routed?: Json
          user_id?: string | null
          user_text?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          routed?: Json
          user_id?: string | null
          user_text?: string | null
        }
        Relationships: []
      }
      chat_semantic_cache: {
        Row: {
          created_at: string
          expires_at: string
          hits: number
          id: string
          model: string | null
          query_embedding: Json | null
          query_hash: string
          query_text: string
          response: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          hits?: number
          id?: string
          model?: string | null
          query_embedding?: Json | null
          query_hash: string
          query_text: string
          response: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          hits?: number
          id?: string
          model?: string | null
          query_embedding?: Json | null
          query_hash?: string
          query_text?: string
          response?: string
        }
        Relationships: []
      }
      chat_stream_buffers: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          done: boolean
          id: string
          interrupted: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          done?: boolean
          id: string
          interrupted?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          done?: boolean
          id?: string
          interrupted?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clerk_links: {
        Row: {
          clerk_user_id: string
          created_at: string
          email: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          clerk_user_id: string
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          clerk_user_id?: string
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cloud_browser_settings: {
        Row: {
          allow_downloads: boolean | null
          created_at: string
          id: string
          keep_signed_in: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allow_downloads?: boolean | null
          created_at?: string
          id?: string
          keep_signed_in?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allow_downloads?: boolean | null
          created_at?: string
          id?: string
          keep_signed_in?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      composio_auth_configs: {
        Row: {
          app_slug: string
          auth_config_id: string
          created_at: string
        }
        Insert: {
          app_slug: string
          auth_config_id: string
          created_at?: string
        }
        Update: {
          app_slug?: string
          auth_config_id?: string
          created_at?: string
        }
        Relationships: []
      }
      composio_connections: {
        Row: {
          app_slug: string
          connected_account_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_slug: string
          connected_account_id: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_slug?: string
          connected_account_id?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      computer_events: {
        Row: {
          created_at: string
          detail: string | null
          duration: number | null
          id: string
          kind: string | null
          screenshot_url: string | null
          task_id: string | null
          title: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          duration?: number | null
          id?: string
          kind?: string | null
          screenshot_url?: string | null
          task_id?: string | null
          title?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          duration?: number | null
          id?: string
          kind?: string | null
          screenshot_url?: string | null
          task_id?: string | null
          title?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      computer_memory: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      computer_tasks: {
        Row: {
          conversation_id: string | null
          created_at: string
          error: string | null
          files: Json | null
          id: string
          key_id: string | null
          message_id: string | null
          progress: number | null
          prompt: string | null
          provider_key_ref: string | null
          provider_session_id: string | null
          provider_task_id: string | null
          result_text: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          files?: Json | null
          id?: string
          key_id?: string | null
          message_id?: string | null
          progress?: number | null
          prompt?: string | null
          provider_key_ref?: string | null
          provider_session_id?: string | null
          provider_task_id?: string | null
          result_text?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          files?: Json | null
          id?: string
          key_id?: string | null
          message_id?: string | null
          progress?: number | null
          prompt?: string | null
          provider_key_ref?: string | null
          provider_session_id?: string | null
          provider_task_id?: string | null
          result_text?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          ai_reply: string | null
          created_at: string
          email: string
          form_type: string
          id: string
          message: string
          name: string
          reply_sent: boolean
          subject: string | null
        }
        Insert: {
          ai_reply?: string | null
          created_at?: string
          email: string
          form_type?: string
          id?: string
          message: string
          name: string
          reply_sent?: boolean
          subject?: string | null
        }
        Update: {
          ai_reply?: string | null
          created_at?: string
          email?: string
          form_type?: string
          id?: string
          message?: string
          name?: string
          reply_sent?: boolean
          subject?: string | null
        }
        Relationships: []
      }
      conversation_invites: {
        Row: {
          accepted_by: string | null
          conversation_id: string
          created_at: string
          expires_at: string
          id: string
          invite_email: string | null
          invite_token: string
          invited_by: string
          status: string
        }
        Insert: {
          accepted_by?: string | null
          conversation_id: string
          created_at?: string
          expires_at?: string
          id?: string
          invite_email?: string | null
          invite_token?: string
          invited_by: string
          status?: string
        }
        Update: {
          accepted_by?: string | null
          conversation_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invite_email?: string | null
          invite_token?: string
          invited_by?: string
          status?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_summaries: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          key_points: Json
          last_message_at: string | null
          metadata: Json
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          key_points?: Json
          last_message_at?: string | null
          metadata?: Json
          summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          key_points?: Json
          last_message_at?: string | null
          metadata?: Json
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          is_pinned: boolean
          is_shared: boolean | null
          mode: string
          model: string | null
          pinned_at: string | null
          share_id: string | null
          title: string
          ui_state: Json
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_shared?: boolean | null
          mode?: string
          model?: string | null
          pinned_at?: string | null
          share_id?: string | null
          title?: string
          ui_state?: Json
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_shared?: boolean | null
          mode?: string
          model?: string | null
          pinned_at?: string | null
          share_id?: string | null
          title?: string
          ui_state?: Json
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          action_type: string
          amount: number
          created_at: string
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_free_usage: {
        Row: {
          created_at: string
          feature: string
          id: string
          usage_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature?: string
          id?: string
          usage_count?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          usage_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_promo_slots: {
        Row: {
          claimed_count: number
          created_at: string
          date: string
          total_slots: number
          updated_at: string
        }
        Insert: {
          claimed_count?: number
          created_at?: string
          date?: string
          total_slots?: number
          updated_at?: string
        }
        Update: {
          claimed_count?: number
          created_at?: string
          date?: string
          total_slots?: number
          updated_at?: string
        }
        Relationships: []
      }
      dead_letter_jobs: {
        Row: {
          attempts: number
          enqueued_at: string
          id: string
          input: Json | null
          kind: string | null
          last_error: string | null
          notified_admin_at: string | null
          original_id: string
          provider_errors: Json | null
          resolution: string | null
          resolved_at: string | null
          runner: string | null
          source_table: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          enqueued_at?: string
          id?: string
          input?: Json | null
          kind?: string | null
          last_error?: string | null
          notified_admin_at?: string | null
          original_id: string
          provider_errors?: Json | null
          resolution?: string | null
          resolved_at?: string | null
          runner?: string | null
          source_table: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          enqueued_at?: string
          id?: string
          input?: Json | null
          kind?: string | null
          last_error?: string | null
          notified_admin_at?: string | null
          original_id?: string
          provider_errors?: Json | null
          resolution?: string | null
          resolved_at?: string | null
          runner?: string | null
          source_table?: string
          user_id?: string | null
        }
        Relationships: []
      }
      dev_deploys: {
        Row: {
          commit: string | null
          created_at: string
          deploy_url: string | null
          error: string | null
          id: string
          project_id: string | null
          run_id: string | null
          screenshot_url: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          commit?: string | null
          created_at?: string
          deploy_url?: string | null
          error?: string | null
          id?: string
          project_id?: string | null
          run_id?: string | null
          screenshot_url?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          commit?: string | null
          created_at?: string
          deploy_url?: string | null
          error?: string | null
          id?: string
          project_id?: string | null
          run_id?: string | null
          screenshot_url?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dev_events: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          run_id: string | null
          title: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json | null
          run_id?: string | null
          title?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          run_id?: string | null
          title?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      dev_projects: {
        Row: {
          conversation_id: string | null
          created_at: string
          deploy_url: string | null
          deployed_commit: string | null
          github_repo: string | null
          head_commit: string | null
          id: string
          name: string | null
          preview_url: string | null
          repo_id: string | null
          screenshot_url: string | null
          status: string
          template: string | null
          updated_at: string
          user_id: string | null
          vm_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          deploy_url?: string | null
          deployed_commit?: string | null
          github_repo?: string | null
          head_commit?: string | null
          id?: string
          name?: string | null
          preview_url?: string | null
          repo_id?: string | null
          screenshot_url?: string | null
          status?: string
          template?: string | null
          updated_at?: string
          user_id?: string | null
          vm_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          deploy_url?: string | null
          deployed_commit?: string | null
          github_repo?: string | null
          head_commit?: string | null
          id?: string
          name?: string | null
          preview_url?: string | null
          repo_id?: string | null
          screenshot_url?: string | null
          status?: string
          template?: string | null
          updated_at?: string
          user_id?: string | null
          vm_id?: string | null
        }
        Relationships: []
      }
      dev_runs: {
        Row: {
          allow_deploy: boolean | null
          conversation_id: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          intent: string | null
          last_heartbeat_at: string | null
          message_id: string | null
          metadata: Json | null
          project_id: string | null
          prompt: string | null
          status: string
          user_id: string | null
          vm_id: string | null
        }
        Insert: {
          allow_deploy?: boolean | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          intent?: string | null
          last_heartbeat_at?: string | null
          message_id?: string | null
          metadata?: Json | null
          project_id?: string | null
          prompt?: string | null
          status?: string
          user_id?: string | null
          vm_id?: string | null
        }
        Update: {
          allow_deploy?: boolean | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          intent?: string | null
          last_heartbeat_at?: string | null
          message_id?: string | null
          metadata?: Json | null
          project_id?: string | null
          prompt?: string | null
          status?: string
          user_id?: string | null
          vm_id?: string | null
        }
        Relationships: []
      }
      dev_tasks: {
        Row: {
          created_at: string
          id: string
          position: number | null
          result: string | null
          run_id: string | null
          status: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number | null
          result?: string | null
          run_id?: string | null
          status?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          position?: number | null
          result?: string | null
          run_id?: string | null
          status?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      document_premium_usage: {
        Row: {
          id: string
          kind: string | null
          template_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          kind?: string | null
          template_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          kind?: string | null
          template_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_template_images: {
        Row: {
          created_at: string
          image_url: string
          source: string
          template_id: string
          updated_at: string
          uploaded_by_chat_id: number | null
        }
        Insert: {
          created_at?: string
          image_url: string
          source?: string
          template_id: string
          updated_at?: string
          uploaded_by_chat_id?: number | null
        }
        Update: {
          created_at?: string
          image_url?: string
          source?: string
          template_id?: string
          updated_at?: string
          uploaded_by_chat_id?: number | null
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          kind: string
          name: string
          preview_url: string | null
          sort_order: number
          structure: Json
          style: Json
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id: string
          kind: string
          name: string
          preview_url?: string | null
          sort_order?: number
          structure?: Json
          style?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          name?: string
          preview_url?: string | null
          sort_order?: number
          structure?: Json
          style?: Json
          updated_at?: string
        }
        Relationships: []
      }
      dodo_orders: {
        Row: {
          amount: number
          created_at: string
          credits: number
          currency: string
          dodo_payment_id: string | null
          dodo_subscription_id: string | null
          id: string
          order_id: string
          plan: string | null
          raw: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credits?: number
          currency?: string
          dodo_payment_id?: string | null
          dodo_subscription_id?: string | null
          id?: string
          order_id: string
          plan?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credits?: number
          currency?: string
          dodo_payment_id?: string | null
          dodo_subscription_id?: string | null
          id?: string
          order_id?: string
          plan?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dodo_products: {
        Row: {
          active: boolean
          created_at: string
          id: string
          interval: string
          product_id: string
          tier: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          interval: string
          product_id: string
          tier: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          interval?: string
          product_id?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      e2b_executions: {
        Row: {
          conversation_id: string | null
          created_at: string
          credits_used: number | null
          duration_ms: number | null
          error: string | null
          files: Json | null
          id: string
          input: Json
          kind: string
          language: string | null
          result: Json | null
          status: string
          stderr: string | null
          stdout: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          credits_used?: number | null
          duration_ms?: number | null
          error?: string | null
          files?: Json | null
          id?: string
          input?: Json
          kind: string
          language?: string | null
          result?: Json | null
          status?: string
          stderr?: string | null
          stdout?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          credits_used?: number | null
          duration_ms?: number | null
          error?: string | null
          files?: Json | null
          id?: string
          input?: Json
          kind?: string
          language?: string | null
          result?: Json | null
          status?: string
          stderr?: string | null
          stdout?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      e2b_keys: {
        Row: {
          api_key: string
          created_at: string
          failure_count: number
          id: string
          label: string | null
          last_error: string | null
          last_used_at: string | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          api_key: string
          created_at?: string
          failure_count?: number
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          failure_count?: number
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      edge_audit_log: {
        Row: {
          action: string
          created_at: string
          endpoint: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          status: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          endpoint: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          status?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          endpoint?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          status?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      edge_rate_limits: {
        Row: {
          count: number
          created_at: string
          endpoint: string
          id: string
          identifier: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          id: string
          status: string
          subject: string
          to_email: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          subject: string
          to_email: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          subject?: string
          to_email?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          actual_seconds: number
          completed: boolean
          created_at: string
          ended_at: string | null
          id: string
          planned_minutes: number
          status: string
          task_name: string
          user_id: string
        }
        Insert: {
          actual_seconds?: number
          completed?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          planned_minutes?: number
          status?: string
          task_name: string
          user_id: string
        }
        Update: {
          actual_seconds?: number
          completed?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          planned_minutes?: number
          status?: string
          task_name?: string
          user_id?: string
        }
        Relationships: []
      }
      free_trial_usage: {
        Row: {
          created_at: string
          id: string
          last_used_at: string
          model_slug: string
          provider_pool: string
          used_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string
          model_slug: string
          provider_pool: string
          used_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string
          model_slug?: string
          provider_pool?: string
          used_count?: number
          user_id?: string
        }
        Relationships: []
      }
      freestyle_keys: {
        Row: {
          api_key: string
          cooldown_until: string | null
          created_at: string
          failure_count: number | null
          id: string
          label: string | null
          last_error: string | null
          last_used_at: string | null
          notes: string | null
          priority: number | null
          status: string
          success_count: number | null
          updated_at: string
        }
        Insert: {
          api_key: string
          cooldown_until?: string | null
          created_at?: string
          failure_count?: number | null
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          notes?: string | null
          priority?: number | null
          status?: string
          success_count?: number | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          cooldown_until?: string | null
          created_at?: string
          failure_count?: number | null
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          notes?: string | null
          priority?: number | null
          status?: string
          success_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      generated_sites: {
        Row: {
          created_at: string
          error_message: string | null
          files: Json | null
          html_compiled: string | null
          id: string
          is_public: boolean
          jsx_code: string | null
          model_used: string | null
          preview_url: string | null
          progress: number
          prompt: string
          published_url: string | null
          share_slug: string | null
          status: string
          tasks: Json
          title: string
          tokens_used: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          files?: Json | null
          html_compiled?: string | null
          id?: string
          is_public?: boolean
          jsx_code?: string | null
          model_used?: string | null
          preview_url?: string | null
          progress?: number
          prompt: string
          published_url?: string | null
          share_slug?: string | null
          status?: string
          tasks?: Json
          title?: string
          tokens_used?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          files?: Json | null
          html_compiled?: string | null
          id?: string
          is_public?: boolean
          jsx_code?: string | null
          model_used?: string | null
          preview_url?: string | null
          progress?: number
          prompt?: string
          published_url?: string | null
          share_slug?: string | null
          status?: string
          tasks?: Json
          title?: string
          tokens_used?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_songs: {
        Row: {
          audio_url: string
          created_at: string | null
          duration_seconds: number | null
          id: string
          prompt: string
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          prompt: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          prompt?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          input_data: Json
          job_type: string
          progress: number | null
          result_data: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type?: string
          progress?: number | null
          result_data?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type?: string
          progress?: number | null
          result_data?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      github_oauth_states: {
        Row: {
          created_at: string
          redirect_to: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          redirect_to?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          redirect_to?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      headshot_templates: {
        Row: {
          created_at: string | null
          display_order: number | null
          gender: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_url: string | null
          prompt: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_url?: string | null
          prompt: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_url?: string | null
          prompt?: string
        }
        Relationships: []
      }
      hitl_tool_approvals: {
        Row: {
          created_at: string
          decision: string
          id: string
          tool_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          id?: string
          tool_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          id?: string
          tool_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      i18n_sync_runs: {
        Row: {
          entries_scanned: number
          entries_skipped: number
          entries_translated: number
          errors: Json | null
          finished_at: string | null
          id: string
          namespace: string
          started_at: string
          trigger: string
        }
        Insert: {
          entries_scanned?: number
          entries_skipped?: number
          entries_translated?: number
          errors?: Json | null
          finished_at?: string | null
          id?: string
          namespace: string
          started_at?: string
          trigger?: string
        }
        Update: {
          entries_scanned?: number
          entries_skipped?: number
          entries_translated?: number
          errors?: Json | null
          finished_at?: string | null
          id?: string
          namespace?: string
          started_at?: string
          trigger?: string
        }
        Relationships: []
      }
      i18n_translations: {
        Row: {
          created_at: string
          entry_key: string
          language: string
          namespace: string
          source_hash: string
          source_value: Json | null
          translated_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_key: string
          language: string
          namespace?: string
          source_hash: string
          source_value?: Json | null
          translated_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_key?: string
          language?: string
          namespace?: string
          source_hash?: string
          source_value?: Json | null
          translated_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      image_models: {
        Row: {
          api_version: string
          billing_mode: string
          created_at: string
          credits: number
          default_aspect: string
          default_resolution: string
          description: string | null
          display_name: string
          endpoint_image_to_image: string | null
          endpoint_multi_reference: string | null
          endpoint_text_to_image: string | null
          free_trial_count: number
          id: string
          is_active: boolean
          is_featured: boolean
          is_new: boolean
          is_premium: boolean
          max_input_images: number
          max_resolution: string | null
          model_id_api: string | null
          provider: string
          provider_pool: string | null
          slug: string
          sort_order: number
          supported_aspects: Json
          supported_resolutions: Json
          supports_image_editing: boolean
          supports_multi_image: boolean
          supports_text_rendering: boolean
          supports_vector_output: boolean
          thumbnail_url: string | null
          unit: string
          unit_cost_usd: number
          updated_at: string
        }
        Insert: {
          api_version?: string
          billing_mode?: string
          created_at?: string
          credits?: number
          default_aspect?: string
          default_resolution?: string
          description?: string | null
          display_name: string
          endpoint_image_to_image?: string | null
          endpoint_multi_reference?: string | null
          endpoint_text_to_image?: string | null
          free_trial_count?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_premium?: boolean
          max_input_images?: number
          max_resolution?: string | null
          model_id_api?: string | null
          provider: string
          provider_pool?: string | null
          slug: string
          sort_order?: number
          supported_aspects?: Json
          supported_resolutions?: Json
          supports_image_editing?: boolean
          supports_multi_image?: boolean
          supports_text_rendering?: boolean
          supports_vector_output?: boolean
          thumbnail_url?: string | null
          unit?: string
          unit_cost_usd?: number
          updated_at?: string
        }
        Update: {
          api_version?: string
          billing_mode?: string
          created_at?: string
          credits?: number
          default_aspect?: string
          default_resolution?: string
          description?: string | null
          display_name?: string
          endpoint_image_to_image?: string | null
          endpoint_multi_reference?: string | null
          endpoint_text_to_image?: string | null
          free_trial_count?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_premium?: boolean
          max_input_images?: number
          max_resolution?: string | null
          model_id_api?: string | null
          provider?: string
          provider_pool?: string | null
          slug?: string
          sort_order?: number
          supported_aspects?: Json
          supported_resolutions?: Json
          supports_image_editing?: boolean
          supports_multi_image?: boolean
          supports_text_rendering?: boolean
          supports_vector_output?: boolean
          thumbnail_url?: string | null
          unit?: string
          unit_cost_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      image_templates: {
        Row: {
          created_at: string
          display_order: number
          example_image_url: string | null
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          prompt: string
          type: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          example_image_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          prompt: string
          type?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          example_image_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          prompt?: string
          type?: string
        }
        Relationships: []
      }
      kashier_orders: {
        Row: {
          amount: number
          created_at: string
          credits: number
          currency: string
          id: string
          kashier_ref: string | null
          method: string | null
          order_id: string
          plan: string | null
          raw: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credits?: number
          currency?: string
          id?: string
          kashier_ref?: string | null
          method?: string | null
          order_id: string
          plan?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credits?: number
          currency?: string
          id?: string
          kashier_ref?: string | null
          method?: string | null
          order_id?: string
          plan?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      key_usage_log: {
        Row: {
          cost_usd: number | null
          created_at: string
          error_message: string | null
          id: string
          key_id: string | null
          model_id: string | null
          provider: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          key_id?: string | null
          model_id?: string | null
          provider: string
          success: boolean
          user_id?: string | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          key_id?: string | null
          model_id?: string | null
          provider?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      landing_page_prompts: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_pro: boolean
          is_published: boolean
          media_type: string
          media_url: string
          name: string
          prompt: string
          slug: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_pro?: boolean
          is_published?: boolean
          media_type?: string
          media_url: string
          name: string
          prompt: string
          slug?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_pro?: boolean
          is_published?: boolean
          media_type?: string
          media_url?: string
          name?: string
          prompt?: string
          slug?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      landing_page_prompts_public: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_pro: boolean | null
          is_published: boolean | null
          media_type: string | null
          media_url: string | null
          name: string | null
          slug: string | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id: string
          is_pro?: boolean | null
          is_published?: boolean | null
          media_type?: string | null
          media_url?: string | null
          name?: string | null
          slug?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_pro?: boolean | null
          is_published?: boolean | null
          media_type?: string | null
          media_url?: string | null
          name?: string | null
          slug?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      learn_profile: {
        Row: {
          analogy_style: string | null
          created_at: string
          interests: string[] | null
          level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analogy_style?: string | null
          created_at?: string
          interests?: string[] | null
          level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analogy_style?: string | null
          created_at?: string
          interests?: string[] | null
          level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learn_sessions: {
        Row: {
          conversation_id: string | null
          created_at: string
          duration_min: number | null
          id: string
          mastered_topics: Json | null
          questions_correct: number | null
          questions_total: number | null
          topic: string | null
          user_id: string
          weak_topics: Json | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          duration_min?: number | null
          id?: string
          mastered_topics?: Json | null
          questions_correct?: number | null
          questions_total?: number | null
          topic?: string | null
          user_id: string
          weak_topics?: Json | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          duration_min?: number | null
          id?: string
          mastered_topics?: Json | null
          questions_correct?: number | null
          questions_total?: number | null
          topic?: string | null
          user_id?: string
          weak_topics?: Json | null
        }
        Relationships: []
      }
      local_device_commands: {
        Row: {
          created_at: string
          device_id: string | null
          error: string | null
          id: string
          kind: string
          origin: string | null
          payload: Json | null
          result: Json | null
          status: string
          summary: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          error?: string | null
          id?: string
          kind: string
          origin?: string | null
          payload?: Json | null
          result?: Json | null
          status?: string
          summary?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          error?: string | null
          id?: string
          kind?: string
          origin?: string | null
          payload?: Json | null
          result?: Json | null
          status?: string
          summary?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      local_devices: {
        Row: {
          agent_version: string | null
          allowlist: Json | null
          capabilities: Json | null
          created_at: string
          hostname: string | null
          id: string
          last_seen_at: string | null
          name: string
          os: string | null
          pair_code: string | null
          pair_expires_at: string | null
          permission_mode: string | null
          status: string
          token_hash: string | null
          updated_at: string
          user_id: string | null
          work_dir: string | null
        }
        Insert: {
          agent_version?: string | null
          allowlist?: Json | null
          capabilities?: Json | null
          created_at?: string
          hostname?: string | null
          id?: string
          last_seen_at?: string | null
          name?: string
          os?: string | null
          pair_code?: string | null
          pair_expires_at?: string | null
          permission_mode?: string | null
          status?: string
          token_hash?: string | null
          updated_at?: string
          user_id?: string | null
          work_dir?: string | null
        }
        Update: {
          agent_version?: string | null
          allowlist?: Json | null
          capabilities?: Json | null
          created_at?: string
          hostname?: string | null
          id?: string
          last_seen_at?: string | null
          name?: string
          os?: string | null
          pair_code?: string | null
          pair_expires_at?: string | null
          permission_mode?: string | null
          status?: string
          token_hash?: string | null
          updated_at?: string
          user_id?: string | null
          work_dir?: string | null
        }
        Relationships: []
      }
      long_run_events: {
        Row: {
          action: string | null
          created_at: string
          detail: string | null
          event_type: string | null
          id: string
          metadata: Json | null
          progress: number | null
          run_id: string | null
          screenshot_url: string | null
          status: string | null
          step_id: string | null
          summary: string | null
          title: string | null
          tool: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          detail?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json | null
          progress?: number | null
          run_id?: string | null
          screenshot_url?: string | null
          status?: string | null
          step_id?: string | null
          summary?: string | null
          title?: string | null
          tool?: string | null
          type?: string
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          detail?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json | null
          progress?: number | null
          run_id?: string | null
          screenshot_url?: string | null
          status?: string | null
          step_id?: string | null
          summary?: string | null
          title?: string | null
          tool?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      long_runs: {
        Row: {
          auto_continue_allowed: boolean | null
          auto_continue_at: string | null
          awaiting_plan_ack: boolean | null
          budget_ms: number | null
          conversation_id: string | null
          created_at: string
          decide_failures: number | null
          error: string | null
          expires_at: string | null
          external_run_id: string | null
          failure_class: string | null
          goal: string
          id: string
          kind: string | null
          last_heartbeat_at: string | null
          last_tool_at: string | null
          live_view_url: string | null
          loop_strikes: number | null
          needs_input: boolean | null
          notified_at: string | null
          pending_guidance: Json | null
          pending_steering: Json | null
          phase: string | null
          plan_id: string | null
          provider: string | null
          review_round: number | null
          risk_level: string | null
          status: string
          status_text: string | null
          step_count: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auto_continue_allowed?: boolean | null
          auto_continue_at?: string | null
          awaiting_plan_ack?: boolean | null
          budget_ms?: number | null
          conversation_id?: string | null
          created_at?: string
          decide_failures?: number | null
          error?: string | null
          expires_at?: string | null
          external_run_id?: string | null
          failure_class?: string | null
          goal: string
          id?: string
          kind?: string | null
          last_heartbeat_at?: string | null
          last_tool_at?: string | null
          live_view_url?: string | null
          loop_strikes?: number | null
          needs_input?: boolean | null
          notified_at?: string | null
          pending_guidance?: Json | null
          pending_steering?: Json | null
          phase?: string | null
          plan_id?: string | null
          provider?: string | null
          review_round?: number | null
          risk_level?: string | null
          status?: string
          status_text?: string | null
          step_count?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auto_continue_allowed?: boolean | null
          auto_continue_at?: string | null
          awaiting_plan_ack?: boolean | null
          budget_ms?: number | null
          conversation_id?: string | null
          created_at?: string
          decide_failures?: number | null
          error?: string | null
          expires_at?: string | null
          external_run_id?: string | null
          failure_class?: string | null
          goal?: string
          id?: string
          kind?: string | null
          last_heartbeat_at?: string | null
          last_tool_at?: string | null
          live_view_url?: string | null
          loop_strikes?: number | null
          needs_input?: boolean | null
          notified_at?: string | null
          pending_guidance?: Json | null
          pending_steering?: Json | null
          phase?: string | null
          plan_id?: string | null
          provider?: string | null
          review_round?: number | null
          risk_level?: string | null
          status?: string
          status_text?: string | null
          step_count?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      mail_messages: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          delivery_status: string | null
          direction: string
          external_message_id: string | null
          folder: string
          from_address: string | null
          from_name: string | null
          id: string
          is_read: boolean | null
          mailbox_id: string | null
          origin: string | null
          snippet: string | null
          spam_score: number | null
          subject: string | null
          to_address: string | null
          user_id: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          delivery_status?: string | null
          direction?: string
          external_message_id?: string | null
          folder?: string
          from_address?: string | null
          from_name?: string | null
          id?: string
          is_read?: boolean | null
          mailbox_id?: string | null
          origin?: string | null
          snippet?: string | null
          spam_score?: number | null
          subject?: string | null
          to_address?: string | null
          user_id?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          delivery_status?: string | null
          direction?: string
          external_message_id?: string | null
          folder?: string
          from_address?: string | null
          from_name?: string | null
          id?: string
          is_read?: boolean | null
          mailbox_id?: string | null
          origin?: string | null
          snippet?: string | null
          spam_score?: number | null
          subject?: string | null
          to_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mailboxes: {
        Row: {
          address: string
          created_at: string
          display_name: string | null
          external_enabled: boolean | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          created_at?: string
          display_name?: string | null
          external_enabled?: boolean | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          display_name?: string | null
          external_enabled?: boolean | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      manus_artifacts: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          name: string | null
          path: string
          run_id: string
          size_bytes: number | null
          storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string | null
          path: string
          run_id: string
          size_bytes?: number | null
          storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string | null
          path?: string
          run_id?: string
          size_bytes?: number | null
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manus_artifacts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "manus_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      manus_keys: {
        Row: {
          api_key: string
          created_at: string
          failure_count: number
          id: string
          label: string | null
          last_error: string | null
          last_used_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          api_key: string
          created_at?: string
          failure_count?: number
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          failure_count?: number
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      manus_runs: {
        Row: {
          conversation_id: string | null
          created_at: string
          cursor_seq: number
          error: string | null
          final_answer: string | null
          finished_at: string | null
          id: string
          last_polled_at: string | null
          max_steps: number
          prompt: string
          question: string | null
          run_dir: string | null
          run_token: string
          sandbox_id: string | null
          started_at: string | null
          status: string
          step_count: number
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          cursor_seq?: number
          error?: string | null
          final_answer?: string | null
          finished_at?: string | null
          id?: string
          last_polled_at?: string | null
          max_steps?: number
          prompt: string
          question?: string | null
          run_dir?: string | null
          run_token?: string
          sandbox_id?: string | null
          started_at?: string | null
          status?: string
          step_count?: number
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          cursor_seq?: number
          error?: string | null
          final_answer?: string | null
          finished_at?: string | null
          id?: string
          last_polled_at?: string | null
          max_steps?: number
          prompt?: string
          question?: string | null
          run_dir?: string | null
          run_token?: string
          sandbox_id?: string | null
          started_at?: string | null
          status?: string
          step_count?: number
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      manus_steps: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          run_id: string
          seq: number
          step: number | null
          text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          run_id: string
          seq: number
          step?: number | null
          text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          run_id?: string
          seq?: number
          step?: number | null
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manus_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "manus_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      manus_tool_calls: {
        Row: {
          arguments: Json | null
          call_id: string | null
          created_at: string
          finished_at: string | null
          id: string
          name: string
          result: string | null
          run_id: string
          status: string
          step: number | null
          user_id: string
        }
        Insert: {
          arguments?: Json | null
          call_id?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          name: string
          result?: string | null
          run_id: string
          status?: string
          step?: number | null
          user_id: string
        }
        Update: {
          arguments?: Json | null
          call_id?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          name?: string
          result?: string | null
          run_id?: string
          status?: string
          step?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manus_tool_calls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "manus_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_accounts: {
        Row: {
          campaign_id: string | null
          config: Json
          created_at: string
          credentials: Json
          display_name: string | null
          enabled: boolean
          handle: string | null
          id: string
          last_test_at: string | null
          last_test_error: string | null
          last_test_ok: boolean | null
          last_used_at: string | null
          platform: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          config?: Json
          created_at?: string
          credentials?: Json
          display_name?: string | null
          enabled?: boolean
          handle?: string | null
          id?: string
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_ok?: boolean | null
          last_used_at?: string | null
          platform: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          config?: Json
          created_at?: string
          credentials?: Json
          display_name?: string | null
          enabled?: boolean
          handle?: string | null
          id?: string
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_ok?: boolean | null
          last_used_at?: string | null
          platform?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_ads: {
        Row: {
          aspect_ratio: string | null
          body_copy: string | null
          campaign_id: string
          color_mood: string | null
          created_at: string
          cta: string | null
          error: string | null
          headline: string
          id: string
          image_url: string | null
          platform: string | null
          status: string
          subheadline: string | null
          user_id: string
          visual_prompt: string
        }
        Insert: {
          aspect_ratio?: string | null
          body_copy?: string | null
          campaign_id: string
          color_mood?: string | null
          created_at?: string
          cta?: string | null
          error?: string | null
          headline: string
          id?: string
          image_url?: string | null
          platform?: string | null
          status?: string
          subheadline?: string | null
          user_id: string
          visual_prompt: string
        }
        Update: {
          aspect_ratio?: string | null
          body_copy?: string | null
          campaign_id?: string
          color_mood?: string | null
          created_at?: string
          cta?: string | null
          error?: string | null
          headline?: string
          id?: string
          image_url?: string | null
          platform?: string | null
          status?: string
          subheadline?: string | null
          user_id?: string
          visual_prompt?: string
        }
        Relationships: []
      }
      marketing_analytics: {
        Row: {
          account_id: string | null
          clicks: number | null
          comments: number | null
          external_id: string | null
          fetched_at: string
          id: string
          impressions: number | null
          likes: number | null
          platform: string
          post_id: string | null
          raw: Json
          reshares: number | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          clicks?: number | null
          comments?: number | null
          external_id?: string | null
          fetched_at?: string
          id?: string
          impressions?: number | null
          likes?: number | null
          platform: string
          post_id?: string | null
          raw?: Json
          reshares?: number | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          clicks?: number | null
          comments?: number | null
          external_id?: string | null
          fetched_at?: string
          id?: string
          impressions?: number | null
          likes?: number | null
          platform?: string
          post_id?: string | null
          raw?: Json
          reshares?: number | null
          user_id?: string
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          active: boolean
          ai_model: string | null
          ai_prompt_template: string | null
          brief: Json
          created_at: string
          goal: string | null
          hashtags: string[] | null
          id: string
          languages: string[] | null
          name: string
          product_description: string | null
          product_name: string | null
          schedule_cron: string | null
          target_audience: string | null
          tone: string | null
          topics: string[] | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          active?: boolean
          ai_model?: string | null
          ai_prompt_template?: string | null
          brief?: Json
          created_at?: string
          goal?: string | null
          hashtags?: string[] | null
          id?: string
          languages?: string[] | null
          name: string
          product_description?: string | null
          product_name?: string | null
          schedule_cron?: string | null
          target_audience?: string | null
          tone?: string | null
          topics?: string[] | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          active?: boolean
          ai_model?: string | null
          ai_prompt_template?: string | null
          brief?: Json
          created_at?: string
          goal?: string | null
          hashtags?: string[] | null
          id?: string
          languages?: string[] | null
          name?: string
          product_description?: string | null
          product_name?: string | null
          schedule_cron?: string | null
          target_audience?: string | null
          tone?: string | null
          topics?: string[] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      marketing_platform_limits: {
        Row: {
          account_id: string | null
          count_day: number
          count_hour: number
          count_minute: number
          created_at: string
          id: string
          last_published_at: string | null
          platform: string
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          account_id?: string | null
          count_day?: number
          count_hour?: number
          count_minute?: number
          created_at?: string
          id?: string
          last_published_at?: string | null
          platform: string
          updated_at?: string
          user_id: string
          window_start?: string
        }
        Update: {
          account_id?: string | null
          count_day?: number
          count_hour?: number
          count_minute?: number
          created_at?: string
          id?: string
          last_published_at?: string | null
          platform?: string
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      marketing_posts: {
        Row: {
          ai_generated: boolean | null
          campaign_id: string | null
          content: string
          content_hash: string | null
          created_at: string
          hashtags: string[] | null
          id: string
          language: string | null
          media_urls: string[] | null
          platform_variants: Json
          published_at: string | null
          scheduled_at: string | null
          status: string
          target_platforms: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          campaign_id?: string | null
          content: string
          content_hash?: string | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          language?: string | null
          media_urls?: string[] | null
          platform_variants?: Json
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          target_platforms?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean | null
          campaign_id?: string | null
          content?: string
          content_hash?: string | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          language?: string | null
          media_urls?: string[] | null
          platform_variants?: Json
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          target_platforms?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_publish_log: {
        Row: {
          account_id: string | null
          created_at: string
          error: string | null
          external_id: string | null
          external_url: string | null
          id: string
          metrics: Json | null
          platform: string
          post_id: string | null
          success: boolean
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          error?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          metrics?: Json | null
          platform: string
          post_id?: string | null
          success?: boolean
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          error?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          metrics?: Json | null
          platform?: string
          post_id?: string | null
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      marketing_publish_queue: {
        Row: {
          account_id: string
          attempts: number
          completed_at: string | null
          created_at: string
          external_id: string | null
          external_url: string | null
          id: string
          last_error: string | null
          last_error_code: string | null
          max_attempts: number
          next_attempt_at: string
          platform: string
          post_id: string
          scheduled_at: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          attempts?: number
          completed_at?: string | null
          created_at?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          last_error?: string | null
          last_error_code?: string | null
          max_attempts?: number
          next_attempt_at?: string
          platform: string
          post_id: string
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          attempts?: number
          completed_at?: string | null
          created_at?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          last_error?: string | null
          last_error_code?: string | null
          max_attempts?: number
          next_attempt_at?: string
          platform?: string
          post_id?: string
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mcp_call_log: {
        Row: {
          arguments: Json | null
          connection_id: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          server_name: string | null
          status: string
          tool_name: string | null
          user_id: string | null
        }
        Insert: {
          arguments?: Json | null
          connection_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          server_name?: string | null
          status?: string
          tool_name?: string | null
          user_id?: string | null
        }
        Update: {
          arguments?: Json | null
          connection_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          server_name?: string | null
          status?: string
          tool_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mcp_connections: {
        Row: {
          auth_headers: Json
          auth_mode: string | null
          capabilities: Json
          created_at: string
          enabled: boolean
          id: string
          last_error: string | null
          last_probed_at: string | null
          name: string
          oauth: Json
          protocol_version: string | null
          state: string
          tool_names: string[]
          tool_schemas: Json
          tools: Json
          transport: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          auth_headers?: Json
          auth_mode?: string | null
          capabilities?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_probed_at?: string | null
          name: string
          oauth?: Json
          protocol_version?: string | null
          state?: string
          tool_names?: string[]
          tool_schemas?: Json
          tools?: Json
          transport?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          auth_headers?: Json
          auth_mode?: string | null
          capabilities?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_probed_at?: string | null
          name?: string
          oauth?: Json
          protocol_version?: string | null
          state?: string
          tool_names?: string[]
          tool_schemas?: Json
          tools?: Json
          transport?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      mcp_oauth_states: {
        Row: {
          code_verifier: string | null
          connection_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          state: string
          user_id: string | null
        }
        Insert: {
          code_verifier?: string | null
          connection_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          state: string
          user_id?: string | null
        }
        Update: {
          code_verifier?: string | null
          connection_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          state?: string
          user_id?: string | null
        }
        Relationships: []
      }
      mcp_tool_approvals: {
        Row: {
          connection_id: string | null
          created_at: string
          id: string
          scope: string
          tool_name: string
          user_id: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          id?: string
          scope?: string
          tool_name: string
          user_id?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          id?: string
          scope?: string
          tool_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          cost_credits: number
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          kind: string
          metadata: Json
          model: string
          prompt: string | null
          provider: string
          public_url: string
          storage_path: string
          user_id: string
          width: number | null
          workspace_id: string | null
        }
        Insert: {
          cost_credits?: number
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          kind: string
          metadata?: Json
          model: string
          prompt?: string | null
          provider: string
          public_url: string
          storage_path: string
          user_id: string
          width?: number | null
          workspace_id?: string | null
        }
        Update: {
          cost_credits?: number
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          kind?: string
          metadata?: Json
          model?: string
          prompt?: string | null
          provider?: string
          public_url?: string
          storage_path?: string
          user_id?: string
          width?: number | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      media_generation_log: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          key_id: string | null
          kind: string
          model_id: string
          provider: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          key_id?: string | null
          kind: string
          model_id: string
          provider: string
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          key_id?: string | null
          kind?: string
          model_id?: string
          provider?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      media_key_limits: {
        Row: {
          created_at: string
          id: string
          key_id: string
          max_uses: number
          model_id: string
          reset_period: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_id: string
          max_uses: number
          model_id: string
          reset_period?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key_id?: string
          max_uses?: number
          model_id?: string
          reset_period?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_key_usage: {
        Row: {
          id: string
          key_id: string
          last_used_at: string | null
          model_id: string
          period_start: string
          used_count: number
        }
        Insert: {
          id?: string
          key_id: string
          last_used_at?: string | null
          model_id: string
          period_start?: string
          used_count?: number
        }
        Update: {
          id?: string
          key_id?: string
          last_used_at?: string | null
          model_id?: string
          period_start?: string
          used_count?: number
        }
        Relationships: []
      }
      media_page_prompts: {
        Row: {
          created_at: string
          created_by: string | null
          example_image_url: string | null
          id: string
          model_id: string | null
          page_slug: string
          position: number
          prompt_text: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          example_image_url?: string | null
          id?: string
          model_id?: string | null
          page_slug: string
          position?: number
          prompt_text: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          example_image_url?: string | null
          id?: string
          model_id?: string | null
          page_slug?: string
          position?: number
          prompt_text?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      media_provider_keys: {
        Row: {
          api_key: string
          created_at: string
          endpoint_host: string | null
          id: string
          label: string | null
          notes: string | null
          priority: number
          provider: string
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          api_key: string
          created_at?: string
          endpoint_host?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          priority?: number
          provider: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          endpoint_host?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          priority?: number
          provider?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      meeting_recordings: {
        Row: {
          action_items: Json | null
          audio_url: string | null
          created_at: string
          credits_used: number | null
          decisions: Json | null
          duration_minutes: number | null
          id: string
          key_points: Json | null
          meeting_id: string
          status: string
          summary: string | null
          transcript: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          audio_url?: string | null
          created_at?: string
          credits_used?: number | null
          decisions?: Json | null
          duration_minutes?: number | null
          id?: string
          key_points?: Json | null
          meeting_id: string
          status?: string
          summary?: string | null
          transcript?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_items?: Json | null
          audio_url?: string | null
          created_at?: string
          credits_used?: number | null
          decisions?: Json | null
          duration_minutes?: number | null
          id?: string
          key_points?: Json | null
          meeting_id?: string
          status?: string
          summary?: string | null
          transcript?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          bot_enabled: boolean
          bot_id: string | null
          calendar_event_id: string | null
          created_at: string
          end_time: string
          id: string
          meeting_url: string | null
          platform: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_enabled?: boolean
          bot_id?: string | null
          calendar_event_id?: string | null
          created_at?: string
          end_time: string
          id?: string
          meeting_url?: string | null
          platform?: string | null
          start_time: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_enabled?: boolean
          bot_id?: string | null
          calendar_event_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          meeting_url?: string | null
          platform?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      megsy_code_skills: {
        Row: {
          category: string
          content: string
          created_at: string
          enabled: boolean
          id: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          enabled?: boolean
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          enabled?: boolean
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          created_at: string
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      message_feedback: {
        Row: {
          created_at: string
          id: string
          message_id: string
          project_id: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          project_id: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          project_id?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          conversation_id: string
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      message_reads: {
        Row: {
          conversation_id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          embedding: string | null
          id: string
          images: string[] | null
          liked: boolean | null
          metadata: Json | null
          role: string
          user_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          embedding?: string | null
          id?: string
          images?: string[] | null
          liked?: boolean | null
          metadata?: Json | null
          role: string
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          embedding?: string | null
          id?: string
          images?: string[] | null
          liked?: boolean | null
          metadata?: Json | null
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      model_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          media_url: string
          model_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type?: string
          media_url: string
          model_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string
          model_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      model_pricing: {
        Row: {
          badge: string | null
          created_at: string
          credits_per_unit: number | null
          enabled: boolean
          endpoint: string
          icon: string | null
          id: string
          in_price_per_m: number | null
          kind: string
          label: string
          max_credits: number | null
          metadata: Json
          min_credits: number | null
          out_price_per_m: number | null
          provider: string
          sort_order: number
          unit: string
        }
        Insert: {
          badge?: string | null
          created_at?: string
          credits_per_unit?: number | null
          enabled?: boolean
          endpoint: string
          icon?: string | null
          id: string
          in_price_per_m?: number | null
          kind: string
          label: string
          max_credits?: number | null
          metadata?: Json
          min_credits?: number | null
          out_price_per_m?: number | null
          provider: string
          sort_order?: number
          unit: string
        }
        Update: {
          badge?: string | null
          created_at?: string
          credits_per_unit?: number | null
          enabled?: boolean
          endpoint?: string
          icon?: string | null
          id?: string
          in_price_per_m?: number | null
          kind?: string
          label?: string
          max_credits?: number | null
          metadata?: Json
          min_credits?: number | null
          out_price_per_m?: number | null
          provider?: string
          sort_order?: number
          unit?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          app_credits: boolean
          app_generation: boolean
          app_referral: boolean
          app_system: boolean
          created_at: string
          email_enabled: boolean
          email_low_balance: boolean
          email_newsletter: boolean
          email_transactions: boolean
          email_welcome: boolean
          id: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          app_credits?: boolean
          app_generation?: boolean
          app_referral?: boolean
          app_system?: boolean
          created_at?: string
          email_enabled?: boolean
          email_low_balance?: boolean
          email_newsletter?: boolean
          email_transactions?: boolean
          email_welcome?: boolean
          id?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          app_credits?: boolean
          app_generation?: boolean
          app_referral?: boolean
          app_system?: boolean
          created_at?: string
          email_enabled?: boolean
          email_low_balance?: boolean
          email_newsletter?: boolean
          email_transactions?: boolean
          email_welcome?: boolean
          id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_clients: {
        Row: {
          client_id: string
          client_secret_hash: string
          created_at: string | null
          id: string
          is_public: boolean | null
          logo_url: string | null
          name: string
          redirect_uris: string[]
          user_id: string
        }
        Insert: {
          client_id: string
          client_secret_hash: string
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          logo_url?: string | null
          name: string
          redirect_uris?: string[]
          user_id: string
        }
        Update: {
          client_id?: string
          client_secret_hash?: string
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          logo_url?: string | null
          name?: string
          redirect_uris?: string[]
          user_id?: string
        }
        Relationships: []
      }
      oauth_codes: {
        Row: {
          client_id: string
          code: string
          created_at: string | null
          expires_at: string
          id: string
          redirect_uri: string
          scope: string | null
          used: boolean | null
          user_id: string
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          redirect_uri: string
          scope?: string | null
          used?: boolean | null
          user_id: string
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          redirect_uri?: string
          scope?: string | null
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      oauth_tokens: {
        Row: {
          access_token: string
          client_id: string
          created_at: string | null
          expires_at: string
          id: string
          scope: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          client_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          scope?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          client_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          scope?: string | null
          user_id?: string
        }
        Relationships: []
      }
      operator_agent_messages: {
        Row: {
          agent: string
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          run_id: string
        }
        Insert: {
          agent: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          run_id: string
        }
        Update: {
          agent?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          run_id?: string
        }
        Relationships: []
      }
      operator_artifacts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          kind: string
          metadata: Json | null
          run_id: string
          step_id: string | null
          url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          kind: string
          metadata?: Json | null
          run_id: string
          step_id?: string | null
          url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json | null
          run_id?: string
          step_id?: string | null
          url?: string | null
        }
        Relationships: []
      }
      operator_audit_log: {
        Row: {
          action: string
          agent: string
          created_at: string
          error: string | null
          id: string
          payload: Json
          result: Json | null
          run_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          agent: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          run_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          agent?: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          run_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      operator_dynamic_agents: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          key: string
          label: string
          last_used_at: string | null
          spawned_from_run_id: string | null
          system_prompt: string
          usage_count: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          key: string
          label: string
          last_used_at?: string | null
          spawned_from_run_id?: string | null
          system_prompt: string
          usage_count?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          key?: string
          label?: string
          last_used_at?: string | null
          spawned_from_run_id?: string | null
          system_prompt?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      operator_memory: {
        Row: {
          category: string | null
          created_at: string
          fact: string
          id: string
          importance: number
          last_accessed_at: string | null
          source_run_id: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          fact: string
          id?: string
          importance?: number
          last_accessed_at?: string | null
          source_run_id?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          fact?: string
          id?: string
          importance?: number
          last_accessed_at?: string | null
          source_run_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      operator_runs: {
        Row: {
          browser_session_id: string | null
          chat_response: string | null
          created_at: string
          current_phase: string | null
          error: string | null
          goal: string
          id: string
          last_tick_at: string | null
          live_view_url: string | null
          manus_cursor: string | null
          manus_task_id: string | null
          metadata: Json | null
          mode: string
          project_id: string | null
          published_url: string | null
          result: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          browser_session_id?: string | null
          chat_response?: string | null
          created_at?: string
          current_phase?: string | null
          error?: string | null
          goal: string
          id?: string
          last_tick_at?: string | null
          live_view_url?: string | null
          manus_cursor?: string | null
          manus_task_id?: string | null
          metadata?: Json | null
          mode?: string
          project_id?: string | null
          published_url?: string | null
          result?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          browser_session_id?: string | null
          chat_response?: string | null
          created_at?: string
          current_phase?: string | null
          error?: string | null
          goal?: string
          id?: string
          last_tick_at?: string | null
          live_view_url?: string | null
          manus_cursor?: string | null
          manus_task_id?: string | null
          metadata?: Json | null
          mode?: string
          project_id?: string | null
          published_url?: string | null
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      operator_steps: {
        Row: {
          agent: string
          created_at: string
          description: string | null
          error: string | null
          finished_at: string | null
          id: string
          retries: number
          run_id: string
          started_at: string | null
          status: string
          step_no: number
          title: string
          tool: string | null
          tool_input: Json | null
          tool_output: Json | null
        }
        Insert: {
          agent?: string
          created_at?: string
          description?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          retries?: number
          run_id: string
          started_at?: string | null
          status?: string
          step_no: number
          title: string
          tool?: string | null
          tool_input?: Json | null
          tool_output?: Json | null
        }
        Update: {
          agent?: string
          created_at?: string
          description?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          retries?: number
          run_id?: string
          started_at?: string | null
          status?: string
          step_no?: number
          title?: string
          tool?: string | null
          tool_input?: Json | null
          tool_output?: Json | null
        }
        Relationships: []
      }
      operator_user_settings: {
        Row: {
          allow_browser_automation: boolean
          allow_dynamic_agents: boolean
          allow_free_shell: boolean
          ask_before_anything: boolean
          ask_before_sensitive: boolean
          budget_cap_cents: number
          created_at: string
          max_parallel_agents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_browser_automation?: boolean
          allow_dynamic_agents?: boolean
          allow_free_shell?: boolean
          ask_before_anything?: boolean
          ask_before_sensitive?: boolean
          budget_cap_cents?: number
          created_at?: string
          max_parallel_agents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_browser_automation?: boolean
          allow_dynamic_agents?: boolean
          allow_free_shell?: boolean
          ask_before_anything?: boolean
          ask_before_sensitive?: boolean
          budget_cap_cents?: number
          created_at?: string
          max_parallel_agents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      page_views: {
        Row: {
          country: string | null
          duration_ms: number | null
          ended_at: string | null
          id: string
          path: string
          referrer: string | null
          session_id: string
          started_at: string
          user_agent: string | null
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          country?: string | null
          duration_ms?: number | null
          ended_at?: string | null
          id?: string
          path: string
          referrer?: string | null
          session_id: string
          started_at?: string
          user_agent?: string | null
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          country?: string | null
          duration_ms?: number | null
          ended_at?: string | null
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      parallel_monitor_events: {
        Row: {
          citations: Json | null
          created_at: string
          event_type: string
          id: string
          monitor_id: string
          payload: Json
          seen: boolean
          summary: string | null
          user_id: string
        }
        Insert: {
          citations?: Json | null
          created_at?: string
          event_type?: string
          id?: string
          monitor_id: string
          payload?: Json
          seen?: boolean
          summary?: string | null
          user_id: string
        }
        Update: {
          citations?: Json | null
          created_at?: string
          event_type?: string
          id?: string
          monitor_id?: string
          payload?: Json
          seen?: boolean
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      parallel_monitors: {
        Row: {
          config: Json | null
          conversation_id: string | null
          created_at: string
          event_count: number
          frequency: string | null
          id: string
          last_event_at: string | null
          objective: string
          parallel_monitor_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json | null
          conversation_id?: string | null
          created_at?: string
          event_count?: number
          frequency?: string | null
          id?: string
          last_event_at?: string | null
          objective: string
          parallel_monitor_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json | null
          conversation_id?: string | null
          created_at?: string
          event_count?: number
          frequency?: string | null
          id?: string
          last_event_at?: string | null
          objective?: string
          parallel_monitor_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      parallel_tasks: {
        Row: {
          citations: Json | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          error: string | null
          id: string
          input: Json
          message_id: string | null
          metadata: Json | null
          output: Json | null
          parallel_processor: string | null
          parallel_task_id: string | null
          status: string
          task_type: string
          updated_at: string
          user_id: string
          webhook_received_at: string | null
        }
        Insert: {
          citations?: Json | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input?: Json
          message_id?: string | null
          metadata?: Json | null
          output?: Json | null
          parallel_processor?: string | null
          parallel_task_id?: string | null
          status?: string
          task_type: string
          updated_at?: string
          user_id: string
          webhook_received_at?: string | null
        }
        Update: {
          citations?: Json | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input?: Json
          message_id?: string | null
          metadata?: Json | null
          output?: Json | null
          parallel_processor?: string | null
          parallel_task_id?: string | null
          status?: string
          task_type?: string
          updated_at?: string
          user_id?: string
          webhook_received_at?: string | null
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          polar_event_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          polar_event_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          polar_event_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pending_video_jobs: {
        Row: {
          api_key_id: string | null
          aspect_ratio: string | null
          created_at: string
          credits_charged: number
          duration_seconds: number | null
          end_frame_url: string | null
          error: string | null
          generation_id: string
          height: number | null
          id: string
          model_slug: string
          prompt: string | null
          provider: string
          refunded: boolean
          resolution: string | null
          start_frame_url: string | null
          status: string
          updated_at: string
          user_id: string
          video_url: string | null
          width: number | null
          workspace_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          aspect_ratio?: string | null
          created_at?: string
          credits_charged?: number
          duration_seconds?: number | null
          end_frame_url?: string | null
          error?: string | null
          generation_id: string
          height?: number | null
          id?: string
          model_slug: string
          prompt?: string | null
          provider?: string
          refunded?: boolean
          resolution?: string | null
          start_frame_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
          width?: number | null
          workspace_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          aspect_ratio?: string | null
          created_at?: string
          credits_charged?: number
          duration_seconds?: number | null
          end_frame_url?: string | null
          error?: string | null
          generation_id?: string
          height?: number | null
          id?: string
          model_slug?: string
          prompt?: string | null
          provider?: string
          refunded?: boolean
          resolution?: string | null
          start_frame_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
          width?: number | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      pipedream_accounts: {
        Row: {
          account_id: string
          account_name: string | null
          app_slug: string
          created_at: string
          external_user_id: string
          healthy: boolean | null
          id: string
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          account_name?: string | null
          app_slug: string
          created_at?: string
          external_user_id: string
          healthy?: boolean | null
          id?: string
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          account_name?: string | null
          app_slug?: string
          created_at?: string
          external_user_id?: string
          healthy?: boolean | null
          id?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pipedream_tool_settings: {
        Row: {
          app_slug: string
          created_at: string
          enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_slug: string
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_slug?: string
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pptx_jobs: {
        Row: {
          created_at: string
          doc_type: string
          error: string | null
          file_name: string | null
          file_url: string | null
          id: string
          logs: Json | null
          prompt: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          doc_type?: string
          error?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          logs?: Json | null
          prompt: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          error?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          logs?: Json | null
          prompt?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      premium_usage: {
        Row: {
          id: string
          template_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          template_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          template_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      processed_orders: {
        Row: {
          created_at: string
          credits: number
          id: string
          plan: string | null
          polar_order_id: string
          product_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credits: number
          id?: string
          plan?: string | null
          polar_order_id: string
          product_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          plan?: string | null
          polar_order_id?: string
          product_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_workspace_id: string | null
          age_gate_acked_at: string | null
          agents_onboarding_seen: boolean
          avatar_url: string | null
          chat_greeted: boolean
          created_at: string
          credits: number
          display_name: string | null
          id: string
          image_free_uses: number
          plan: string
          two_factor_enabled: boolean
          updated_at: string
        }
        Insert: {
          active_workspace_id?: string | null
          age_gate_acked_at?: string | null
          agents_onboarding_seen?: boolean
          avatar_url?: string | null
          chat_greeted?: boolean
          created_at?: string
          credits?: number
          display_name?: string | null
          id: string
          image_free_uses?: number
          plan?: string
          two_factor_enabled?: boolean
          updated_at?: string
        }
        Update: {
          active_workspace_id?: string | null
          age_gate_acked_at?: string | null
          agents_onboarding_seen?: boolean
          avatar_url?: string | null
          chat_greeted?: boolean
          created_at?: string
          credits?: number
          display_name?: string | null
          id?: string
          image_free_uses?: number
          plan?: string
          two_factor_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      project_custom_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          project_id: string
          updated_at: string
          user_id: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
          verification_status?: string
        }
        Relationships: []
      }
      project_drafts: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_versions: {
        Row: {
          created_at: string
          id: string
          message: string | null
          project_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          project_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          project_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      project_visits: {
        Row: {
          country: string | null
          created_at: string
          device: string | null
          id: string
          path: string
          project_id: string
          referrer: string | null
          ua_hash: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          path?: string
          project_id: string
          referrer?: string | null
          ua_hash?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          path?: string
          project_id?: string
          referrer?: string | null
          ua_hash?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          custom_domain: string | null
          description: string | null
          files_snapshot: Json | null
          github_repo: string | null
          id: string
          instructions: string | null
          linked_supabase_project_name: string | null
          linked_supabase_project_ref: string | null
          linked_supabase_url: string | null
          model_tier: string | null
          name: string
          preview_url: string | null
          publish_settings: Json
          published_url: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          v0_chat_id: string | null
          v0_latest_version_id: string | null
          v0_project_id: string | null
          visibility: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          files_snapshot?: Json | null
          github_repo?: string | null
          id?: string
          instructions?: string | null
          linked_supabase_project_name?: string | null
          linked_supabase_project_ref?: string | null
          linked_supabase_url?: string | null
          model_tier?: string | null
          name?: string
          preview_url?: string | null
          publish_settings?: Json
          published_url?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          v0_chat_id?: string | null
          v0_latest_version_id?: string | null
          v0_project_id?: string | null
          visibility?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          files_snapshot?: Json | null
          github_repo?: string | null
          id?: string
          instructions?: string | null
          linked_supabase_project_name?: string | null
          linked_supabase_project_ref?: string | null
          linked_supabase_url?: string | null
          model_tier?: string | null
          name?: string
          preview_url?: string | null
          publish_settings?: Json
          published_url?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          v0_chat_id?: string | null
          v0_latest_version_id?: string | null
          v0_project_id?: string | null
          visibility?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      promo_deadlines: {
        Row: {
          created_at: string
          deadline_at: string
          id: string
          promo_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline_at: string
          id?: string
          promo_key?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline_at?: string
          id?: string
          promo_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_api_keys: {
        Row: {
          api_key: string
          cooldown_until: string | null
          created_at: string
          failure_count: number | null
          id: string
          label: string | null
          last_error: string | null
          last_used_at: string | null
          notes: string | null
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          api_key: string
          cooldown_until?: string | null
          created_at?: string
          failure_count?: number | null
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          notes?: string | null
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          cooldown_until?: string | null
          created_at?: string
          failure_count?: number | null
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          notes?: string | null
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_circuit_state: {
        Row: {
          failure_count: number
          id: string
          last_error: string | null
          opened_at: string | null
          reopens_at: string | null
          scope: string
          scope_id: string
          state: string
          success_count: number
          updated_at: string
        }
        Insert: {
          failure_count?: number
          id?: string
          last_error?: string | null
          opened_at?: string | null
          reopens_at?: string | null
          scope: string
          scope_id: string
          state?: string
          success_count?: number
          updated_at?: string
        }
        Update: {
          failure_count?: number
          id?: string
          last_error?: string | null
          opened_at?: string | null
          reopens_at?: string | null
          scope?: string
          scope_id?: string
          state?: string
          success_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          blocked_until: string | null
          bucket: string
          count: number
          created_at: string
          hour_count: number
          hour_start: string
          id: string
          ip_hash: string | null
          updated_at: string
          user_id: string | null
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          bucket: string
          count?: number
          created_at?: string
          hour_count?: number
          hour_start?: string
          id?: string
          ip_hash?: string | null
          updated_at?: string
          user_id?: string | null
          window_start?: string
        }
        Update: {
          blocked_until?: string | null
          bucket?: string
          count?: number
          created_at?: string
          hour_count?: number
          hour_start?: string
          id?: string
          ip_hash?: string | null
          updated_at?: string
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      referral_clicks: {
        Row: {
          code: string
          converted_at: string | null
          converted_user_id: string | null
          country: string | null
          created_at: string
          id: string
          ip_hash: string | null
          landing_path: string | null
          referer: string | null
          referrer_user_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          code: string
          converted_at?: string | null
          converted_user_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          landing_path?: string | null
          referer?: string | null
          referrer_user_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          code?: string
          converted_at?: string | null
          converted_user_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          landing_path?: string | null
          referer?: string | null
          referrer_user_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          referral_mode: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referral_mode?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referral_mode?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          amount: number
          available_at: string
          commission_pct: number | null
          created_at: string
          id: string
          net_revenue_cents: number | null
          period_start: string | null
          referred_id: string
          referrer_id: string
          source_action: string
          subscription_id: string | null
        }
        Insert: {
          amount?: number
          available_at?: string
          commission_pct?: number | null
          created_at?: string
          id?: string
          net_revenue_cents?: number | null
          period_start?: string | null
          referred_id: string
          referrer_id: string
          source_action: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          available_at?: string
          commission_pct?: number | null
          created_at?: string
          id?: string
          net_revenue_cents?: number | null
          period_start?: string | null
          referred_id?: string
          referrer_id?: string
          source_action?: string
          subscription_id?: string | null
        }
        Relationships: []
      }
      referral_milestone_grants: {
        Row: {
          expires_at: string
          granted_at: string
          id: string
          milestone: number
          plan: string
          user_id: string
        }
        Insert: {
          expires_at: string
          granted_at?: string
          id?: string
          milestone?: number
          plan?: string
          user_id: string
        }
        Update: {
          expires_at?: string
          granted_at?: string
          id?: string
          milestone?: number
          plan?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_tiers: {
        Row: {
          created_at: string
          id: string
          min_active_refs: number
          min_net_mrr_cents: number
          name: string
          rate_pct: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          id: string
          min_active_refs?: number
          min_net_mrr_cents?: number
          name: string
          rate_pct: number
          sort_order: number
        }
        Update: {
          created_at?: string
          id?: string
          min_active_refs?: number
          min_net_mrr_cents?: number
          name?: string
          rate_pct?: number
          sort_order?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          fingerprint_hash: string | null
          id: string
          ip_hash: string | null
          referral_code: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_hash?: string | null
          referral_code: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_hash?: string | null
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      research_jobs: {
        Row: {
          approved_at: string | null
          attempt: number
          awaiting_approval: boolean
          checkpoint: Json
          context_excerpts: Json | null
          conversation_id: string | null
          created_at: string
          depth: string
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          images: Json
          language: string | null
          last_heartbeat_at: string | null
          max_attempts: number
          needs_images: boolean
          next_run_at: string | null
          outline: Json | null
          plan: Json
          plan_goal: string | null
          plan_intro: string | null
          plan_ready: string | null
          progress: number
          provider_errors: Json
          query: string
          report: string | null
          report_sections: Json | null
          resumable: boolean
          sources: Json
          stage: string | null
          started_at: string | null
          status: string
          steps: Json
          thinking: string | null
          unused_sources: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          attempt?: number
          awaiting_approval?: boolean
          checkpoint?: Json
          context_excerpts?: Json | null
          conversation_id?: string | null
          created_at?: string
          depth?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          images?: Json
          language?: string | null
          last_heartbeat_at?: string | null
          max_attempts?: number
          needs_images?: boolean
          next_run_at?: string | null
          outline?: Json | null
          plan?: Json
          plan_goal?: string | null
          plan_intro?: string | null
          plan_ready?: string | null
          progress?: number
          provider_errors?: Json
          query: string
          report?: string | null
          report_sections?: Json | null
          resumable?: boolean
          sources?: Json
          stage?: string | null
          started_at?: string | null
          status?: string
          steps?: Json
          thinking?: string | null
          unused_sources?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          attempt?: number
          awaiting_approval?: boolean
          checkpoint?: Json
          context_excerpts?: Json | null
          conversation_id?: string | null
          created_at?: string
          depth?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          images?: Json
          language?: string | null
          last_heartbeat_at?: string | null
          max_attempts?: number
          needs_images?: boolean
          next_run_at?: string | null
          outline?: Json | null
          plan?: Json
          plan_goal?: string | null
          plan_intro?: string | null
          plan_ready?: string | null
          progress?: number
          provider_errors?: Json
          query?: string
          report?: string | null
          report_sections?: Json | null
          resumable?: boolean
          sources?: Json
          stage?: string | null
          started_at?: string | null
          status?: string
          steps?: Json
          thinking?: string | null
          unused_sources?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      research_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: []
      }
      research_reports: {
        Row: {
          created_at: string
          id: string
          images: Json
          plan: Json
          query: string
          report: string
          session_key: string
          share_token: string | null
          steps: Json
          thinking: string | null
          unused_sources: Json
          updated_at: string
          used_sources: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          images?: Json
          plan?: Json
          query: string
          report?: string
          session_key: string
          share_token?: string | null
          steps?: Json
          thinking?: string | null
          unused_sources?: Json
          updated_at?: string
          used_sources?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          images?: Json
          plan?: Json
          query?: string
          report?: string
          session_key?: string
          share_token?: string | null
          steps?: Json
          thinking?: string | null
          unused_sources?: Json
          updated_at?: string
          used_sources?: Json
          user_id?: string
        }
        Relationships: []
      }
      research_sessions: {
        Row: {
          created_at: string
          depth: string
          id: string
          plan: Json | null
          query: string
          report: string | null
          sources_count: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          depth?: string
          id?: string
          plan?: Json | null
          query: string
          report?: string | null
          sources_count?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          depth?: string
          id?: string
          plan?: Json | null
          query?: string
          report?: string | null
          sources_count?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      research_sources: {
        Row: {
          created_at: string
          id: string
          reliability: string | null
          session_id: string
          snippet: string | null
          source_type: string
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reliability?: string | null
          session_id: string
          snippet?: string | null
          source_type?: string
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reliability?: string | null
          session_id?: string
          snippet?: string | null
          source_type?: string
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      revenue_ledger: {
        Row: {
          created_at: string
          currency: string
          gross_amount: number
          id: string
          metadata: Json | null
          net_amount: number
          source: string | null
          subscription_id: string | null
          tax_amount: number
          tax_rate: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          gross_amount: number
          id?: string
          metadata?: Json | null
          net_amount: number
          source?: string | null
          subscription_id?: string | null
          tax_amount: number
          tax_rate?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          metadata?: Json | null
          net_amount?: number
          source?: string | null
          subscription_id?: string | null
          tax_amount?: number
          tax_rate?: number
          user_id?: string | null
        }
        Relationships: []
      }
      reward_tasks: {
        Row: {
          action_type: string
          action_url: string | null
          active: boolean
          created_at: string
          description: string | null
          icon: string | null
          id: string
          reward_credits: number
          sort_order: number
          target_count: number
          task_key: string
          title: string
          updated_at: string
        }
        Insert: {
          action_type: string
          action_url?: string | null
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          reward_credits?: number
          sort_order?: number
          target_count?: number
          task_key: string
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          action_url?: string | null
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          reward_credits?: number
          sort_order?: number
          target_count?: number
          task_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rp_portal_settings: {
        Row: {
          created_at: string
          id: string
          notify_on_earning: boolean | null
          notify_on_signup: boolean | null
          payment_details: string | null
          payment_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_on_earning?: boolean | null
          notify_on_signup?: boolean | null
          payment_details?: string | null
          payment_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_on_earning?: boolean | null
          notify_on_signup?: boolean | null
          payment_details?: string | null
          payment_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      runbase_keys: {
        Row: {
          api_key: string
          balance_usd: number
          blocked_reason: string | null
          created_at: string
          failure_count: number
          id: string
          label: string | null
          last_error: string | null
          last_used_at: string | null
          spent_usd: number
          status: string
          updated_at: string
        }
        Insert: {
          api_key: string
          balance_usd?: number
          blocked_reason?: string | null
          created_at?: string
          failure_count?: number
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          spent_usd?: number
          status?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          balance_usd?: number
          blocked_reason?: string | null
          created_at?: string
          failure_count?: number
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          spent_usd?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_user_messages: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          next_run_at: string | null
          prompt: string
          schedule_cron: string
          timezone: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          prompt: string
          schedule_cron?: string
          timezone?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          prompt?: string
          schedule_cron?: string
          timezone?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          actor_user_id: string | null
          created_at: string
          details: Json
          event_type: string
          function_name: string | null
          id: string
          ip_hash: string | null
          provider: string | null
          severity: string
          target_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          function_name?: string | null
          id?: string
          ip_hash?: string | null
          provider?: string | null
          severity?: string
          target_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          function_name?: string | null
          id?: string
          ip_hash?: string | null
          provider?: string | null
          severity?: string
          target_id?: string | null
        }
        Relationships: []
      }
      security_findings: {
        Row: {
          created_at: string
          description: string
          details: string
          fix_prompt: string
          id: string
          ignored_reason: string | null
          internal_id: string
          learn_more_url: string | null
          level: string
          project_id: string
          scan_id: string
          scanner_name: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          details?: string
          fix_prompt?: string
          id?: string
          ignored_reason?: string | null
          internal_id: string
          learn_more_url?: string | null
          level: string
          project_id: string
          scan_id: string
          scanner_name: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          details?: string
          fix_prompt?: string
          id?: string
          ignored_reason?: string | null
          internal_id?: string
          learn_more_url?: string | null
          level?: string
          project_id?: string
          scan_id?: string
          scanner_name?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      security_memory: {
        Row: {
          content: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_scans: {
        Row: {
          completed_at: string | null
          created_at: string
          error_count: number
          id: string
          info_count: number
          project_id: string
          started_at: string
          status: string
          summary: Json
          user_id: string
          warning_count: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_count?: number
          id?: string
          info_count?: number
          project_id: string
          started_at?: string
          status?: string
          summary?: Json
          user_id: string
          warning_count?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_count?: number
          id?: string
          info_count?: number
          project_id?: string
          started_at?: string
          status?: string
          summary?: Json
          user_id?: string
          warning_count?: number
        }
        Relationships: []
      }
      service_incidents: {
        Row: {
          created_at: string
          id: string
          message: string | null
          resolved_at: string | null
          service_name: string
          started_at: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          resolved_at?: string | null
          service_name: string
          started_at?: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          resolved_at?: string | null
          service_name?: string
          started_at?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      service_keys: {
        Row: {
          banned_at: string | null
          created_at: string
          fail_count: number
          id: string
          key_cipher: string
          key_hint: string | null
          key_iv: string
          label: string | null
          last_error: string | null
          last_used_at: string | null
          provider: string
          status: string
          success_count: number
          updated_at: string
        }
        Insert: {
          banned_at?: string | null
          created_at?: string
          fail_count?: number
          id?: string
          key_cipher: string
          key_hint?: string | null
          key_iv: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          provider: string
          status?: string
          success_count?: number
          updated_at?: string
        }
        Update: {
          banned_at?: string | null
          created_at?: string
          fail_count?: number
          id?: string
          key_cipher?: string
          key_hint?: string | null
          key_iv?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          provider?: string
          status?: string
          success_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_status: {
        Row: {
          checked_at: string
          error_message: string | null
          id: string
          response_time_ms: number | null
          service_name: string
          service_url: string
          status: string
        }
        Insert: {
          checked_at?: string
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          service_name: string
          service_url: string
          status?: string
        }
        Update: {
          checked_at?: string
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          service_name?: string
          service_url?: string
          status?: string
        }
        Relationships: []
      }
      service_status_public: {
        Row: {
          checked_at: string | null
          response_time_ms: number | null
          service_name: string | null
          status: string | null
        }
        Insert: {
          checked_at?: string | null
          response_time_ms?: number | null
          service_name?: string | null
          status?: string | null
        }
        Update: {
          checked_at?: string | null
          response_time_ms?: number | null
          service_name?: string | null
          status?: string | null
        }
        Relationships: []
      }
      shopping_product_reports: {
        Row: {
          ai_report: string
          created_at: string
          currency: string
          id: string
          product_data: Json
          product_key: string
          user_id: string
        }
        Insert: {
          ai_report?: string
          created_at?: string
          currency?: string
          id?: string
          product_data?: Json
          product_key: string
          user_id: string
        }
        Update: {
          ai_report?: string
          created_at?: string
          currency?: string
          id?: string
          product_data?: Json
          product_key?: string
          user_id?: string
        }
        Relationships: []
      }
      showcase_items: {
        Row: {
          aspect_ratio: string
          category: string | null
          created_at: string
          display_order: number
          duration: string | null
          id: string
          is_trending: boolean
          kind: string
          media_type: string
          media_url: string
          model_id: string
          model_name: string
          prompt: string
          quality: string
          source: string | null
          style: string | null
          thumbnail_url: string | null
          trending_at: string | null
        }
        Insert: {
          aspect_ratio?: string
          category?: string | null
          created_at?: string
          display_order?: number
          duration?: string | null
          id?: string
          is_trending?: boolean
          kind?: string
          media_type?: string
          media_url: string
          model_id?: string
          model_name?: string
          prompt?: string
          quality?: string
          source?: string | null
          style?: string | null
          thumbnail_url?: string | null
          trending_at?: string | null
        }
        Update: {
          aspect_ratio?: string
          category?: string | null
          created_at?: string
          display_order?: number
          duration?: string | null
          id?: string
          is_trending?: boolean
          kind?: string
          media_type?: string
          media_url?: string
          model_id?: string
          model_name?: string
          prompt?: string
          quality?: string
          source?: string | null
          style?: string | null
          thumbnail_url?: string | null
          trending_at?: string | null
        }
        Relationships: []
      }
      skill_files: {
        Row: {
          created_at: string
          id: string
          mime_type: string
          path: string
          size_bytes: number
          skill_id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string
          path: string
          size_bytes?: number
          skill_id: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string
          path?: string
          size_bytes?: number
          skill_id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          body: string
          created_at: string
          description: string
          embedding: string | null
          enabled_tools: string[]
          icon: string | null
          id: string
          instructions: string
          is_active: boolean
          is_enabled: boolean
          name: string
          preferred_model: string | null
          triggers: string[]
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          description?: string
          embedding?: string | null
          enabled_tools?: string[]
          icon?: string | null
          id?: string
          instructions?: string
          is_active?: boolean
          is_enabled?: boolean
          name: string
          preferred_model?: string | null
          triggers?: string[]
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          description?: string
          embedding?: string | null
          enabled_tools?: string[]
          icon?: string | null
          id?: string
          instructions?: string
          is_active?: boolean
          is_enabled?: boolean
          name?: string
          preferred_model?: string | null
          triggers?: string[]
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      slide_projects: {
        Row: {
          created_at: string
          id: string
          pptx_url: string | null
          slide_count: number
          slides_data: Json | null
          status: string
          style: string
          template_id: string | null
          title: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pptx_url?: string | null
          slide_count?: number
          slides_data?: Json | null
          status?: string
          style?: string
          template_id?: string | null
          title?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pptx_url?: string | null
          slide_count?: number
          slides_data?: Json | null
          status?: string
          style?: string
          template_id?: string | null
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      slide_templates: {
        Row: {
          component_name: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string | null
          template_engine: string
          template_id: string
        }
        Insert: {
          component_name?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string | null
          template_engine?: string
          template_id: string
        }
        Update: {
          component_name?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string | null
          template_engine?: string
          template_id?: string
        }
        Relationships: []
      }
      spreadsheet_projects: {
        Row: {
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          sheet_data: Json | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          sheet_data?: Json | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          sheet_data?: Json | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      status_subscribers: {
        Row: {
          channel: string
          contact: string
          created_at: string
          id: string
        }
        Insert: {
          channel?: string
          contact: string
          created_at?: string
          id?: string
        }
        Update: {
          channel?: string
          contact?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      student_exams: {
        Row: {
          answers: Json
          created_at: string
          difficulty: string
          duration_seconds: number
          id: string
          questions: Json
          score: number
          subject: string
          topic: string | null
          total_questions: number
          user_id: string
          weak_areas: Json
        }
        Insert: {
          answers?: Json
          created_at?: string
          difficulty?: string
          duration_seconds?: number
          id?: string
          questions?: Json
          score?: number
          subject: string
          topic?: string | null
          total_questions?: number
          user_id: string
          weak_areas?: Json
        }
        Update: {
          answers?: Json
          created_at?: string
          difficulty?: string
          duration_seconds?: number
          id?: string
          questions?: Json
          score?: number
          subject?: string
          topic?: string | null
          total_questions?: number
          user_id?: string
          weak_areas?: Json
        }
        Relationships: []
      }
      student_mistakes: {
        Row: {
          concept: string
          created_at: string
          id: string
          mistake_count: number
          mistake_type: string
          next_review_at: string
          resolved: boolean
          review_stage: number
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concept: string
          created_at?: string
          id?: string
          mistake_count?: number
          mistake_type?: string
          next_review_at?: string
          resolved?: boolean
          review_stage?: number
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concept?: string
          created_at?: string
          id?: string
          mistake_count?: number
          mistake_type?: string
          next_review_at?: string
          resolved?: boolean
          review_stage?: number
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          age: number | null
          country: string | null
          created_at: string
          id: string
          learning_style: string | null
          native_language: string | null
          preferred_study_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          country?: string | null
          created_at?: string
          id?: string
          learning_style?: string | null
          native_language?: string | null
          preferred_study_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          country?: string | null
          created_at?: string
          id?: string
          learning_style?: string | null
          native_language?: string | null
          preferred_study_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_topics: {
        Row: {
          created_at: string
          curriculum_map: Json
          id: string
          last_position: string | null
          last_studied_at: string | null
          level: string
          progress: number
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          curriculum_map?: Json
          id?: string
          last_position?: string | null
          last_studied_at?: string | null
          level?: string
          progress?: number
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          curriculum_map?: Json
          id?: string
          last_position?: string | null
          last_studied_at?: string | null
          level?: string
          progress?: number
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          exam_date: string | null
          hours_per_day: number
          id: string
          is_active: boolean
          level: string
          plan_content: string
          subjects: string
          tasks: Json
          updated_at: string
          user_id: string
          weak_areas: string | null
        }
        Insert: {
          created_at?: string
          exam_date?: string | null
          hours_per_day?: number
          id?: string
          is_active?: boolean
          level?: string
          plan_content?: string
          subjects: string
          tasks?: Json
          updated_at?: string
          user_id: string
          weak_areas?: string | null
        }
        Update: {
          created_at?: string
          exam_date?: string | null
          hours_per_day?: number
          id?: string
          is_active?: boolean
          level?: string
          plan_content?: string
          subjects?: string
          tasks?: Json
          updated_at?: string
          user_id?: string
          weak_areas?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          id: string
          plan: string
          polar_customer_id: string | null
          polar_product_id: string | null
          polar_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string
          polar_customer_id?: string | null
          polar_product_id?: string | null
          polar_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string
          polar_customer_id?: string | null
          polar_product_id?: string | null
          polar_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supabase_oauth_states: {
        Row: {
          code_verifier: string | null
          created_at: string
          redirect_to: string | null
          state: string
          user_id: string
        }
        Insert: {
          code_verifier?: string | null
          created_at?: string
          redirect_to?: string | null
          state: string
          user_id: string
        }
        Update: {
          code_verifier?: string | null
          created_at?: string
          redirect_to?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      system_skills: {
        Row: {
          body: string
          created_at: string
          description: string
          display_order: number
          embedding: string | null
          enabled_tools: string[]
          icon: string | null
          id: string
          instructions: string
          is_active: boolean
          name: string
          preferred_model: string | null
          triggers: string[]
        }
        Insert: {
          body?: string
          created_at?: string
          description?: string
          display_order?: number
          embedding?: string | null
          enabled_tools?: string[]
          icon?: string | null
          id?: string
          instructions?: string
          is_active?: boolean
          name: string
          preferred_model?: string | null
          triggers?: string[]
        }
        Update: {
          body?: string
          created_at?: string
          description?: string
          display_order?: number
          embedding?: string | null
          enabled_tools?: string[]
          icon?: string | null
          id?: string
          instructions?: string
          is_active?: boolean
          name?: string
          preferred_model?: string | null
          triggers?: string[]
        }
        Relationships: []
      }
      telegram_media: {
        Row: {
          cached_until: string | null
          cached_url: string | null
          created_at: string
          duration: number | null
          fallback_path: string | null
          file_id: string
          file_unique_id: string | null
          height: number | null
          id: string
          kind: string | null
          metadata: Json | null
          mime_type: string | null
          original_filename: string | null
          size_bytes: number | null
          storage_provider: string
          thumbnail_file_id: string | null
          updated_at: string
          user_id: string | null
          width: number | null
        }
        Insert: {
          cached_until?: string | null
          cached_url?: string | null
          created_at?: string
          duration?: number | null
          fallback_path?: string | null
          file_id: string
          file_unique_id?: string | null
          height?: number | null
          id?: string
          kind?: string | null
          metadata?: Json | null
          mime_type?: string | null
          original_filename?: string | null
          size_bytes?: number | null
          storage_provider?: string
          thumbnail_file_id?: string | null
          updated_at?: string
          user_id?: string | null
          width?: number | null
        }
        Update: {
          cached_until?: string | null
          cached_url?: string | null
          created_at?: string
          duration?: number | null
          fallback_path?: string | null
          file_id?: string
          file_unique_id?: string | null
          height?: number | null
          id?: string
          kind?: string | null
          metadata?: Json | null
          mime_type?: string | null
          original_filename?: string | null
          size_bytes?: number | null
          storage_provider?: string
          thumbnail_file_id?: string | null
          updated_at?: string
          user_id?: string | null
          width?: number | null
        }
        Relationships: []
      }
      template_images: {
        Row: {
          created_at: string
          image_url: string
          source: string
          template_id: string
          updated_at: string
          uploaded_by_chat_id: number | null
        }
        Insert: {
          created_at?: string
          image_url: string
          source?: string
          template_id: string
          updated_at?: string
          uploaded_by_chat_id?: number | null
        }
        Update: {
          created_at?: string
          image_url?: string
          source?: string
          template_id?: string
          updated_at?: string
          uploaded_by_chat_id?: number | null
        }
        Relationships: []
      }
      tool_landing_images: {
        Row: {
          description: string | null
          image_url: string | null
          tool_id: string
          updated_at: string | null
        }
        Insert: {
          description?: string | null
          image_url?: string | null
          tool_id: string
          updated_at?: string | null
        }
        Update: {
          description?: string | null
          image_url?: string | null
          tool_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tool_templates: {
        Row: {
          created_at: string | null
          display_order: number | null
          gender: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_url: string | null
          prompt: string | null
          tool_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_url?: string | null
          prompt?: string | null
          tool_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_url?: string | null
          prompt?: string | null
          tool_id?: string
        }
        Relationships: []
      }
      tts_voices: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          preview_audio_url: string
          voice_id: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_audio_url: string
          voice_id?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_audio_url?: string
          voice_id?: string | null
        }
        Relationships: []
      }
      user_api_apps: {
        Row: {
          app_id: string
          created_at: string
          display_name: string | null
          enabled: boolean | null
          id: string
          key_hint: string | null
          key_value: string | null
          logo_url: string | null
          spec: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          app_id: string
          created_at?: string
          display_name?: string | null
          enabled?: boolean | null
          id?: string
          key_hint?: string | null
          key_value?: string | null
          logo_url?: string | null
          spec?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string
          display_name?: string | null
          enabled?: boolean | null
          id?: string
          key_hint?: string | null
          key_value?: string | null
          logo_url?: string | null
          spec?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_assets: {
        Row: {
          created_at: string
          height: number | null
          id: string
          kind: string
          mime_type: string | null
          original_filename: string | null
          public_url: string
          size_bytes: number | null
          storage_key: string
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          original_filename?: string | null
          public_url: string
          size_bytes?: number | null
          storage_key: string
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          original_filename?: string | null
          public_url?: string
          size_bytes?: number | null
          storage_key?: string
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      user_chat_settings: {
        Row: {
          created_at: string
          custom_instructions: string | null
          enable_citations: boolean
          enable_followups: boolean
          enable_pii_redaction: boolean
          enable_semantic_cache: boolean
          learning_mode_default: boolean
          persona: string
          preferred_dialect: string | null
          preferred_language: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          custom_instructions?: string | null
          enable_citations?: boolean
          enable_followups?: boolean
          enable_pii_redaction?: boolean
          enable_semantic_cache?: boolean
          learning_mode_default?: boolean
          persona?: string
          preferred_dialect?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          custom_instructions?: string | null
          enable_citations?: boolean
          enable_followups?: boolean
          enable_pii_redaction?: boolean
          enable_semantic_cache?: boolean
          learning_mode_default?: boolean
          persona?: string
          preferred_dialect?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      user_connector_state: {
        Row: {
          connector_id: string
          enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          connector_id: string
          enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          connector_id?: string
          enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_drafts: {
        Row: {
          created_at: string
          draft_key: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_key: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_key?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_gallery: {
        Row: {
          created_at: string
          id: string
          image_url: string
          source_type: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          source_type?: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          source_type?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_github_connections: {
        Row: {
          access_token: string
          avatar_url: string | null
          created_at: string
          github_id: number | null
          github_login: string | null
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          avatar_url?: string | null
          created_at?: string
          github_id?: number | null
          github_login?: string | null
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          avatar_url?: string | null
          created_at?: string
          github_id?: number | null
          github_login?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          created_at: string
          email_address: string | null
          email_enabled: boolean
          telegram_chat_id: string | null
          telegram_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean
          telegram_chat_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean
          telegram_chat_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_knowledge: {
        Row: {
          content: string
          created_at: string
          enabled: boolean | null
          id: string
          name: string | null
          updated_at: string
          use_when: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          enabled?: boolean | null
          id?: string
          name?: string | null
          updated_at?: string
          use_when: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          enabled?: boolean | null
          id?: string
          name?: string | null
          updated_at?: string
          use_when?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_knowledge_graph: {
        Row: {
          confidence: number
          created_at: string
          entity: string
          entity_type: string
          id: string
          metadata: Json
          relation: string | null
          source_message_id: string | null
          target_entity: string | null
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          entity: string
          entity_type: string
          id?: string
          metadata?: Json
          relation?: string | null
          source_message_id?: string | null
          target_entity?: string | null
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          entity?: string
          entity_type?: string
          id?: string
          metadata?: Json
          relation?: string | null
          source_message_id?: string | null
          target_entity?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_memory_entries: {
        Row: {
          created_at: string
          embedding: string | null
          id: string
          scope: string | null
          slot_key: string | null
          slot_type: string | null
          slot_value: Json | null
          summary: string | null
          title: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          id?: string
          scope?: string | null
          slot_key?: string | null
          slot_type?: string | null
          slot_value?: Json | null
          summary?: string | null
          title?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          embedding?: string | null
          id?: string
          scope?: string | null
          slot_key?: string | null
          slot_type?: string | null
          slot_value?: Json | null
          summary?: string | null
          title?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      user_memory_profiles: {
        Row: {
          account_summary: string | null
          created_at: string
          id: string
          preferences: Json
          profile_snapshot: Json
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          account_summary?: string | null
          created_at?: string
          id?: string
          preferences?: Json
          profile_snapshot?: Json
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          account_summary?: string | null
          created_at?: string
          id?: string
          preferences?: Json
          profile_snapshot?: Json
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      user_music_tracks: {
        Row: {
          created_at: string
          id: string
          name: string
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          size_bytes?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      user_payment_methods: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          instructions: string
          label: string
          method_type: string
          status: string
          telegram_message_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          instructions: string
          label: string
          method_type?: string
          status?: string
          telegram_message_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          instructions?: string
          label?: string
          method_type?: string
          status?: string
          telegram_message_id?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_personas: {
        Row: {
          avatar_emoji: string | null
          created_at: string
          description: string | null
          id: string
          is_favorite: boolean
          last_used_at: string | null
          name: string
          sort_order: number
          system_prompt: string
          tags: string[] | null
          temperature: number | null
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          avatar_emoji?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          last_used_at?: string | null
          name: string
          sort_order?: number
          system_prompt: string
          tags?: string[] | null
          temperature?: number | null
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          avatar_emoji?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          last_used_at?: string | null
          name?: string
          sort_order?: number
          system_prompt?: string
          tags?: string[] | null
          temperature?: number | null
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          active_workspace_id: string | null
          ai_personalization: Json
          created_at: string
          customization: Json
          language: string | null
          memory: Json
          notification_settings: Json
          page_settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          active_workspace_id?: string | null
          ai_personalization?: Json
          created_at?: string
          customization?: Json
          language?: string | null
          memory?: Json
          notification_settings?: Json
          page_settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          active_workspace_id?: string | null
          ai_personalization?: Json
          created_at?: string
          customization?: Json
          language?: string | null
          memory?: Json
          notification_settings?: Json
          page_settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reward_tasks: {
        Row: {
          awarded_credits: number
          completed_at: string | null
          created_at: string
          id: string
          progress: number
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          awarded_credits?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          awarded_credits?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_supabase_connections: {
        Row: {
          access_token: string
          account_email: string | null
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          account_email?: string | null
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          account_email?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      v_referral_tier_progress: {
        Row: {
          active_refs: number | null
          current_rate_pct: number | null
          current_tier_id: string | null
          current_tier_name: string | null
          net_mrr_cents: number | null
          next_min_active_refs: number | null
          next_min_net_mrr_cents: number | null
          next_rate_pct: number | null
          next_tier_id: string | null
          next_tier_name: string | null
          user_id: string | null
        }
        Insert: {
          active_refs?: number | null
          current_rate_pct?: number | null
          current_tier_id?: string | null
          current_tier_name?: string | null
          net_mrr_cents?: number | null
          next_min_active_refs?: number | null
          next_min_net_mrr_cents?: number | null
          next_rate_pct?: number | null
          next_tier_id?: string | null
          next_tier_name?: string | null
          user_id?: string | null
        }
        Update: {
          active_refs?: number | null
          current_rate_pct?: number | null
          current_tier_id?: string | null
          current_tier_name?: string | null
          net_mrr_cents?: number | null
          next_min_active_refs?: number | null
          next_min_net_mrr_cents?: number | null
          next_rate_pct?: number | null
          next_tier_id?: string | null
          next_tier_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v0_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          is_blocked: boolean
          last_error: string | null
          last_used_at: string | null
          message_limit: number
          messages_used: number
          name: string
          window_started_at: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_blocked?: boolean
          last_error?: string | null
          last_used_at?: string | null
          message_limit?: number
          messages_used?: number
          name: string
          window_started_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_blocked?: boolean
          last_error?: string | null
          last_used_at?: string | null
          message_limit?: number
          messages_used?: number
          name?: string
          window_started_at?: string
        }
        Relationships: []
      }
      video_models: {
        Row: {
          api_version: string
          billing_mode: string
          cost_per_second_usd: number | null
          cost_per_video_usd: number | null
          created_at: string
          credits_per_second: number | null
          credits_per_video: number | null
          default_aspect: string
          default_duration: number
          default_resolution: string
          description: string | null
          display_name: string
          endpoint_image_to_video: string | null
          endpoint_reference_to_video: string | null
          endpoint_start_end_frame: string | null
          endpoint_text_to_video: string | null
          free_trial_count: number
          id: string
          is_active: boolean
          is_featured: boolean
          is_new: boolean
          is_premium: boolean
          max_input_images: number
          model_id_api: string | null
          provider: string
          provider_pool: string | null
          slug: string
          sort_order: number
          supported_aspects: Json
          supported_durations: Json
          supported_resolutions: Json
          supports_audio: boolean
          supports_camera_control: boolean
          supports_first_frame: boolean
          supports_last_frame: boolean
          supports_lipsync: boolean
          supports_multi_image: boolean
          supports_multi_shot: boolean
          supports_start_end_frame: boolean
          supports_video_editing: boolean
          supports_voice_clone: boolean
          thumbnail_url: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          api_version?: string
          billing_mode?: string
          cost_per_second_usd?: number | null
          cost_per_video_usd?: number | null
          created_at?: string
          credits_per_second?: number | null
          credits_per_video?: number | null
          default_aspect?: string
          default_duration?: number
          default_resolution?: string
          description?: string | null
          display_name: string
          endpoint_image_to_video?: string | null
          endpoint_reference_to_video?: string | null
          endpoint_start_end_frame?: string | null
          endpoint_text_to_video?: string | null
          free_trial_count?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_premium?: boolean
          max_input_images?: number
          model_id_api?: string | null
          provider: string
          provider_pool?: string | null
          slug: string
          sort_order?: number
          supported_aspects?: Json
          supported_durations?: Json
          supported_resolutions?: Json
          supports_audio?: boolean
          supports_camera_control?: boolean
          supports_first_frame?: boolean
          supports_last_frame?: boolean
          supports_lipsync?: boolean
          supports_multi_image?: boolean
          supports_multi_shot?: boolean
          supports_start_end_frame?: boolean
          supports_video_editing?: boolean
          supports_voice_clone?: boolean
          thumbnail_url?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          api_version?: string
          billing_mode?: string
          cost_per_second_usd?: number | null
          cost_per_video_usd?: number | null
          created_at?: string
          credits_per_second?: number | null
          credits_per_video?: number | null
          default_aspect?: string
          default_duration?: number
          default_resolution?: string
          description?: string | null
          display_name?: string
          endpoint_image_to_video?: string | null
          endpoint_reference_to_video?: string | null
          endpoint_start_end_frame?: string | null
          endpoint_text_to_video?: string | null
          free_trial_count?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_premium?: boolean
          max_input_images?: number
          model_id_api?: string | null
          provider?: string
          provider_pool?: string | null
          slug?: string
          sort_order?: number
          supported_aspects?: Json
          supported_durations?: Json
          supported_resolutions?: Json
          supports_audio?: boolean
          supports_camera_control?: boolean
          supports_first_frame?: boolean
          supports_last_frame?: boolean
          supports_lipsync?: boolean
          supports_multi_image?: boolean
          supports_multi_shot?: boolean
          supports_start_end_frame?: boolean
          supports_video_editing?: boolean
          supports_voice_clone?: boolean
          thumbnail_url?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_quota_usage: {
        Row: {
          created_at: string
          id: string
          model: string | null
          period: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          period?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          period?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_templates: {
        Row: {
          audio_file_url: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          preview_image_url: string | null
        }
        Insert: {
          audio_file_url: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_image_url?: string | null
        }
        Update: {
          audio_file_url?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_image_url?: string | null
        }
        Relationships: []
      }
      wavespeed_keys: {
        Row: {
          api_key: string
          balance_usd: number
          created_at: string
          failure_count: number
          id: string
          label: string | null
          last_error: string | null
          last_used_at: string | null
          spent_usd: number
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          api_key: string
          balance_usd?: number
          created_at?: string
          failure_count?: number
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          spent_usd?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          api_key?: string
          balance_usd?: number
          created_at?: string
          failure_count?: number
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          spent_usd?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method: string
          payment_address: string | null
          payment_details: string
          payment_method_id: string | null
          processed_at: string | null
          status: string
          telegram_message_id: number | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          method?: string
          payment_address?: string | null
          payment_details?: string
          payment_method_id?: string | null
          processed_at?: string | null
          status?: string
          telegram_message_id?: number | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: string
          payment_address?: string | null
          payment_details?: string
          payment_method_id?: string | null
          processed_at?: string | null
          status?: string
          telegram_message_id?: number | null
          user_id?: string
        }
        Relationships: []
      }
      workspace_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_brand_kit: {
        Row: {
          accent_color: string | null
          body_font: string | null
          brand_description: string | null
          cover_url: string | null
          heading_font: string | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          tone_of_voice: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accent_color?: string | null
          body_font?: string | null
          brand_description?: string | null
          cover_url?: string | null
          heading_font?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tone_of_voice?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accent_color?: string | null
          body_font?: string | null
          brand_description?: string | null
          cover_url?: string | null
          heading_font?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tone_of_voice?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_credit_topups: {
        Row: {
          amount_credits: number
          amount_usd: number
          created_at: string
          id: string
          initiated_by: string
          invoice_number: string | null
          metadata: Json | null
          polar_order_id: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          amount_credits: number
          amount_usd: number
          created_at?: string
          id?: string
          initiated_by: string
          invoice_number?: string | null
          metadata?: Json | null
          polar_order_id?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          amount_credits?: number
          amount_usd?: number
          created_at?: string
          id?: string
          initiated_by?: string
          invoice_number?: string | null
          metadata?: Json | null
          polar_order_id?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_invites: {
        Row: {
          accepted_by: string | null
          created_at: string
          expires_at: string
          id: string
          invite_email: string
          invite_token: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          status: Database["public"]["Enums"]["workspace_invite_status"]
          workspace_id: string
        }
        Insert: {
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invite_email: string
          invite_token?: string
          invited_by: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["workspace_invite_status"]
          workspace_id: string
        }
        Update: {
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invite_email?: string
          invite_token?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["workspace_invite_status"]
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_join_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_member_status: {
        Row: {
          id: string
          suspended: boolean
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          suspended?: boolean
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          suspended?: boolean
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string
          monthly_limit: number | null
          monthly_period_start: string
          monthly_used: number
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          monthly_limit?: number | null
          monthly_period_start?: string
          monthly_used?: number
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          monthly_limit?: number | null
          monthly_period_start?: string
          monthly_used?: number
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_notification_prefs: {
        Row: {
          email: Json
          id: string
          in_app: Json
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          email?: Json
          id?: string
          in_app?: Json
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          email?: Json
          id?: string
          in_app?: Json
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_settings: {
        Row: {
          blocked_keywords: string[] | null
          content_policy: string
          default_language: string | null
          default_timezone: string | null
          require_join_approval: boolean
          sso_enabled: boolean
          sso_entity_id: string | null
          sso_metadata_url: string | null
          sso_provider: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          blocked_keywords?: string[] | null
          content_policy?: string
          default_language?: string | null
          default_timezone?: string | null
          require_join_approval?: boolean
          sso_enabled?: boolean
          sso_entity_id?: string | null
          sso_metadata_url?: string | null
          sso_provider?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          blocked_keywords?: string[] | null
          content_policy?: string
          default_language?: string | null
          default_timezone?: string | null
          require_join_approval?: boolean
          sso_enabled?: boolean
          sso_entity_id?: string | null
          sso_metadata_url?: string | null
          sso_provider?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_shared_resources: {
        Row: {
          created_at: string
          id: string
          resource_id: string
          resource_type: string
          shared_by: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          resource_id: string
          resource_type: string
          shared_by: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          resource_id?: string
          resource_type?: string
          shared_by?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          task_id?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      workspace_task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          parent_task_id: string | null
          position: number
          priority: Database["public"]["Enums"]["workspace_task_priority"]
          project_id: string | null
          status: Database["public"]["Enums"]["workspace_task_status"]
          tags: string[]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          parent_task_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["workspace_task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["workspace_task_status"]
          tags?: string[]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          parent_task_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["workspace_task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["workspace_task_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_usage: {
        Row: {
          action_type: string
          amount: number
          created_at: string
          description: string | null
          id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          action_type: string
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          action_type?: string
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          archived_at: string | null
          avatar_url: string | null
          created_at: string
          credits: number
          default_member_monthly_limit: number | null
          id: string
          name: string
          owner_id: string
          plan: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          avatar_url?: string | null
          created_at?: string
          credits?: number
          default_member_monthly_limit?: number | null
          id?: string
          name: string
          owner_id: string
          plan?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          avatar_url?: string | null
          created_at?: string
          credits?: number
          default_member_monthly_limit?: number | null
          id?: string
          name?: string
          owner_id?: string
          plan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      youtube_conversations: {
        Row: {
          channel_name: string | null
          created_at: string
          duration: string | null
          id: string
          thumbnail_url: string | null
          transcript: string | null
          updated_at: string
          user_id: string
          video_id: string
          video_title: string | null
          video_url: string
        }
        Insert: {
          channel_name?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          transcript?: string | null
          updated_at?: string
          user_id: string
          video_id: string
          video_title?: string | null
          video_url: string
        }
        Update: {
          channel_name?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          transcript?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
          video_title?: string | null
          video_url?: string
        }
        Relationships: []
      }
      youtube_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      yt_video_chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      yt_video_chats: {
        Row: {
          channel_name: string | null
          created_at: string
          id: string
          session_id: string
          thumbnail_url: string | null
          transcript: string | null
          updated_at: string
          user_id: string | null
          video_id: string
          video_title: string | null
          video_url: string
        }
        Insert: {
          channel_name?: string | null
          created_at?: string
          id?: string
          session_id: string
          thumbnail_url?: string | null
          transcript?: string | null
          updated_at?: string
          user_id?: string | null
          video_id?: string
          video_title?: string | null
          video_url: string
        }
        Update: {
          channel_name?: string | null
          created_at?: string
          id?: string
          session_id?: string
          thumbnail_url?: string | null
          transcript?: string | null
          updated_at?: string
          user_id?: string | null
          video_id?: string
          video_title?: string | null
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_conversation_invite: { Args: { p_token: string }; Returns: Json }
      acquire_media_key: {
        Args: { p_model_id: string; p_provider: string }
        Returns: {
          o_api_key: string
          o_key_id: string
          o_workspace_id: string
        }[]
      }
      add_credits: {
        Args: { p_amount: number; p_description?: string; p_user_id: string }
        Returns: Json
      }
      admin_add_api_key: {
        Args: {
          p_credit_limit?: number
          p_key: string
          p_label?: string
          p_service: string
        }
        Returns: string
      }
      admin_grant_pro_monthly: { Args: { target_email: string }; Returns: Json }
      assert_model_access: { Args: { _model_id: string }; Returns: Json }
      block_v0_key: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      bump_conversation: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      calc_referral_stats: {
        Args: { _referrer: string }
        Returns: {
          active_refs: number
          net_mrr_cents: number
          rate_pct: number
          tier_id: string
          tier_name: string
        }[]
      }
      check_api_rate_limit: {
        Args: {
          _endpoint: string
          _request_limit: number
          _window_seconds: number
        }
        Returns: {
          allowed: boolean
          retry_after: number
        }[]
      }
      check_edge_rate_limit: {
        Args: {
          _endpoint: string
          _identifier: string
          _limit: number
          _window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      check_profile_update_safe_policy: {
        Args: { profile_row: Database["public"]["Tables"]["profiles"]["Row"] }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_block_seconds?: number
          p_bucket: string
          p_ip_hash: string
          p_per_hour?: number
          p_per_minute?: number
          p_user_id: string
        }
        Returns: Json
      }
      claim_promo_slot: { Args: never; Returns: number }
      claim_referral_milestone: { Args: never; Returns: Json }
      claim_referral_signup: { Args: { p_code: string }; Returns: Json }
      claim_stale_background_jobs: {
        Args: { stale_seconds?: number }
        Returns: {
          attempt: number
          checkpoint: Json
          clarify: Json | null
          conversation_id: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          input: Json
          kind: string
          last_heartbeat_at: string
          max_attempts: number
          message_id: string | null
          meta: Json
          next_run_at: string | null
          output: Json
          phase: string | null
          progress: number
          provider_errors: Json
          resumable: boolean
          runner: string | null
          status: string
          status_text: string | null
          stream_text: string
          tokens_used: number
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "background_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_high_volume_tables: { Args: never; Returns: Json }
      cleanup_old_research_reports: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      complete_referral_task: { Args: { p_task_key: string }; Returns: Json }
      consume_daily_free_or_credits: {
        Args: {
          p_cost?: number
          p_description?: string
          p_feature: string
          p_free_per_day: number
        }
        Returns: Json
      }
      consume_free_image_use: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: Json
      }
      consume_model_use: {
        Args: {
          _cost?: number
          _description?: string
          _feature: string
          _free_per_day?: number
          _model_id: string
        }
        Returns: Json
      }
      consume_video_quota:
        | {
            Args: { _model?: string; _unlimited?: boolean; _user_id?: string }
            Returns: Json
          }
        | { Args: { _model: string; _unlimited?: boolean }; Returns: Json }
      create_notification: {
        Args: {
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_workspace: {
        Args: { p_name: string; p_plan?: string }
        Returns: {
          archived_at: string | null
          avatar_url: string | null
          created_at: string
          credits: number
          default_member_monthly_limit: number | null
          id: string
          name: string
          owner_id: string
          plan: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "workspaces"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deduct_credits: {
        Args: {
          p_action_type: string
          p_amount: number
          p_description?: string
          p_user_id: string
        }
        Returns: Json
      }
      ensure_my_mailbox: {
        Args: never
        Returns: {
          address: string
          created_at: string
          display_name: string | null
          external_enabled: boolean | null
          id: string
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "mailboxes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_integration_secret: {
        Args: {
          _all_tokens?: string[]
          _forbidden_tokens?: string[]
          _names?: string[]
          _prefer_tokens?: string[]
        }
        Returns: string
      }
      get_invite_details: { Args: { p_token: string }; Returns: Json }
      get_landing_page_prompt: { Args: { item_id: string }; Returns: string }
      get_today_promo_slots: {
        Args: never
        Returns: {
          claimed_count: number
          date: string
          remaining: number
          total_slots: number
        }[]
      }
      get_user_subscription_status: {
        Args: { p_email?: string; p_user_id?: string }
        Returns: Json
      }
      get_workspace_invite_details: { Args: { p_token: string }; Returns: Json }
      grant_referral_milestone: { Args: { _referrer: string }; Returns: Json }
      grant_user_credits: {
        Args: {
          p_action_type: string
          p_amount: number
          p_description?: string
          p_user_id: string
        }
        Returns: number
      }
      has_elite_plan: { Args: { p_user_id: string }; Returns: boolean }
      has_paid_plan: { Args: { p_user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_unlimited_plan: { Args: { p_user_id: string }; Returns: boolean }
      is_conversation_member: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      is_invite_for_current_user: {
        Args: { p_invite_email: string }
        Returns: boolean
      }
      is_service_role: { Args: never; Returns: boolean }
      is_workspace_admin: {
        Args: { _user: string; _ws: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user: string; _ws: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_actor_user_id?: string
          p_details?: Json
          p_event_type: string
          p_function_name?: string
          p_ip_hash?: string
          p_provider?: string
          p_severity?: string
          p_target_id?: string
        }
        Returns: string
      }
      mark_media_key_exhausted: {
        Args: { p_key_id: string; p_reason?: string }
        Returns: undefined
      }
      mark_notifications_read: {
        Args: { p_notification_ids?: string[]; p_user_id: string }
        Returns: undefined
      }
      match_attachment_chunks: {
        Args: {
          p_conversation_id: string
          p_match_count?: number
          p_min_similarity?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          file_name: string
          id: string
          similarity: number
        }[]
      }
      match_skills: {
        Args: {
          p_match_count?: number
          p_min_similarity?: number
          p_user_id: string
          query_embedding: string
        }
        Returns: {
          description: string
          enabled_tools: string[]
          id: string
          instructions: string
          name: string
          preferred_model: string
          similarity: number
          source: string
        }[]
      }
      match_user_memories:
        | {
            Args: {
              p_match_count?: number
              p_query_embedding: string
              p_user_id: string
            }
            Returns: {
              id: string
              similarity: number
              summary: string
              title: string
            }[]
          }
        | {
            Args: {
              p_match_count?: number
              p_min_similarity?: number
              p_query_embedding: string
              p_user_id: string
            }
            Returns: {
              created_at: string
              id: string
              scope: string
              similarity: number
              summary: string
              title: string
            }[]
          }
      match_user_messages: {
        Args: {
          p_exclude_conversation?: string
          p_match_count?: number
          p_min_similarity?: number
          p_user_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          similarity: number
        }[]
      }
      model_requires_paid_plan: {
        Args: { _model_id: string }
        Returns: boolean
      }
      move_to_dead_letter: {
        Args: {
          p_last_error?: string
          p_original_id: string
          p_source_table: string
        }
        Returns: string
      }
      my_referral_milestone: { Args: never; Returns: Json }
      owns_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      pick_api_key: {
        Args: { p_service: string }
        Returns: {
          api_key: string
          id: string
        }[]
      }
      pick_v0_key: {
        Args: never
        Returns: {
          api_key: string
          id: string
        }[]
      }
      process_polar_order: {
        Args: {
          p_credits: number
          p_order_id: string
          p_plan: string
          p_product_id: string
          p_user_id: string
        }
        Returns: Json
      }
      record_api_key_usage: {
        Args: {
          p_cost_usd?: number
          p_error?: string
          p_id: string
          p_ok?: boolean
          p_status_code?: number
        }
        Returns: undefined
      }
      record_referral_commission: {
        Args: {
          _net_cents: number
          _referred: string
          _source?: string
          _subscription: string
        }
        Returns: string
      }
      referral_required_task_keys: { Args: never; Returns: string[] }
      search_attachment_chunks: {
        Args: {
          p_conversation_id: string
          p_match_count?: number
          p_query_embedding: string
          p_user_id: string
        }
        Returns: {
          chunk_index: number
          content: string
          file_name: string
          id: string
          similarity: number
        }[]
      }
      spend_credits_auto:
        | {
            Args: {
              p_action_type: string
              p_amount: number
              p_description?: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_action_type: string
              p_amount: number
              p_description?: string
              p_user_id: string
              p_workspace_id: string
            }
            Returns: Json
          }
      spend_user_credits: {
        Args: {
          p_action_type: string
          p_amount: number
          p_description?: string
          p_user_id: string
        }
        Returns: number
      }
      take_service_key: {
        Args: { p_provider: string }
        Returns: {
          o_cipher: string
          o_id: string
          o_iv: string
        }[]
      }
      update_profile_safe: {
        Args: {
          p_avatar_url?: string
          p_display_name?: string
          p_two_factor_enabled?: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      verify_external_api_key: { Args: { p_key_hash: string }; Returns: string }
      video_quota_tier: { Args: { _user_id: string }; Returns: string }
      watchdog_resume_background: { Args: never; Returns: number }
      watchdog_resume_operator: { Args: never; Returns: undefined }
      workspace_accept_invite: { Args: { p_token: string }; Returns: Json }
      workspace_apply_topup: {
        Args: {
          p_amount_credits: number
          p_amount_usd: number
          p_initiated_by: string
          p_polar_order_id: string
          p_workspace_id: string
        }
        Returns: Json
      }
      workspace_approve_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      workspace_archive: { Args: { p_ws: string }; Returns: Json }
      workspace_create_api_key: {
        Args: { p_name: string; p_ws: string }
        Returns: Json
      }
      workspace_create_invite: {
        Args: {
          p_email: string
          p_role?: Database["public"]["Enums"]["workspace_role"]
          p_workspace_id: string
        }
        Returns: Json
      }
      workspace_decline_invite: { Args: { p_token: string }; Returns: Json }
      workspace_deduct_credits: {
        Args: {
          p_action_type: string
          p_amount: number
          p_description?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      workspace_export_gdpr: { Args: { p_ws: string }; Returns: Json }
      workspace_log: {
        Args: {
          p_action: string
          p_meta?: Json
          p_target_id?: string
          p_target_type?: string
          p_ws: string
        }
        Returns: undefined
      }
      workspace_reject_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      workspace_revoke_api_key: { Args: { p_key_id: string }; Returns: Json }
      workspace_role_of: {
        Args: { _user: string; _ws: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
      workspace_set_member_role: {
        Args: {
          p_role: Database["public"]["Enums"]["workspace_role"]
          p_user: string
          p_ws: string
        }
        Returns: Json
      }
      workspace_set_member_status: {
        Args: {
          p_reason?: string
          p_suspended: boolean
          p_user: string
          p_ws: string
        }
        Returns: Json
      }
      workspace_transfer_ownership: {
        Args: { p_new_owner: string; p_ws: string }
        Returns: Json
      }
      workspace_transfer_project: {
        Args: { p_project_id: string; p_target_ws: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      bundle_order_status: "pending" | "approved" | "rejected"
      memory_scope:
        | "account"
        | "conversation"
        | "project"
        | "file"
        | "preference"
      workspace_invite_status: "pending" | "accepted" | "revoked" | "expired"
      workspace_role:
        | "owner"
        | "admin"
        | "member"
        | "editor"
        | "viewer"
        | "billing_manager"
      workspace_task_priority: "low" | "medium" | "high"
      workspace_task_status: "todo" | "doing" | "done"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      bundle_order_status: ["pending", "approved", "rejected"],
      memory_scope: [
        "account",
        "conversation",
        "project",
        "file",
        "preference",
      ],
      workspace_invite_status: ["pending", "accepted", "revoked", "expired"],
      workspace_role: [
        "owner",
        "admin",
        "member",
        "editor",
        "viewer",
        "billing_manager",
      ],
      workspace_task_priority: ["low", "medium", "high"],
      workspace_task_status: ["todo", "doing", "done"],
    },
  },
} as const
