export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      campanha_itens: {
        Row: {
          atualizado_em: string
          campanha_id: string
          categoria: string
          criado_em: string
          id: string
          meta_quantidade: number
          nome: string
          unidade: string
        }
        Insert: {
          atualizado_em?: string
          campanha_id: string
          categoria: string
          criado_em?: string
          id?: string
          meta_quantidade?: number
          nome: string
          unidade: string
        }
        Update: {
          atualizado_em?: string
          campanha_id?: string
          categoria?: string
          criado_em?: string
          id?: string
          meta_quantidade?: number
          nome?: string
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanha_itens_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_itens_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "vw_campanhas_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      campanha_reaberturas: {
        Row: {
          campanha_id: string
          id: string
          motivo: string | null
          reaberta_em: string
          reaberta_por: string | null
        }
        Insert: {
          campanha_id: string
          id?: string
          motivo?: string | null
          reaberta_em?: string
          reaberta_por?: string | null
        }
        Update: {
          campanha_id?: string
          id?: string
          motivo?: string | null
          reaberta_em?: string
          reaberta_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campanha_reaberturas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_reaberturas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "vw_campanhas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_reaberturas_reaberta_por_fkey"
            columns: ["reaberta_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          atualizado_em: string
          cor: string
          criado_em: string
          criado_por: string | null
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          finalizada_em: string | null
          finalizada_por: string | null
          id: string
          meta_financeira: number | null
          status: Database["public"]["Enums"]["status_campanha"]
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          cor?: string
          criado_em?: string
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          finalizada_em?: string | null
          finalizada_por?: string | null
          id?: string
          meta_financeira?: number | null
          status?: Database["public"]["Enums"]["status_campanha"]
          titulo: string
        }
        Update: {
          atualizado_em?: string
          cor?: string
          criado_em?: string
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          finalizada_em?: string | null
          finalizada_por?: string | null
          id?: string
          meta_financeira?: number | null
          status?: Database["public"]["Enums"]["status_campanha"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_finalizada_por_fkey"
            columns: ["finalizada_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_sistema: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          chave: string
          valor: Json
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave: string
          valor: Json
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave?: string
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_sistema_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      doadores: {
        Row: {
          atualizado_em: string
          criado_em: string
          documento: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: Database["public"]["Enums"]["origem_doador"]
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_doador"]
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_doador"]
          telefone?: string | null
        }
        Relationships: []
      }
      documentos: {
        Row: {
          campanha_id: string | null
          criado_em: string
          descricao: string | null
          enviado_por: string | null
          id: string
          mime_type: string
          nome: string
          nome_original: string
          storage_path: string
          tamanho_bytes: number
        }
        Insert: {
          campanha_id?: string | null
          criado_em?: string
          descricao?: string | null
          enviado_por?: string | null
          id?: string
          mime_type: string
          nome: string
          nome_original: string
          storage_path: string
          tamanho_bytes: number
        }
        Update: {
          campanha_id?: string | null
          criado_em?: string
          descricao?: string | null
          enviado_por?: string | null
          id?: string
          mime_type?: string
          nome?: string
          nome_original?: string
          storage_path?: string
          tamanho_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "documentos_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "vw_campanhas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      import_erros: {
        Row: {
          dados_brutos: Json
          erro_msg: string
          id: string
          linha_numero: number
          lote_id: string
        }
        Insert: {
          dados_brutos: Json
          erro_msg: string
          id?: string
          linha_numero: number
          lote_id: string
        }
        Update: {
          dados_brutos?: Json
          erro_msg?: string
          id?: string
          linha_numero?: number
          lote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_erros_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "import_lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      import_lotes: {
        Row: {
          id: string
          importado_em: string
          importado_por: string | null
          mapeamento_colunas: Json
          nome_arquivo: string
          status: Database["public"]["Enums"]["status_import_lote"]
          total_erro: number
          total_linhas: number
          total_sucesso: number
        }
        Insert: {
          id?: string
          importado_em?: string
          importado_por?: string | null
          mapeamento_colunas: Json
          nome_arquivo: string
          status?: Database["public"]["Enums"]["status_import_lote"]
          total_erro?: number
          total_linhas?: number
          total_sucesso?: number
        }
        Update: {
          id?: string
          importado_em?: string
          importado_por?: string | null
          mapeamento_colunas?: Json
          nome_arquivo?: string
          status?: Database["public"]["Enums"]["status_import_lote"]
          total_erro?: number
          total_linhas?: number
          total_sucesso?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_lotes_importado_por_fkey"
            columns: ["importado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_doacao_item: {
        Row: {
          campanha_id: string
          campanha_item_id: string | null
          criado_em: string
          criado_por: string | null
          data: string
          doador_id: string | null
          id: string
          observacao: string | null
          quantidade: number
        }
        Insert: {
          campanha_id: string
          campanha_item_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: string
          doador_id?: string | null
          id?: string
          observacao?: string | null
          quantidade: number
        }
        Update: {
          campanha_id?: string
          campanha_item_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: string
          doador_id?: string | null
          id?: string
          observacao?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_doacao_item_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_doacao_item_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "vw_campanhas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_doacao_item_campanha_item_id_fkey"
            columns: ["campanha_item_id"]
            isOneToOne: false
            referencedRelation: "campanha_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_doacao_item_campanha_item_id_fkey"
            columns: ["campanha_item_id"]
            isOneToOne: false
            referencedRelation: "vw_campanha_itens_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_doacao_item_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_doacao_item_doador_id_fkey"
            columns: ["doador_id"]
            isOneToOne: false
            referencedRelation: "doadores"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cargo: Database["public"]["Enums"]["cargo_usuario"]
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cargo?: Database["public"]["Enums"]["cargo_usuario"]
          criado_em?: string
          id: string
          nome: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cargo?: Database["public"]["Enums"]["cargo_usuario"]
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      permissoes_perfil: {
        Row: {
          id: string
          modulo: Database["public"]["Enums"]["modulo_sistema"]
          perfil_id: string
          pode_criar: boolean
          pode_editar: boolean
          pode_excluir: boolean
          pode_ver: boolean
        }
        Insert: {
          id?: string
          modulo: Database["public"]["Enums"]["modulo_sistema"]
          perfil_id: string
          pode_criar?: boolean
          pode_editar?: boolean
          pode_excluir?: boolean
          pode_ver?: boolean
        }
        Update: {
          id?: string
          modulo?: Database["public"]["Enums"]["modulo_sistema"]
          perfil_id?: string
          pode_criar?: boolean
          pode_editar?: boolean
          pode_excluir?: boolean
          pode_ver?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_perfil_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      precos_referencia: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          categoria: string
          fonte: string
          id: string
          item_nome: string
          preco_unitario: number
          unidade: string
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          categoria: string
          fonte?: string
          id?: string
          item_nome: string
          preco_unitario: number
          unidade: string
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          categoria?: string
          fonte?: string
          id?: string
          item_nome?: string
          preco_unitario?: number
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "precos_referencia_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes: {
        Row: {
          atualizado_em: string
          campanha_id: string | null
          criado_em: string
          criado_por: string | null
          data: string
          descricao: string
          doador_id: string | null
          id: string
          recibo_storage_path: string | null
          tem_recibo: boolean
          tipo: Database["public"]["Enums"]["tipo_transacao"]
          valor: number
        }
        Insert: {
          atualizado_em?: string
          campanha_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: string
          descricao: string
          doador_id?: string | null
          id?: string
          recibo_storage_path?: string | null
          tem_recibo?: boolean
          tipo: Database["public"]["Enums"]["tipo_transacao"]
          valor: number
        }
        Update: {
          atualizado_em?: string
          campanha_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: string
          descricao?: string
          doador_id?: string | null
          id?: string
          recibo_storage_path?: string | null
          tem_recibo?: boolean
          tipo?: Database["public"]["Enums"]["tipo_transacao"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "vw_campanhas_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_doador_id_fkey"
            columns: ["doador_id"]
            isOneToOne: false
            referencedRelation: "doadores"
            referencedColumns: ["id"]
          },
        ]
      }
      voluntarios: {
        Row: {
          criado_em: string
          data_inscricao: string
          email: string | null
          habilidades: string | null
          id: string
          nome: string
          status: Database["public"]["Enums"]["status_voluntario"]
          telefone: string | null
        }
        Insert: {
          criado_em?: string
          data_inscricao?: string
          email?: string | null
          habilidades?: string | null
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["status_voluntario"]
          telefone?: string | null
        }
        Update: {
          criado_em?: string
          data_inscricao?: string
          email?: string | null
          habilidades?: string | null
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["status_voluntario"]
          telefone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vw_campanha_itens_resumo: {
        Row: {
          atualizado_em: string | null
          campanha_id: string | null
          campanha_status: Database["public"]["Enums"]["status_campanha"] | null
          campanha_titulo: string | null
          categoria: string | null
          criado_em: string | null
          id: string | null
          meta_quantidade: number | null
          nome: string | null
          progresso_percentual_bruto: number | null
          quantidade_atual: number | null
          quantidade_faltante: number | null
          unidade: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campanha_itens_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_itens_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "vw_campanhas_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_campanhas_resumo: {
        Row: {
          atualizado_em: string | null
          cor: string | null
          criado_em: string | null
          criado_por: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          finalizada_em: string | null
          finalizada_por: string | null
          id: string | null
          itens_completos: number | null
          meta_financeira: number | null
          saldo_financeiro: number | null
          status: Database["public"]["Enums"]["status_campanha"] | null
          titulo: string | null
          total_itens: number | null
          valor_arrecadado: number | null
          valor_gasto: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_finalizada_por_fkey"
            columns: ["finalizada_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      criar_permissoes_padrao: {
        Args: {
          p_cargo: Database["public"]["Enums"]["cargo_usuario"]
          p_perfil_id: string
        }
        Returns: undefined
      }
      deletar_membro_equipe: {
        Args: { p_caller_password: string; p_target_user_id: string }
        Returns: undefined
      }
      editar_membro_equipe: {
        Args: {
          p_caller_password: string
          p_new_cargo: string
          p_new_email: string
          p_new_nome: string
          p_new_password: string
          p_permissoes: Json
          p_target_user_id: string
        }
        Returns: undefined
      }
      get_meu_cargo: {
        Args: never
        Returns: Database["public"]["Enums"]["cargo_usuario"]
      }
      get_minha_permissao: {
        Args: {
          p_acao: string
          p_modulo: Database["public"]["Enums"]["modulo_sistema"]
        }
        Returns: boolean
      }
      listar_membros_equipe: {
        Args: never
        Returns: {
          ativo: boolean
          atualizado_em: string
          cargo: Database["public"]["Enums"]["cargo_usuario"]
          criado_em: string
          email: string
          id: string
          nome: string
        }[]
      }
      promover_admin_master: { Args: { p_email: string }; Returns: string }
      reabrir_campanha: {
        Args: {
          p_caller_password: string
          p_campanha_id: string
          p_motivo?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      cargo_usuario:
        | "admin_master"
        | "admin"
        | "financeiro"
        | "editor"
        | "visualizador"
      modulo_sistema:
        | "visao_geral"
        | "doacoes"
        | "financeiro"
        | "voluntarios"
        | "configuracoes"
      origem_doador: "manual" | "import_rodrigo" | "formulario"
      status_campanha: "ativa" | "concluida" | "cancelada" | "finalizada"
      status_import_lote: "processando" | "concluido" | "com_erros"
      status_voluntario: "ativo" | "inativo" | "novo"
      tipo_transacao: "entrada" | "saida"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cargo_usuario: [
        "admin_master",
        "admin",
        "financeiro",
        "editor",
        "visualizador",
      ],
      modulo_sistema: [
        "visao_geral",
        "doacoes",
        "financeiro",
        "voluntarios",
        "configuracoes",
      ],
      origem_doador: ["manual", "import_rodrigo", "formulario"],
      status_campanha: ["ativa", "concluida", "cancelada", "finalizada"],
      status_import_lote: ["processando", "concluido", "com_erros"],
      status_voluntario: ["ativo", "inativo", "novo"],
      tipo_transacao: ["entrada", "saida"],
    },
  },
} as const

