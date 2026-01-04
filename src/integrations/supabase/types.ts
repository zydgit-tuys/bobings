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
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          end_date: string
          id: string
          notes: string | null
          period_name: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          notes?: string | null
          period_name: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          notes?: string | null
          period_name?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          sort_order: number
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          sort_order?: number
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "variant_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_holder: string | null
          account_id: string
          account_number: string | null
          bank_name: string
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_id: string
          account_number?: string | null
          bank_name: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_id?: string
          account_number?: string | null
          bank_name?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          level: number
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          level?: number
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payment_allocations: {
        Row: {
          allocated_amount: number
          created_at: string | null
          id: string
          payment_id: string
          sales_order_id: string
        }
        Insert: {
          allocated_amount: number
          created_at?: string | null
          id?: string
          payment_id: string
          sales_order_id: string
        }
        Update: {
          allocated_amount?: number
          created_at?: string | null
          id?: string
          payment_id?: string
          sales_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "customer_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_allocations_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          payment_no: string
          reference_no: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method: string
          payment_no: string
          reference_no?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_no?: string
          reference_no?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          code: string
          contact_person: string | null
          created_at: string | null
          customer_type: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          contact_person?: string | null
          created_at?: string | null
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string | null
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      journal_account_mappings: {
        Row: {
          account_id: string
          created_at: string
          event_context: string | null
          event_type: string
          id: string
          is_active: boolean
          marketplace_code: string | null
          priority: number
          product_type: string | null
          side: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          event_context?: string | null
          event_type: string
          id?: string
          is_active?: boolean
          marketplace_code?: string | null
          priority?: number
          product_type?: string | null
          side: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          event_context?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          marketplace_code?: string | null
          priority?: number
          product_type?: string | null
          side?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_account_mappings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          description: string
          entry_date: string
          id: string
          reference_id: string | null
          reference_type: string | null
          total_credit: number
          total_debit: number
        }
        Insert: {
          created_at?: string
          description: string
          entry_date?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          total_credit?: number
          total_debit?: number
        }
        Update: {
          created_at?: string
          description?: string
          entry_date?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          total_credit?: number
          total_debit?: number
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          entry_id: string
          id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id: string
          id?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_payouts: {
        Row: {
          created_at: string
          end_date: string
          id: string
          marketplace: string
          notes: string | null
          payout_no: string
          start_date: string
          status: string
          total_amount: number
          total_orders: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          marketplace: string
          notes?: string | null
          payout_no: string
          start_date: string
          status?: string
          total_amount?: number
          total_orders?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          marketplace?: string
          notes?: string | null
          payout_no?: string
          start_date?: string
          status?: string
          total_amount?: number
          total_orders?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          hpp: number
          id: string
          order_id: string
          product_name: string
          qty: number
          sku_master: string | null
          sku_variant: string | null
          subtotal: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          hpp?: number
          id?: string
          order_id: string
          product_name: string
          qty?: number
          sku_master?: string | null
          sku_variant?: string | null
          subtotal?: number
          unit_price?: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          hpp?: number
          id?: string
          order_id?: string
          product_name?: string
          qty?: number
          sku_master?: string | null
          sku_variant?: string | null
          subtotal?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          display_order: number
          file_size: number | null
          height: number | null
          id: string
          image_url: string
          is_primary: boolean | null
          product_id: string
          storage_path: string
          updated_at: string | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number
          file_size?: number | null
          height?: number | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          product_id: string
          storage_path: string
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number
          file_size?: number | null
          height?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          product_id?: string
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          cost_price: number | null
          created_by: string | null
          effective_date: string
          id: string
          price: number | null
          variant_id: string | null
        }
        Insert: {
          cost_price?: number | null
          created_by?: string | null
          effective_date?: string
          id?: string
          price?: number | null
          variant_id?: string | null
        }
        Update: {
          cost_price?: number | null
          created_by?: string | null
          effective_date?: string
          id?: string
          price?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_suppliers: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          is_preferred: boolean | null
          product_id: string | null
          purchase_price: number | null
          supplier_id: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          is_preferred?: boolean | null
          product_id?: string | null
          purchase_price?: number | null
          supplier_id?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          is_preferred?: boolean | null
          product_id?: string | null
          purchase_price?: number | null
          supplier_id?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_price_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          new_harga_jual_khusus: number | null
          new_harga_jual_umum: number | null
          new_hpp: number | null
          old_harga_jual_khusus: number | null
          old_harga_jual_umum: number | null
          old_hpp: number | null
          reason: string | null
          variant_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_harga_jual_khusus?: number | null
          new_harga_jual_umum?: number | null
          new_hpp?: number | null
          old_harga_jual_khusus?: number | null
          old_harga_jual_umum?: number | null
          old_hpp?: number | null
          reason?: string | null
          variant_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_harga_jual_khusus?: number | null
          new_harga_jual_umum?: number | null
          new_hpp?: number | null
          old_harga_jual_khusus?: number | null
          old_harga_jual_umum?: number | null
          old_hpp?: number | null
          reason?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_price_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          color_value_id: string | null
          created_at: string
          harga_jual_umum: number | null
          harga_khusus: number | null
          id: string
          initial_stock: number
          is_active: boolean
          min_stock_alert: number
          price: number
          product_id: string
          reserved_qty: number
          size_value_id: string | null
          sku_variant: string
          stock_qty: number
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          color_value_id?: string | null
          created_at?: string
          harga_jual_umum?: number | null
          harga_khusus?: number | null
          id?: string
          initial_stock?: number
          is_active?: boolean
          min_stock_alert?: number
          price?: number
          product_id: string
          reserved_qty?: number
          size_value_id?: string | null
          sku_variant: string
          stock_qty?: number
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          color_value_id?: string | null
          created_at?: string
          harga_jual_umum?: number | null
          harga_khusus?: number | null
          id?: string
          initial_stock?: number
          is_active?: boolean
          min_stock_alert?: number
          price?: number
          product_id?: string
          reserved_qty?: number
          size_value_id?: string | null
          sku_variant?: string
          stock_qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_color_value_id_fkey"
            columns: ["color_value_id"]
            isOneToOne: false
            referencedRelation: "attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_size_value_id_fkey"
            columns: ["size_value_id"]
            isOneToOne: false
            referencedRelation: "attribute_values"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          base_hpp: number
          base_price: number
          brand_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          id: string
          images: string[] | null
          is_active: boolean
          name: string
          product_type: Database["public"]["Enums"]["product_type"]
          sku_master: string
          sort_order: number
          unit_id: string | null
          updated_at: string
          virtual_stock: boolean
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          base_hpp?: number
          base_price?: number
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          name: string
          product_type?: Database["public"]["Enums"]["product_type"]
          sku_master: string
          sort_order?: number
          unit_id?: string | null
          updated_at?: string
          virtual_stock?: boolean
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          base_hpp?: number
          base_price?: number
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          name?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          sku_master?: string
          sort_order?: number
          unit_id?: string | null
          updated_at?: string
          virtual_stock?: boolean
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          purchase_id: string
          qty_ordered: number
          qty_received: number
          subtotal: number
          unit_cost: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          purchase_id: string
          qty_ordered?: number
          qty_received?: number
          subtotal?: number
          unit_cost?: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          purchase_id?: string
          qty_ordered?: number
          qty_received?: number
          subtotal?: number
          unit_cost?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_return_lines: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          purchase_line_id: string
          qty: number
          return_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          purchase_line_id: string
          qty: number
          return_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          purchase_line_id?: string
          qty?: number
          return_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_return_lines_purchase_line_id_fkey"
            columns: ["purchase_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_lines_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "purchase_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_returns: {
        Row: {
          created_at: string
          id: string
          purchase_id: string
          reason: string | null
          return_date: string
          return_no: string
          status: Database["public"]["Enums"]["purchase_return_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          purchase_id: string
          reason?: string | null
          return_date?: string
          return_no: string
          status?: Database["public"]["Enums"]["purchase_return_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          purchase_id?: string
          reason?: string | null
          return_date?: string
          return_no?: string
          status?: Database["public"]["Enums"]["purchase_return_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_returns_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          purchase_no: string
          received_date: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string
          total_amount: number
          total_qty: number
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          purchase_no: string
          received_date?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string
          total_amount?: number
          total_qty?: number
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          purchase_no?: string
          received_date?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string
          total_amount?: number
          total_qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_imports: {
        Row: {
          created_at: string
          filename: string
          id: string
          import_date: string
          skipped_count: number
          skipped_details: Json | null
          status: Database["public"]["Enums"]["import_status"]
          success_count: number
          total_orders: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          import_date?: string
          skipped_count?: number
          skipped_details?: Json | null
          status?: Database["public"]["Enums"]["import_status"]
          success_count?: number
          total_orders?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          import_date?: string
          skipped_count?: number
          skipped_details?: Json | null
          status?: Database["public"]["Enums"]["import_status"]
          success_count?: number
          total_orders?: number
          updated_at?: string
        }
        Relationships: []
      }
      sales_orders: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          desty_order_no: string
          discount_amount: number
          id: string
          import_id: string | null
          marketplace: string | null
          order_date: string
          payment_account_id: string | null
          payment_method: string | null
          payout_id: string | null
          profit: number
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          total_fees: number
          total_hpp: number
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          desty_order_no: string
          discount_amount?: number
          id?: string
          import_id?: string | null
          marketplace?: string | null
          order_date: string
          payment_account_id?: string | null
          payment_method?: string | null
          payout_id?: string | null
          profit?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          total_fees?: number
          total_hpp?: number
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          desty_order_no?: string
          discount_amount?: number
          id?: string
          import_id?: string | null
          marketplace?: string | null
          order_date?: string
          payment_account_id?: string | null
          payment_method?: string | null
          payout_id?: string | null
          profit?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          total_fees?: number
          total_hpp?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "sales_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "marketplace_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_return_lines: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          qty: number
          return_id: string | null
          sales_order_line_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          qty: number
          return_id?: string | null
          sales_order_line_id?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          qty?: number
          return_id?: string | null
          sales_order_line_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_return_lines_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "sales_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_lines_sales_order_line_id_fkey"
            columns: ["sales_order_line_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          return_date: string
          return_no: string
          sales_order_id: string | null
          status: string
          total_refund: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          return_date?: string
          return_no: string
          sales_order_id?: string | null
          status?: string
          total_refund?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          return_date?: string
          return_no?: string
          sales_order_id?: string | null
          status?: string
          total_refund?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_returns_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          allow_negative: boolean | null
          created_at: string
          id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          qty: number
          reference_id: string | null
          reference_type: string | null
          variant_id: string
        }
        Insert: {
          allow_negative?: boolean | null
          created_at?: string
          id?: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          qty: number
          reference_id?: string | null
          reference_type?: string | null
          variant_id: string
        }
        Update: {
          allow_negative?: boolean | null
          created_at?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          qty?: number
          reference_id?: string | null
          reference_type?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_opname: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          opname_date: string
          opname_no: string
          status: string
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          opname_date?: string
          opname_no: string
          status?: string
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          opname_date?: string
          opname_no?: string
          status?: string
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_opname_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_opname_lines: {
        Row: {
          created_at: string | null
          difference_qty: number | null
          id: string
          notes: string | null
          opname_id: string
          physical_qty: number
          system_qty: number
          unit_cost: number
          variant_id: string
        }
        Insert: {
          created_at?: string | null
          difference_qty?: number | null
          id?: string
          notes?: string | null
          opname_id: string
          physical_qty?: number
          system_qty?: number
          unit_cost?: number
          variant_id: string
        }
        Update: {
          created_at?: string | null
          difference_qty?: number | null
          id?: string
          notes?: string | null
          opname_id?: string
          physical_qty?: number
          system_qty?: number
          unit_cost?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_opname_lines_opname_id_fkey"
            columns: ["opname_id"]
            isOneToOne: false
            referencedRelation: "stock_opname"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_opname_lines_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          code: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          symbol: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          symbol?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          symbol?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      variant_attributes: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          address: string | null
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_inventory_atomic: {
        Args: { p_notes?: string; p_qty: number; p_variant_id: string }
        Returns: Json
      }
      check_and_update_purchase_status: {
        Args: { p_purchase_id: string }
        Returns: undefined
      }
      check_duplicate_order: {
        Args: { p_desty_order_no: string }
        Returns: boolean
      }
      confirm_marketplace_payout: {
        Args: { p_bank_account_id: string; p_payout_id: string }
        Returns: Json
      }
      confirm_purchase_order: { Args: { p_purchase_id: string }; Returns: Json }
      create_marketplace_payout: {
        Args: {
          p_end_date: string
          p_marketplace: string
          p_start_date: string
        }
        Returns: Json
      }
      generate_sales_order_no: { Args: never; Returns: string }
      get_current_period_status: {
        Args: never
        Returns: {
          end_date: string
          has_period: boolean
          is_open: boolean
          message: string
          period_name: string
          start_date: string
        }[]
      }
      get_inventory_alerts: {
        Args: never
        Returns: {
          color_name: string
          current_stock: number
          min_stock: number
          product_name: string
          size_name: string
          sku_variant: string
          variant_id: string
        }[]
      }
      get_trial_balance: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          account_code: string
          account_id: string
          account_name: string
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number
          total_credit: number
          total_debit: number
        }[]
      }
      receive_purchase_lines_atomic: {
        Args: { p_items: Json; p_purchase_id: string }
        Returns: Json
      }
    }
    Enums: {
      account_type:
        | "asset"
        | "liability"
        | "equity"
        | "revenue"
        | "expense"
        | "contra_revenue"
        | "other_income"
      import_status: "pending" | "processing" | "completed" | "failed"
      movement_type: "IN" | "OUT" | "ADJUSTMENT" | "RETURN" | "SALE"
      order_status: "pending" | "completed" | "cancelled" | "returned"
      product_type: "production" | "purchased" | "service"
      purchase_return_status: "draft" | "completed"
      purchase_status:
        | "draft"
        | "ordered"
        | "partial"
        | "received"
        | "completed"
        | "cancelled"
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
      account_type: [
        "asset",
        "liability",
        "equity",
        "revenue",
        "expense",
        "contra_revenue",
        "other_income",
      ],
      import_status: ["pending", "processing", "completed", "failed"],
      movement_type: ["IN", "OUT", "ADJUSTMENT", "RETURN", "SALE"],
      order_status: ["pending", "completed", "cancelled", "returned"],
      product_type: ["production", "purchased", "service"],
      purchase_return_status: ["draft", "completed"],
      purchase_status: [
        "draft",
        "ordered",
        "partial",
        "received",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
