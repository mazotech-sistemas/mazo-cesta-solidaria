export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      produtos: {
        Row: {
          id: number;
          nome: string;
          marca: string | null;
          unidade: string | null;
          qtd_por_cesta: number;
          estoque_atual: number;
          preco_atual: number;
          token_tenda: string | null;
          url_tenda: string | null;
          termo_busca: string | null;
          ativo: boolean;
          ultima_atualizacao_preco: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: number;
          nome: string;
          marca?: string | null;
          unidade?: string | null;
          qtd_por_cesta?: number;
          estoque_atual?: number;
          preco_atual?: number;
          token_tenda?: string | null;
          url_tenda?: string | null;
          termo_busca?: string | null;
          ativo?: boolean;
          ultima_atualizacao_preco?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: number;
          nome?: string;
          marca?: string | null;
          unidade?: string | null;
          qtd_por_cesta?: number;
          estoque_atual?: number;
          preco_atual?: number;
          token_tenda?: string | null;
          url_tenda?: string | null;
          termo_busca?: string | null;
          ativo?: boolean;
          ultima_atualizacao_preco?: string | null;
          atualizado_em?: string;
        };
        Relationships: [];
      };
      regions: {
        Row: {
          region_id: string;
          nome: string;
          ativo: boolean;
          cep_referencia: string | null;
        };
        Insert: {
          region_id: string;
          nome: string;
          ativo?: boolean;
          cep_referencia?: string | null;
        };
        Update: {
          region_id?: string;
          nome?: string;
          ativo?: boolean;
          cep_referencia?: string | null;
        };
        Relationships: [];
      };
      precos_historico: {
        Row: {
          id: number;
          produto_id: number;
          preco: number;
          dia: string;
          region_id: string;
        };
        Insert: {
          id?: number;
          produto_id: number;
          preco: number;
          dia: string;
          region_id: string;
        };
        Update: {
          id?: number;
          produto_id?: number;
          preco?: number;
          dia?: string;
          region_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'precos_historico_produto_id_fkey';
            columns: ['produto_id'];
            isOneToOne: false;
            referencedRelation: 'produtos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'precos_historico_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'regions';
            referencedColumns: ['region_id'];
          },
        ];
      };
      compras: {
        Row: {
          id: number;
          numero_cestas: number;
          itens: Json;
          total: number;
          criado_por: string;
          criado_em: string;
        };
        Insert: {
          id?: number;
          numero_cestas: number;
          itens: Json;
          total: number;
          criado_por: string;
          criado_em?: string;
        };
        Update: {
          id?: number;
          numero_cestas?: number;
          itens?: Json;
          total?: number;
          criado_por?: string;
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'compras_criado_por_fkey';
            columns: ['criado_por'];
            isOneToOne: false;
            referencedRelation: 'auth.users';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          nome: string;
          is_admin: boolean;
          criado_em: string;
        };
        Insert: {
          id: string;
          nome: string;
          is_admin?: boolean;
          criado_em?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          is_admin?: boolean;
          criado_em?: string;
        };
        Relationships: [];
      };
      config: {
        Row: {
          chave: string;
          valor: string;
        };
        Insert: {
          chave: string;
          valor: string;
        };
        Update: {
          chave?: string;
          valor?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_criar_usuario: {
        Args: {
          p_email: string;
          p_senha: string;
          p_nome: string;
          p_is_admin: boolean;
        };
        Returns: string;
      };
      admin_excluir_usuario: {
        Args: {
          p_id: string;
        };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Produto = Database['public']['Tables']['produtos']['Row'];
export type ProdutoInsert = Database['public']['Tables']['produtos']['Insert'];
export type ProdutoUpdate = Database['public']['Tables']['produtos']['Update'];

export type Regiao = Database['public']['Tables']['regions']['Row'];
export type RegiaoInsert = Database['public']['Tables']['regions']['Insert'];

export type PrecoHistorico = Database['public']['Tables']['precos_historico']['Row'];

export type Compra = Database['public']['Tables']['compras']['Row'];
export type CompraInsert = Database['public']['Tables']['compras']['Insert'];

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

export type Config = Database['public']['Tables']['config']['Row'];