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

export type NotificationType =
  | "booking_created"
  | "booking_confirmed"
  | "booking_cancelled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
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
          contact_email: string | null;
          booking_token: string;
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
          contact_email?: string | null;
          booking_token?: string;
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
          contact_email?: string | null;
          booking_token?: string;
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
          user_id: string;
          role: BusinessRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role?: BusinessRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          role?: BusinessRole;
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
          sort_order: number;
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
          sort_order?: number;
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
          sort_order?: number;
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
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      business_role: BusinessRole;
      appointment_status: AppointmentStatus;
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
