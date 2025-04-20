export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          client_id: string
          created_at: string | null
          cuit: string
          email: string
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          client_id?: string
          created_at?: string | null
          cuit: string
          email: string
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          client_id?: string
          created_at?: string | null
          cuit?: string
          email?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      order_details: {
        Row: {
          created_at: string | null
          order_detail_id: string
          order_id: string | null
          price: number
          product_id: string | null
          quantity: number
        }
        Insert: {
          created_at?: string | null
          order_detail_id?: string
          order_id?: string | null
          price: number
          product_id?: string | null
          quantity: number
        }
        Update: {
          created_at?: string | null
          order_detail_id?: string
          order_id?: string | null
          price?: number
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_details_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      orders: {
        Row: {
          client_id: string | null
          created_at: string | null
          order_date: string | null
          order_id: string
          status: string
          total_price: number
          updated_at: string | null
          user_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          order_date?: string | null
          order_id?: string
          status: string
          total_price?: number
          updated_at?: string | null
          user_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          order_date?: string | null
          order_id?: string
          status?: string
          total_price?: number
          updated_at?: string | null
          user_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse"
            referencedColumns: ["warehouse_id"]
          },
        ]
      }
      products: {
        Row: {
          batch_number: string
          created_at: string | null
          description: string | null
          destination_id: string | null
          expiration_date: string
          name: string
          origin_country: string
          owner_id: string | null
          product_id: string
          senasa_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          batch_number: string
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          expiration_date: string
          name: string
          origin_country: string
          owner_id?: string | null
          product_id?: string
          senasa_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_number?: string
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          expiration_date?: string
          name?: string
          origin_country?: string
          owner_id?: string | null
          product_id?: string
          senasa_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      senasa_products: {
        Row: {
          capacity: number | null
          created_at: string | null
          formulation_id: string | null
          material_id: string | null
          package_id: string | null
          reg_senasa: string | null
          senasa_product_id: string
          toxicological_class_id: string | null
          unit_id: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          formulation_id?: string | null
          material_id?: string | null
          package_id?: string | null
          reg_senasa?: string | null
          senasa_product_id: string
          toxicological_class_id?: string | null
          unit_id?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          formulation_id?: string | null
          material_id?: string | null
          package_id?: string | null
          reg_senasa?: string | null
          senasa_product_id?: string
          toxicological_class_id?: string | null
          unit_id?: string | null
        }
        Relationships: []
      }
      senasa_transactions: {
        Row: {
          created_at: string | null
          error_message: string | null
          method_name: string
          request_data: Json
          response_data: Json | null
          status: string
          transaction_date: string | null
          transaction_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          method_name: string
          request_data: Json
          response_data?: Json | null
          status: string
          transaction_date?: string | null
          transaction_id?: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          method_name?: string
          request_data?: Json
          response_data?: Json | null
          status?: string
          transaction_date?: string | null
          transaction_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string | null
          movement_date: string | null
          movement_id: string
          movement_type: string
          product_id: string | null
          quantity: number
          reference: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          movement_date?: string | null
          movement_id?: string
          movement_type: string
          product_id?: string | null
          quantity: number
          reference?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          movement_date?: string | null
          movement_id?: string
          movement_type?: string
          product_id?: string | null
          quantity?: number
          reference?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse"
            referencedColumns: ["warehouse_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          is_active: boolean | null
          name: string
          password_hash: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          is_active?: boolean | null
          name: string
          password_hash: string
          role: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          is_active?: boolean | null
          name?: string
          password_hash?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      warehouse: {
        Row: {
          created_at: string | null
          is_active: boolean | null
          location: string | null
          name: string
          owner_id: string | null
          updated_at: string | null
          user_id: string | null
          warehouse_id: string
        }
        Insert: {
          created_at?: string | null
          is_active?: boolean | null
          location?: string | null
          name: string
          owner_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          warehouse_id?: string
        }
        Update: {
          created_at?: string | null
          is_active?: boolean | null
          location?: string | null
          name?: string
          owner_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_warehouse_owner"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_warehouse_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
