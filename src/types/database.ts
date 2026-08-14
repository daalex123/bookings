export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BusinessRole = "owner" | "admin" | "staff";
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type JobStatus = "queued" | "in_progress" | "completed" | "cancelled";
export type JobEventVisibility = "public" | "internal";
export type InvoiceStatus = "draft" | "issued" | "paid" | "void";
export type InvoicePaymentMethod =
  | "cash"
  | "card"
  | "bank_transfer"
  | "other";

export type JobChecklistItemType = "status" | "text" | "number";

export type NotificationType =
  | "booking_created"
  | "booking_confirmed"
  | "booking_cancelled";

export type NotificationAudience = "staff" | "customer";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          date_of_birth: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          date_of_birth?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          date_of_birth?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      businesses: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          tagline: string | null;
          timezone: string;
          currency: string;
          logo_url: string | null;
          cover_image_url: string | null;
          brand_color: string;
          background_color: string;
          admin_background_color: string;
          contact_email: string | null;
          contact_whatsapp: string | null;
          booking_token: string;
          next_invoice_number: number;
          next_job_number: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          tagline?: string | null;
          timezone?: string;
          currency?: string;
          logo_url?: string | null;
          cover_image_url?: string | null;
          brand_color?: string;
          background_color?: string;
          admin_background_color?: string;
          contact_email?: string | null;
          contact_whatsapp?: string | null;
          booking_token?: string;
          next_invoice_number?: number;
          next_job_number?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          tagline?: string | null;
          timezone?: string;
          currency?: string;
          logo_url?: string | null;
          cover_image_url?: string | null;
          brand_color?: string;
          background_color?: string;
          admin_background_color?: string;
          contact_email?: string | null;
          contact_whatsapp?: string | null;
          booking_token?: string;
          next_invoice_number?: number;
          next_job_number?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      super_admins: {
        Row: {
          user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          appointment_id: string | null;
          type: NotificationType;
          audience: NotificationAudience;
          title: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_id: string;
          appointment_id?: string | null;
          type?: NotificationType;
          audience?: NotificationAudience;
          title: string;
          body: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_id?: string;
          appointment_id?: string | null;
          type?: NotificationType;
          audience?: NotificationAudience;
          title?: string;
          body?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string | null;
          role: BusinessRole;
          staff_name: string | null;
          staff_phone: string | null;
          staff_email: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id?: string | null;
          role?: BusinessRole;
          staff_name?: string | null;
          staff_phone?: string | null;
          staff_email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string | null;
          role?: BusinessRole;
          staff_name?: string | null;
          staff_phone?: string | null;
          staff_email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          business_id: string;
          parent_service_id: string | null;
          name: string;
          description: string | null;
          duration_minutes: number;
          slot_interval_minutes: number;
          price: number;
          image_url: string | null;
          is_active: boolean;
          show_price: boolean;
          sort_order: number;
          default_checklist_template_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          parent_service_id?: string | null;
          name: string;
          description?: string | null;
          duration_minutes: number;
          slot_interval_minutes?: number;
          price?: number;
          image_url?: string | null;
          is_active?: boolean;
          show_price?: boolean;
          sort_order?: number;
          default_checklist_template_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          parent_service_id?: string | null;
          name?: string;
          description?: string | null;
          duration_minutes?: number;
          slot_interval_minutes?: number;
          price?: number;
          image_url?: string | null;
          is_active?: boolean;
          show_price?: boolean;
          sort_order?: number;
          default_checklist_template_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_extra_links: {
        Row: {
          parent_service_id: string;
          child_service_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          parent_service_id: string;
          child_service_id: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          parent_service_id?: string;
          child_service_id?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      appointment_addons: {
        Row: {
          id: string;
          appointment_id: string;
          service_id: string;
          price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          service_id: string;
          price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          service_id?: string;
          price?: number;
          created_at?: string;
        };
      };
      business_hours: {
        Row: {
          id: string;
          business_id: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
          is_closed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
          is_closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          day_of_week?: number;
          open_time?: string;
          close_time?: string;
          is_closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          business_id: string;
          service_id: string;
          customer_id: string;
          start_at: string;
          end_at: string;
          status: AppointmentStatus;
          notes: string | null;
          service_price: number;
          service_cost_price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          service_id: string;
          customer_id: string;
          start_at: string;
          end_at: string;
          status?: AppointmentStatus;
          notes?: string | null;
          service_price?: number;
          service_cost_price?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          service_id?: string;
          customer_id?: string;
          start_at?: string;
          end_at?: string;
          status?: AppointmentStatus;
          notes?: string | null;
          service_price?: number;
          service_cost_price?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          business_id: string;
          appointment_id: string;
          customer_id: string;
          status: JobStatus;
          assigned_member_id: string | null;
          public_notes: string | null;
          internal_notes: string | null;
          started_at: string | null;
          completed_at: string | null;
          job_number: string | null;
          next_service_id: string | null;
          next_service_name: string | null;
          next_service_due_on: string | null;
          next_service_notes: string | null;
          next_service_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          appointment_id: string;
          customer_id: string;
          status?: JobStatus;
          assigned_member_id?: string | null;
          public_notes?: string | null;
          internal_notes?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          job_number?: string | null;
          next_service_id?: string | null;
          next_service_name?: string | null;
          next_service_due_on?: string | null;
          next_service_notes?: string | null;
          next_service_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          appointment_id?: string;
          customer_id?: string;
          status?: JobStatus;
          assigned_member_id?: string | null;
          public_notes?: string | null;
          internal_notes?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          job_number?: string | null;
          next_service_id?: string | null;
          next_service_name?: string | null;
          next_service_due_on?: string | null;
          next_service_notes?: string | null;
          next_service_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_checklist_templates: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          status_options: Json;
          header_fields: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          status_options?: Json;
          header_fields?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          status_options?: Json;
          header_fields?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_checklist_template_sections: {
        Row: {
          id: string;
          template_id: string;
          title: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          template_id: string;
          title: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          template_id?: string;
          title?: string;
          sort_order?: number;
        };
      };
      job_checklist_template_items: {
        Row: {
          id: string;
          section_id: string;
          label: string;
          sort_order: number;
          item_type: JobChecklistItemType;
        };
        Insert: {
          id?: string;
          section_id: string;
          label: string;
          sort_order?: number;
          item_type?: JobChecklistItemType;
        };
        Update: {
          id?: string;
          section_id?: string;
          label?: string;
          sort_order?: number;
          item_type?: JobChecklistItemType;
        };
      };
      checklist_item_presets: {
        Row: {
          id: string;
          business_id: string;
          label: string;
          item_type: JobChecklistItemType;
          use_count: number;
          last_used_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          label: string;
          item_type?: JobChecklistItemType;
          use_count?: number;
          last_used_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          label?: string;
          item_type?: JobChecklistItemType;
          use_count?: number;
          last_used_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_checklists: {
        Row: {
          id: string;
          job_id: string;
          business_id: string;
          template_id: string | null;
          title: string;
          status_options: Json;
          header_fields: Json;
          header_values: Json;
          comments: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          business_id: string;
          template_id?: string | null;
          title: string;
          status_options?: Json;
          header_fields?: Json;
          header_values?: Json;
          comments?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          business_id?: string;
          template_id?: string | null;
          title?: string;
          status_options?: Json;
          header_fields?: Json;
          header_values?: Json;
          comments?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_checklist_responses: {
        Row: {
          id: string;
          checklist_id: string;
          section_title: string;
          label: string;
          sort_order: number;
          item_type: JobChecklistItemType;
          value: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          checklist_id: string;
          section_title: string;
          label: string;
          sort_order?: number;
          item_type?: JobChecklistItemType;
          value?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          checklist_id?: string;
          section_title?: string;
          label?: string;
          sort_order?: number;
          item_type?: JobChecklistItemType;
          value?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_events: {
        Row: {
          id: string;
          job_id: string;
          business_id: string;
          actor_user_id: string | null;
          event_type: string;
          message: string;
          visibility: JobEventVisibility;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          business_id: string;
          actor_user_id?: string | null;
          event_type: string;
          message: string;
          visibility?: JobEventVisibility;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          business_id?: string;
          actor_user_id?: string | null;
          event_type?: string;
          message?: string;
          visibility?: JobEventVisibility;
          metadata?: Json;
          created_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          appointment_id: string | null;
          job_id: string | null;
          invoice_number: string | null;
          status: InvoiceStatus;
          currency: string;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total: number;
          amount_paid: number;
          notes: string | null;
          issued_at: string | null;
          due_at: string | null;
          paid_at: string | null;
          payment_provider: string | null;
          external_payment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          appointment_id?: string | null;
          job_id?: string | null;
          invoice_number?: string | null;
          status?: InvoiceStatus;
          currency?: string;
          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total?: number;
          amount_paid?: number;
          notes?: string | null;
          issued_at?: string | null;
          due_at?: string | null;
          paid_at?: string | null;
          payment_provider?: string | null;
          external_payment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string;
          appointment_id?: string | null;
          job_id?: string | null;
          invoice_number?: string | null;
          status?: InvoiceStatus;
          currency?: string;
          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total?: number;
          amount_paid?: number;
          notes?: string | null;
          issued_at?: string | null;
          due_at?: string | null;
          paid_at?: string | null;
          payment_provider?: string | null;
          external_payment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          service_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          cost_price: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          service_id?: string | null;
          description: string;
          quantity?: number;
          unit_price?: number;
          cost_price?: number;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          service_id?: string | null;
          description?: string;
          quantity?: number;
          unit_price?: number;
          cost_price?: number;
          sort_order?: number;
          created_at?: string;
        };
      };
      invoice_line_presets: {
        Row: {
          id: string;
          business_id: string;
          description: string;
          unit_price: number;
          cost_price: number;
          service_id: string | null;
          use_count: number;
          last_used_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          description: string;
          unit_price?: number;
          cost_price?: number;
          service_id?: string | null;
          use_count?: number;
          last_used_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          description?: string;
          unit_price?: number;
          cost_price?: number;
          service_id?: string | null;
          use_count?: number;
          last_used_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoice_payments: {
        Row: {
          id: string;
          invoice_id: string;
          amount: number;
          method: InvoicePaymentMethod;
          paid_at: string;
          note: string | null;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          amount: number;
          method?: InvoicePaymentMethod;
          paid_at?: string;
          note?: string | null;
          recorded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          amount?: number;
          method?: InvoicePaymentMethod;
          paid_at?: string;
          note?: string | null;
          recorded_by?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      business_role: BusinessRole;
      appointment_status: AppointmentStatus;
      job_status: JobStatus;
      job_event_visibility: JobEventVisibility;
      invoice_status: InvoiceStatus;
      invoice_payment_method: InvoicePaymentMethod;
      job_checklist_item_type: JobChecklistItemType;
      notification_type: NotificationType;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type BusinessMember =
  Database["public"]["Tables"]["business_members"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type BusinessHour =
  Database["public"]["Tables"]["business_hours"]["Row"];
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type JobEvent = Database["public"]["Tables"]["job_events"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceItem = Database["public"]["Tables"]["invoice_items"]["Row"];
export type InvoicePayment =
  Database["public"]["Tables"]["invoice_payments"]["Row"];
export type JobChecklistTemplate =
  Database["public"]["Tables"]["job_checklist_templates"]["Row"];
export type JobChecklist =
  Database["public"]["Tables"]["job_checklists"]["Row"];
export type JobChecklistResponse =
  Database["public"]["Tables"]["job_checklist_responses"]["Row"];
