import { z } from "zod";
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";

export const phoneSchema = z
  .string()
  .min(1, "Mobile number is required")
  .transform(normalizePhone)
  .refine(
    (value) => /^\+?[0-9]{8,15}$/.test(value),
    "Enter a valid mobile number (8–15 digits)"
  );

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  phone: phoneSchema,
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const optionalUrl = z.union([z.string().url(), z.literal("")]).optional();

export const businessSchema = z.object({
  name: z.string().min(2, "Business name is required"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  tagline: z.string().max(120).optional(),
  timezone: z.string().min(1).default(DEFAULT_TIMEZONE),
  currency: z.string().length(3).default(DEFAULT_CURRENCY),
  logo_url: optionalUrl,
  cover_image_url: optionalUrl,
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex color like #f5c518")
    .optional(),
  contact_email: z
    .string()
    .trim()
    .email("Enter a valid business email")
    .or(z.literal(""))
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  contact_whatsapp: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const normalized = normalizePhone(value);
      return normalized === "" ? undefined : normalized;
    })
    .refine(
      (value) => !value || /^\+?[0-9]{8,15}$/.test(value),
      "Enter a valid WhatsApp number (8–15 digits)"
    ),
});

export const serviceSchema = z.object({
  name: z.string().min(2, "Service name is required"),
  description: z.string().optional(),
  duration_minutes: z.coerce.number().int().min(5).max(480),
  slot_interval_minutes: z.coerce.number().int().min(5).max(480).optional(),
  price: z.coerce.number().min(0),
  image_url: optionalUrl,
  is_active: z.boolean().optional(),
  parent_service_id: z.string().uuid().optional().or(z.literal("")),
});

export const serviceAddonSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  image_url: optionalUrl,
  is_active: z.boolean().optional(),
  parent_service_id: z.string().uuid("Select a primary service"),
});

export const profileSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  phone: phoneSchema,
});

export const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().min(1),
  time: z.string().min(1),
  notes: z.string().optional(),
});

const appointmentStatusSchema = z.enum([
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export const adminAppointmentSchema = z
  .object({
    id: z.string().uuid().optional(),
    service_id: z.string().uuid("Select a service"),
    date: z.string().min(1, "Date is required"),
    time: z.string().min(1, "Time is required"),
    status: appointmentStatusSchema.default("confirmed"),
    notes: z.string().optional(),
    customer_id: z.string().uuid().optional().or(z.literal("")),
    customer_email: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.id) return;

    if (data.customer_id) return;

    const email = data.customer_email?.trim() ?? "";
    if (!email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a customer or enter their email",
        path: ["customer_email"],
      });
      return;
    }

    if (!z.string().email().safeParse(email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid customer email",
        path: ["customer_email"],
      });
    }
  });
