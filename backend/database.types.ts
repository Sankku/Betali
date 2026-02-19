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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      alert_settings: {
        Row: {
          check_interval_minutes: number | null
          created_at: string | null
          email_notifications: boolean | null
          enable_expiring_soon_alerts: boolean | null
          enable_low_stock_alerts: boolean | null
          enable_out_of_stock_alerts: boolean | null
          enable_overstock_alerts: boolean | null
          expiring_soon_days: number | null
          in_app_notifications: boolean | null
          last_check_at: string | null
          low_stock_percentage: number | null
          notification_emails: Json | null
          organization_id: string
          setting_id: string
          updated_at: string | null
        }
        Insert: {
          check_interval_minutes?: number | null
          created_at?: string | null
          email_notifications?: boolean | null
          enable_expiring_soon_alerts?: boolean | null
          enable_low_stock_alerts?: boolean | null
          enable_out_of_stock_alerts?: boolean | null
          enable_overstock_alerts?: boolean | null
          expiring_soon_days?: number | null
          in_app_notifications?: boolean | null
          last_check_at?: string | null
          low_stock_percentage?: number | null
          notification_emails?: Json | null
          organization_id: string
          setting_id?: string
          updated_at?: string | null
        }
        Update: {
          check_interval_minutes?: number | null
          created_at?: string | null
          email_notifications?: boolean | null
          enable_expiring_soon_alerts?: boolean | null
          enable_low_stock_alerts?: boolean | null
          enable_out_of_stock_alerts?: boolean | null
          enable_overstock_alerts?: boolean | null
          expiring_soon_days?: number | null
          in_app_notifications?: boolean | null
          last_check_at?: string | null
          low_stock_percentage?: number | null
          notification_emails?: Json | null
          organization_id?: string
          setting_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      applied_discounts: {
        Row: {
          applied_at: string | null
          applied_discount_id: string
          applied_to: string
          coupon_code: string | null
          discount_amount: number
          discount_rule_id: string
          order_id: string
          order_line_id: string | null
          organization_id: string
        }
        Insert: {
          applied_at?: string | null
          applied_discount_id?: string
          applied_to?: string
          coupon_code?: string | null
          discount_amount: number
          discount_rule_id: string
          order_id: string
          order_line_id?: string | null
          organization_id: string
        }
        Update: {
          applied_at?: string | null
          applied_discount_id?: string
          applied_to?: string
          coupon_code?: string | null
          discount_amount?: number
          discount_rule_id?: string
          order_id?: string
          order_line_id?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applied_discounts_discount_rule_id_fkey"
            columns: ["discount_rule_id"]
            isOneToOne: false
            referencedRelation: "discount_rules"
            referencedColumns: ["discount_rule_id"]
          },
          {
            foreignKeyName: "applied_discounts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "applied_discounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          branch_id: string
          created_at: string | null
          is_active: boolean | null
          is_main_branch: boolean | null
          manager_user_id: string | null
          name: string
          organization_id: string | null
          phone: string | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string
          created_at?: string | null
          is_active?: boolean | null
          is_main_branch?: boolean | null
          manager_user_id?: string | null
          name: string
          organization_id?: string | null
          phone?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string
          created_at?: string | null
          is_active?: boolean | null
          is_main_branch?: boolean | null
          manager_user_id?: string | null
          name?: string
          organization_id?: string | null
          phone?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "fk_branches_manager"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          branch_id: string | null
          client_id: string
          created_at: string | null
          cuit: string
          email: string
          name: string
          organization_id: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          client_id?: string
          created_at?: string | null
          cuit: string
          email: string
          name: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          client_id?: string
          created_at?: string | null
          cuit?: string
          email?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      customer_pricing: {
        Row: {
          client_id: string
          created_at: string | null
          customer_pricing_id: string
          is_active: boolean | null
          notes: string | null
          organization_id: string
          price: number
          product_id: string
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          customer_pricing_id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id: string
          price: number
          product_id: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          customer_pricing_id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string
          price?: number
          product_id?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_pricing_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "customer_pricing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      discount_rule_products: {
        Row: {
          created_at: string | null
          discount_rule_id: string
          discount_rule_product_id: string
          organization_id: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          discount_rule_id: string
          discount_rule_product_id?: string
          organization_id: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          discount_rule_id?: string
          discount_rule_product_id?: string
          organization_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_rule_products_discount_rule_id_fkey"
            columns: ["discount_rule_id"]
            isOneToOne: false
            referencedRelation: "discount_rules"
            referencedColumns: ["discount_rule_id"]
          },
          {
            foreignKeyName: "discount_rule_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "discount_rule_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      discount_rules: {
        Row: {
          applies_to: string
          coupon_code: string | null
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_rule_id: string
          is_active: boolean | null
          max_discount_amount: number | null
          max_uses: number | null
          max_uses_per_customer: number | null
          min_order_amount: number | null
          min_quantity: number | null
          name: string
          organization_id: string
          requires_coupon: boolean | null
          type: string
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
          value: number
        }
        Insert: {
          applies_to?: string
          coupon_code?: string | null
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_rule_id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_uses?: number | null
          max_uses_per_customer?: number | null
          min_order_amount?: number | null
          min_quantity?: number | null
          name: string
          organization_id: string
          requires_coupon?: boolean | null
          type: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
          value: number
        }
        Update: {
          applies_to?: string
          coupon_code?: string | null
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_rule_id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_uses?: number | null
          max_uses_per_customer?: number | null
          min_order_amount?: number | null
          min_quantity?: number | null
          name?: string
          organization_id?: string
          requires_coupon?: boolean | null
          type?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "discount_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      inventory_alerts: {
        Row: {
          alert_id: string
          alert_type: string
          created_at: string | null
          current_stock: number
          dismissed_at: string | null
          dismissed_by: string | null
          max_stock: number | null
          message: string
          metadata: Json | null
          min_stock: number | null
          organization_id: string
          product_id: string
          resolved_at: string | null
          severity: string
          status: string
          triggered_at: string
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          alert_id?: string
          alert_type: string
          created_at?: string | null
          current_stock: number
          dismissed_at?: string | null
          dismissed_by?: string | null
          max_stock?: number | null
          message: string
          metadata?: Json | null
          min_stock?: number | null
          organization_id: string
          product_id: string
          resolved_at?: string | null
          severity?: string
          status?: string
          triggered_at?: string
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          alert_id?: string
          alert_type?: string
          created_at?: string | null
          current_stock?: number
          dismissed_at?: string | null
          dismissed_by?: string | null
          max_stock?: number | null
          message?: string
          metadata?: Json | null
          min_stock?: number | null
          organization_id?: string
          product_id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          triggered_at?: string
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inventory_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "inventory_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_alerts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse"
            referencedColumns: ["warehouse_id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          due_date: string
          invoice_id: string
          invoice_number: string
          issue_date: string | null
          notes: string | null
          organization_id: string
          paid_date: string | null
          period_end: string
          period_start: string
          status: string | null
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          due_date: string
          invoice_id?: string
          invoice_number: string
          issue_date?: string | null
          notes?: string | null
          organization_id: string
          paid_date?: string | null
          period_end: string
          period_start: string
          status?: string | null
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          due_date?: string
          invoice_id?: string
          invoice_number?: string
          issue_date?: string | null
          notes?: string | null
          organization_id?: string
          paid_date?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["subscription_id"]
          },
        ]
      }
      manual_payments: {
        Row: {
          admin_notes: string | null
          amount: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          currency: string
          invoice_number: string | null
          notes: string | null
          organization_id: string
          payment_date: string | null
          payment_id: string
          payment_method: string | null
          receipt_url: string | null
          recorded_by: string
          status: string | null
          subscription_id: string | null
          transaction_reference: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          currency?: string
          invoice_number?: string | null
          notes?: string | null
          organization_id: string
          payment_date?: string | null
          payment_id?: string
          payment_method?: string | null
          receipt_url?: string | null
          recorded_by: string
          status?: string | null
          subscription_id?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          currency?: string
          invoice_number?: string | null
          notes?: string | null
          organization_id?: string
          payment_date?: string | null
          payment_id?: string
          payment_method?: string | null
          receipt_url?: string | null
          recorded_by?: string
          status?: string | null
          subscription_id?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_payments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "manual_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "manual_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "manual_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["subscription_id"]
          },
        ]
      }
      order_details: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          line_total: number
          order_detail_id: string
          order_id: string | null
          order_item_id: string | null
          organization_id: string | null
          price: number
          product_id: string | null
          quantity: number
          tax_amount: number | null
          unit_price: number
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          line_total?: number
          order_detail_id?: string
          order_id?: string | null
          order_item_id?: string | null
          organization_id?: string | null
          price: number
          product_id?: string | null
          quantity: number
          tax_amount?: number | null
          unit_price?: number
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          line_total?: number
          order_detail_id?: string
          order_id?: string | null
          order_item_id?: string | null
          organization_id?: string | null
          price?: number
          product_id?: string | null
          quantity?: number
          tax_amount?: number | null
          unit_price?: number
          warehouse_id?: string | null
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
            foreignKeyName: "order_details_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "order_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_details_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse"
            referencedColumns: ["warehouse_id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          delivery_date: string | null
          discount_amount: number | null
          notes: string | null
          order_date: string | null
          order_id: string
          order_number: string | null
          organization_id: string | null
          shipping_amount: number | null
          status: string
          subtotal: number | null
          tax_amount: number | null
          total: number | null
          total_price: number
          updated_at: string | null
          user_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          branch_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          discount_amount?: number | null
          notes?: string | null
          order_date?: string | null
          order_id?: string
          order_number?: string | null
          organization_id?: string | null
          shipping_amount?: number | null
          status: string
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          total_price?: number
          updated_at?: string | null
          user_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          branch_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          discount_amount?: number | null
          notes?: string | null
          order_date?: string | null
          order_id?: string
          order_number?: string | null
          organization_id?: string | null
          shipping_amount?: number | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          total_price?: number
          updated_at?: string | null
          user_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
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
      organizations: {
        Row: {
          address: string | null
          created_at: string | null
          domain: string | null
          email: string | null
          features: Json | null
          grace_period_ends_at: string | null
          is_active: boolean | null
          logo_url: string | null
          max_users: number | null
          max_warehouses: number | null
          name: string
          organization_id: string
          owner_user_id: string | null
          phone: string | null
          plan_type: Database["public"]["Enums"]["plan_type_enum"] | null
          settings: Json | null
          slug: string
          subscription_plan: string | null
          subscription_status: string | null
          tax_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          domain?: string | null
          email?: string | null
          features?: Json | null
          grace_period_ends_at?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          max_users?: number | null
          max_warehouses?: number | null
          name: string
          organization_id?: string
          owner_user_id?: string | null
          phone?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type_enum"] | null
          settings?: Json | null
          slug: string
          subscription_plan?: string | null
          subscription_status?: string | null
          tax_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          domain?: string | null
          email?: string | null
          features?: Json | null
          grace_period_ends_at?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          max_users?: number | null
          max_warehouses?: number | null
          name?: string
          organization_id?: string
          owner_user_id?: string | null
          phone?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type_enum"] | null
          settings?: Json | null
          slug?: string
          subscription_plan?: string | null
          subscription_status?: string | null
          tax_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_organizations_subscription_plan"
            columns: ["subscription_plan"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "organizations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          created_at: string | null
          is_active: boolean | null
          max_quantity: number | null
          min_quantity: number
          organization_id: string
          price: number
          pricing_tier_id: string
          product_id: string
          tier_name: string
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string | null
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity?: number
          organization_id: string
          price: number
          pricing_tier_id?: string
          product_id: string
          tier_name: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string | null
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity?: number
          organization_id?: string
          price?: number
          pricing_tier_id?: string
          product_id?: string
          tier_name?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pricing_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_tax_groups: {
        Row: {
          created_at: string | null
          organization_id: string
          product_id: string
          product_tax_group_id: string
          tax_rate_id: string
        }
        Insert: {
          created_at?: string | null
          organization_id: string
          product_id: string
          product_tax_group_id?: string
          tax_rate_id: string
        }
        Update: {
          created_at?: string | null
          organization_id?: string
          product_id?: string
          product_tax_group_id?: string
          tax_rate_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tax_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "product_tax_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_tax_groups_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["tax_rate_id"]
          },
        ]
      }
      products: {
        Row: {
          alert_enabled: boolean | null
          batch_number: string
          branch_id: string | null
          created_at: string | null
          description: string | null
          destination_id: string | null
          expiration_date: string
          external_product_id: string | null
          max_stock: number | null
          min_stock: number | null
          name: string
          organization_id: string | null
          origin_country: string
          owner_id: string | null
          price: number | null
          product_id: string
          senasa_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          alert_enabled?: boolean | null
          batch_number: string
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          expiration_date: string
          external_product_id?: string | null
          max_stock?: number | null
          min_stock?: number | null
          name: string
          organization_id?: string | null
          origin_country: string
          owner_id?: string | null
          price?: number | null
          product_id?: string
          senasa_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          alert_enabled?: boolean | null
          batch_number?: string
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          expiration_date?: string
          external_product_id?: string | null
          max_stock?: number | null
          min_stock?: number | null
          name?: string
          organization_id?: string | null
          origin_country?: string
          owner_id?: string | null
          price?: number | null
          product_id?: string
          senasa_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      purchase_order_details: {
        Row: {
          created_at: string | null
          detail_id: string
          line_total: number
          notes: string | null
          organization_id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          detail_id?: string
          line_total: number
          notes?: string | null
          organization_id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          received_quantity?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          detail_id?: string
          line_total?: number
          notes?: string | null
          organization_id?: string
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_details_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "purchase_order_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_order_details_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["purchase_order_id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          expected_delivery_date: string | null
          notes: string | null
          order_date: string | null
          organization_id: string
          purchase_order_id: string
          purchase_order_number: string | null
          received_date: string | null
          shipping_amount: number | null
          status: string
          subtotal: number | null
          supplier_id: string | null
          tax_amount: number | null
          total: number | null
          updated_at: string | null
          user_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          expected_delivery_date?: string | null
          notes?: string | null
          order_date?: string | null
          organization_id: string
          purchase_order_id?: string
          purchase_order_number?: string | null
          received_date?: string | null
          shipping_amount?: number | null
          status?: string
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
          user_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          expected_delivery_date?: string | null
          notes?: string | null
          order_date?: string | null
          organization_id?: string
          purchase_order_id?: string
          purchase_order_number?: string | null
          received_date?: string | null
          shipping_amount?: number | null
          status?: string
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
          user_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse"
            referencedColumns: ["warehouse_id"]
          },
        ]
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
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          movement_date: string | null
          movement_id: string
          movement_type: string
          notes: string | null
          organization_id: string | null
          product_id: string | null
          quantity: number
          reference: string | null
          reference_id: string | null
          reference_type: string | null
          warehouse_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          movement_date?: string | null
          movement_id?: string
          movement_type: string
          notes?: string | null
          organization_id?: string | null
          product_id?: string | null
          quantity: number
          reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          warehouse_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          movement_date?: string | null
          movement_id?: string
          movement_type?: string
          notes?: string | null
          organization_id?: string | null
          product_id?: string | null
          quantity?: number
          reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
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
      stock_reservations: {
        Row: {
          created_at: string
          created_by: string | null
          notes: string | null
          order_id: string
          organization_id: string
          product_id: string
          quantity: number
          released_at: string | null
          reservation_id: string
          reserved_at: string
          status: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          notes?: string | null
          order_id: string
          organization_id: string
          product_id: string
          quantity: number
          released_at?: string | null
          reservation_id?: string
          reserved_at?: string
          status?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          notes?: string | null
          order_id?: string
          organization_id?: string
          product_id?: string
          quantity?: number
          released_at?: string | null
          reservation_id?: string
          reserved_at?: string
          status?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stock_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "stock_reservations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "stock_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_reservations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse"
            referencedColumns: ["warehouse_id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          event_type: string
          history_id: string
          new_plan_id: string | null
          new_status: string | null
          notes: string | null
          old_plan_id: string | null
          old_status: string | null
          organization_id: string
          subscription_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          event_type: string
          history_id?: string
          new_plan_id?: string | null
          new_status?: string | null
          notes?: string | null
          old_plan_id?: string | null
          old_status?: string | null
          organization_id: string
          subscription_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          event_type?: string
          history_id?: string
          new_plan_id?: string | null
          new_status?: string | null
          notes?: string | null
          old_plan_id?: string | null
          old_status?: string | null
          organization_id?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "subscription_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["subscription_id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          currency: string
          description: string | null
          display_name: string
          features: Json | null
          is_active: boolean | null
          is_public: boolean | null
          max_clients: number | null
          max_orders_per_month: number | null
          max_products: number | null
          max_stock_movements_per_month: number | null
          max_storage_mb: number | null
          max_suppliers: number | null
          max_users: number | null
          max_warehouses: number | null
          name: string
          plan_id: string
          price_monthly: number
          price_yearly: number
          sort_order: number | null
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          description?: string | null
          display_name: string
          features?: Json | null
          is_active?: boolean | null
          is_public?: boolean | null
          max_clients?: number | null
          max_orders_per_month?: number | null
          max_products?: number | null
          max_stock_movements_per_month?: number | null
          max_storage_mb?: number | null
          max_suppliers?: number | null
          max_users?: number | null
          max_warehouses?: number | null
          name: string
          plan_id?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          description?: string | null
          display_name?: string
          features?: Json | null
          is_active?: boolean | null
          is_public?: boolean | null
          max_clients?: number | null
          max_orders_per_month?: number | null
          max_products?: number | null
          max_stock_movements_per_month?: number | null
          max_storage_mb?: number | null
          max_suppliers?: number | null
          max_users?: number | null
          max_warehouses?: number | null
          name?: string
          plan_id?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          billing_cycle: string
          canceled_at: string | null
          created_at: string | null
          currency: string
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          gateway_customer_id: string | null
          gateway_subscription_id: string | null
          metadata: Json | null
          organization_id: string
          payment_gateway: string | null
          payment_provider: string | null
          plan_id: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          subscription_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string | null
          currency?: string
          current_period_end: string
          current_period_start: string
          ended_at?: string | null
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          metadata?: Json | null
          organization_id: string
          payment_gateway?: string | null
          payment_provider?: string | null
          plan_id: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          subscription_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string | null
          currency?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          metadata?: Json | null
          organization_id?: string
          payment_gateway?: string | null
          payment_provider?: string | null
          plan_id?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          subscription_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          branch_id: string | null
          business_type: string | null
          contact_person: string | null
          created_at: string | null
          credit_limit: number | null
          cuit: string
          email: string
          is_active: boolean | null
          is_preferred: boolean | null
          name: string
          notes: string | null
          organization_id: string
          payment_terms: string | null
          phone: string | null
          supplier_id: string
          tax_category: string | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          business_type?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          cuit: string
          email: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          name: string
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          phone?: string | null
          supplier_id?: string
          tax_category?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          business_type?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          cuit?: string
          email?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          name?: string
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          phone?: string | null
          supplier_id?: string
          tax_category?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "suppliers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      table_configurations: {
        Row: {
          config: Json
          created_at: string | null
          entity: string
          id: string
          name: string
        }
        Insert: {
          config: Json
          created_at?: string | null
          entity: string
          id: string
          name: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          entity?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          created_at: string | null
          description: string | null
          is_active: boolean | null
          is_inclusive: boolean | null
          name: string
          organization_id: string
          rate: number
          tax_rate_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          is_inclusive?: boolean | null
          name: string
          organization_id: string
          rate: number
          tax_rate_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          is_inclusive?: boolean | null
          name?: string
          organization_id?: string
          rate?: number
          tax_rate_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          api_calls_count: number | null
          clients_count: number | null
          created_at: string | null
          orders_count: number | null
          organization_id: string
          period_end: string
          period_start: string
          products_count: number | null
          stock_movements_count: number | null
          storage_used_mb: number | null
          suppliers_count: number | null
          updated_at: string | null
          usage_id: string
          users_count: number | null
          warehouses_count: number | null
        }
        Insert: {
          api_calls_count?: number | null
          clients_count?: number | null
          created_at?: string | null
          orders_count?: number | null
          organization_id: string
          period_end: string
          period_start: string
          products_count?: number | null
          stock_movements_count?: number | null
          storage_used_mb?: number | null
          suppliers_count?: number | null
          updated_at?: string | null
          usage_id?: string
          users_count?: number | null
          warehouses_count?: number | null
        }
        Update: {
          api_calls_count?: number | null
          clients_count?: number | null
          created_at?: string | null
          orders_count?: number | null
          organization_id?: string
          period_end?: string
          period_start?: string
          products_count?: number | null
          stock_movements_count?: number | null
          storage_used_mb?: number | null
          suppliers_count?: number | null
          updated_at?: string | null
          usage_id?: string
          users_count?: number | null
          warehouses_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      user_organizations: {
        Row: {
          branch_id: string | null
          is_active: boolean
          joined_at: string
          organization_id: string
          permissions: Json
          role: Database["public"]["Enums"]["user_role_enum"]
          user_id: string
          user_organization_id: string
        }
        Insert: {
          branch_id?: string | null
          is_active?: boolean
          joined_at?: string
          organization_id: string
          permissions?: Json
          role?: Database["public"]["Enums"]["user_role_enum"]
          user_id: string
          user_organization_id?: string
        }
        Update: {
          branch_id?: string | null
          is_active?: boolean
          joined_at?: string
          organization_id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["user_role_enum"]
          user_id?: string
          user_organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_organizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          email: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          password_hash: string
          role: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          email: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          password_hash: string
          role?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          email?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          password_hash?: string
          role?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      warehouse: {
        Row: {
          branch_id: string | null
          created_at: string | null
          is_active: boolean | null
          location: string | null
          name: string
          organization_id: string | null
          owner_id: string | null
          updated_at: string | null
          user_id: string | null
          warehouse_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          is_active?: boolean | null
          location?: string | null
          name: string
          organization_id?: string | null
          owner_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          warehouse_id?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          is_active?: boolean | null
          location?: string | null
          name?: string
          organization_id?: string | null
          owner_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "warehouse_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          event_data: Json
          event_type: string
          headers: Json | null
          processed: boolean | null
          processed_at: string | null
          processing_error: string | null
          provider: string
          retry_count: number | null
          webhook_log_id: string
        }
        Insert: {
          created_at?: string | null
          event_data: Json
          event_type: string
          headers?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          provider: string
          retry_count?: number | null
          webhook_log_id?: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json
          event_type?: string
          headers?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          provider?: string
          retry_count?: number | null
          webhook_log_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_inventory_alerts: {
        Args: { p_organization_id: string }
        Returns: {
          alert_id: string
          alert_type: string
          current_stock: number
          message: string
          min_stock: number
          product_id: string
          product_name: string
          severity: string
          warehouse_id: string
          warehouse_name: string
        }[]
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      generate_purchase_order_number: {
        Args: { org_id: string }
        Returns: string
      }
      get_available_stock: {
        Args: {
          p_organization_id: string
          p_product_id: string
          p_warehouse_id: string
        }
        Returns: number
      }
      get_jwt_org_id: { Args: never; Returns: string }
      get_or_create_current_usage: {
        Args: { org_id: string }
        Returns: {
          api_calls_count: number | null
          clients_count: number | null
          created_at: string | null
          orders_count: number | null
          organization_id: string
          period_end: string
          period_start: string
          products_count: number | null
          stock_movements_count: number | null
          storage_used_mb: number | null
          suppliers_count: number | null
          updated_at: string | null
          usage_id: string
          users_count: number | null
          warehouses_count: number | null
        }
        SetofOptions: {
          from: "*"
          to: "usage_tracking"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_order_organization_id: {
        Args: { p_order_id: string }
        Returns: string
      }
      get_payment_gateway_for_org: { Args: { org_id: string }; Returns: string }
      get_product_stock: {
        Args: { p_product_id: string; p_warehouse_id?: string }
        Returns: number
      }
      get_reserved_stock: {
        Args: {
          p_organization_id?: string
          p_product_id: string
          p_warehouse_id?: string
        }
        Returns: number
      }
      increment_usage: {
        Args: { counter_name: string; increment_by?: number; org_id: string }
        Returns: undefined
      }
      validate_webhook_signature: {
        Args: { payload: string; secret: string; signature: string }
        Returns: boolean
      }
    }
    Enums: {
      plan_type_enum: "basic" | "professional" | "enterprise"
      user_role_enum:
        | "super_admin"
        | "organization_admin"
        | "branch_manager"
        | "supervisor"
        | "employee"
        | "readonly"
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
      plan_type_enum: ["basic", "professional", "enterprise"],
      user_role_enum: [
        "super_admin",
        "organization_admin",
        "branch_manager",
        "supervisor",
        "employee",
        "readonly",
      ],
    },
  },
} as const
