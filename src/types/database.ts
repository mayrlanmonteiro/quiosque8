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
      tenants: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          user_id: string;
          name: string;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          name?: string;
          phone?: string | null;
          created_at?: string;
        };
      };
      tenant_members: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: "admin" | "gerente" | "operador";
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role: "admin" | "gerente" | "operador";
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          role?: "admin" | "gerente" | "operador";
          active?: boolean;
          created_at?: string;
        };
      };
      product_categories: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          tenant_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          sku: string | null;
          price: number;
          cost: number;
          active: boolean;
          low_stock_threshold: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          sku?: string | null;
          price: number;
          cost: number;
          active?: boolean;
          low_stock_threshold?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          category_id?: string | null;
          name?: string;
          description?: string | null;
          sku?: string | null;
          price?: number;
          cost?: number;
          active?: boolean;
          low_stock_threshold?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_images: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          path: string;
          is_cover: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id: string;
          path: string;
          is_cover?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          product_id?: string;
          path?: string;
          is_cover?: boolean;
          created_at?: string;
        };
      };
      product_variants: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          sku: string | null;
          price: number;
          cost: number;
          attributes: Json;
          active: boolean;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id: string;
          sku?: string | null;
          price: number;
          cost: number;
          attributes?: Json;
          active?: boolean;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          product_id?: string;
          sku?: string | null;
          price?: number;
          cost?: number;
          attributes?: Json;
          active?: boolean;
        };
      };
      inventory_balances: {
        Row: {
          tenant_id: string;
          product_id: string;
          variant_id: string | null;
          qty: number;
        };
        Insert: {
          tenant_id: string;
          product_id: string;
          variant_id?: string | null;
          qty?: number;
        };
        Update: {
          tenant_id?: string;
          product_id?: string;
          variant_id?: string | null;
          qty?: number;
        };
      };
      inventory_movements: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          variant_id: string | null;
          type: "entrada" | "saida" | "ajuste";
          qty: number;
          reason: string | null;
          reference_sale_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id: string;
          variant_id?: string | null;
          type: "entrada" | "saida" | "ajuste";
          qty: number;
          reason?: string | null;
          reference_sale_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          product_id?: string;
          variant_id?: string | null;
          type?: "entrada" | "saida" | "ajuste";
          qty?: number;
          reason?: string | null;
          reference_sale_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          city: string | null;
          state: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          state?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          state?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          tenant_id: string;
          customer_id: string | null;
          status: "pendente" | "pago" | "cancelado";
          subtotal: number;
          discount: number;
          total: number;
          paid_at: string | null;
          created_by: string | null;
          created_at: string;
          canceled_at: string | null;
          canceled_by: string | null;
          cancel_reason: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          customer_id?: string | null;
          status?: "pendente" | "pago" | "cancelado";
          subtotal: number;
          discount?: number;
          total: number;
          paid_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          canceled_at?: string | null;
          canceled_by?: string | null;
          cancel_reason?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          customer_id?: string | null;
          status?: "pendente" | "pago" | "cancelado";
          subtotal?: number;
          discount?: number;
          total?: number;
          paid_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          canceled_at?: string | null;
          canceled_by?: string | null;
          cancel_reason?: string | null;
        };
      };
      sale_items: {
        Row: {
          id: string;
          tenant_id: string;
          sale_id: string;
          product_id: string;
          variant_id: string | null;
          qty: number;
          price: number;
          discount: number;
          cost_snapshot: number;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          sale_id: string;
          product_id: string;
          variant_id?: string | null;
          qty: number;
          price: number;
          discount?: number;
          cost_snapshot: number;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          sale_id?: string;
          product_id?: string;
          variant_id?: string | null;
          qty?: number;
          price?: number;
          discount?: number;
          cost_snapshot?: number;
        };
      };
      payments: {
        Row: {
          id: string;
          tenant_id: string;
          sale_id: string;
          method: "dinheiro" | "pix" | "cartao" | "outros";
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          sale_id: string;
          method: "dinheiro" | "pix" | "cartao" | "outros";
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          sale_id?: string;
          method?: "dinheiro" | "pix" | "cartao" | "outros";
          amount?: number;
          created_at?: string;
        };
      };
      expense_categories: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          tenant_id: string;
          category_id: string | null;
          date: string;
          amount: number;
          description: string;
          payment_method: string | null;
          recurring: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          category_id?: string | null;
          date: string;
          amount: number;
          description: string;
          payment_method?: string | null;
          recurring?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          category_id?: string | null;
          date?: string;
          amount?: number;
          description?: string;
          payment_method?: string | null;
          recurring?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
      };
      tenant_settings: {
        Row: {
          tenant_id: string;
          allow_negative_stock: boolean;
          global_low_stock_threshold: number;
          store_name: string;
          store_phone: string | null;
          store_logo_path: string | null;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          allow_negative_stock?: boolean;
          global_low_stock_threshold?: number;
          store_name: string;
          store_phone?: string | null;
          store_logo_path?: string | null;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          allow_negative_stock?: boolean;
          global_low_stock_threshold?: number;
          store_name?: string;
          store_phone?: string | null;
          store_logo_path?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_sale: {
        Args: {
          p_tenant_id: string;
          p_customer_id: string | null;
          p_items: Json;
          p_payments: Json;
          p_discount: number;
          p_created_by: string;
        };
        Returns: string;
      };
      cancel_sale: {
        Args: {
          p_tenant_id: string;
          p_sale_id: string;
          p_reason: string;
          p_canceled_by: string;
        };
        Returns: boolean;
      };
      is_tenant_member: {
        Args: { p_tenant_id: string };
        Returns: boolean;
      };
      tenant_role: {
        Args: { p_tenant_id: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
}

// Tipos derivados para uso na aplicação
export type Tenant = Database["public"]["Tables"]["tenants"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type TenantMember = Database["public"]["Tables"]["tenant_members"]["Row"];
export type ProductCategory = Database["public"]["Tables"]["product_categories"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
export type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
export type InventoryBalance = Database["public"]["Tables"]["inventory_balances"]["Row"];
export type InventoryMovement = Database["public"]["Tables"]["inventory_movements"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Sale = Database["public"]["Tables"]["sales"]["Row"];
export type SaleItem = Database["public"]["Tables"]["sale_items"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type ExpenseCategory = Database["public"]["Tables"]["expense_categories"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type TenantSettings = Database["public"]["Tables"]["tenant_settings"]["Row"];

export type UserRole = "admin" | "gerente" | "operador";
export type SaleStatus = "pendente" | "pago" | "cancelado";
export type MovementType = "entrada" | "saida" | "ajuste";
export type PaymentMethod = "dinheiro" | "pix" | "cartao" | "outros";
