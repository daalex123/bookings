"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import {
  businessSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  serviceSchema,
  adminAppointmentSchema,
} from "@/lib/validations";
import { slotToTimestamps } from "@/lib/availability";
import { safeRedirectPath } from "@/lib/business-context";
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@/lib/constants";
import { getPublicBusiness } from "@/lib/booking-data";
import { sendBookingNotifications } from "@/lib/notifications/send-booking-notifications";
import { notifyCustomerAppointmentStatus } from "@/lib/notifications/customer-status";
import { getSiteUrl } from "@/lib/site-url";

export async function signIn(formData: FormData): Promise<void> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const redirectTo = safeRedirectPath(formData.get("redirect")?.toString());
  const loginUrl = `/login?redirect=${encodeURIComponent(redirectTo)}`;

  if (!parsed.success) {
    redirect(
      `${loginUrl}&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid credentials")}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    const message =
      error.message === "Invalid login credentials"
        ? "Invalid email or password. Register first, or confirm your email if you just signed up."
        : error.message;
    redirect(`${loginUrl}&error=${encodeURIComponent(message)}`);
  }

  redirect(safeRedirectPath(redirectTo));
}

export async function signUp(formData: FormData): Promise<void> {
  const redirectTo = safeRedirectPath(formData.get("redirect")?.toString());
  const registerBase =
    redirectTo !== "/"
      ? `/register?redirect=${encodeURIComponent(redirectTo)}`
      : "/register";

  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const sep = registerBase.includes("?") ? "&" : "?";
    redirect(
      `${registerBase}${sep}error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid registration")}`
    );
  }

  const siteUrl = await getSiteUrl();
  const loginAfterRegister = `/login?registered=1&redirect=${encodeURIComponent(redirectTo)}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
      },
      emailRedirectTo: `${siteUrl}${loginAfterRegister}`,
    },
  });

  if (error) {
    const sep = registerBase.includes("?") ? "&" : "?";
    redirect(`${registerBase}${sep}error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
      })
      .eq("id", data.user.id);
  }

  // No session = email confirmation required
  if (data.user && !data.session) {
    redirect(
      `/login?confirmEmail=1&redirect=${encodeURIComponent(redirectTo)}`
    );
  }

  redirect(loginAfterRegister);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { form: ["Not authenticated"] } };

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) return { error: { form: [error.message] } };

  revalidatePath("/account");
  return { success: true };
}

export async function createBusiness(formData: FormData) {
  const parsed = businessSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") || slugify(formData.get("name")?.toString() || ""),
    description: formData.get("description") || undefined,
    timezone: formData.get("timezone") || DEFAULT_TIMEZONE,
    currency: formData.get("currency") || DEFAULT_CURRENCY,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid business data",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: businessId, error: bizError } = await supabase.rpc(
    "create_business_with_owner",
    {
      p_name: parsed.data.name,
      p_slug: parsed.data.slug,
      p_description: parsed.data.description ?? null,
      p_timezone: parsed.data.timezone,
      p_currency: parsed.data.currency,
    }
  );

  if (bizError) return { error: bizError.message };
  if (!businessId) return { error: "Failed to create business" };

  revalidatePath("/dashboard");
  return { businessId: businessId as string };
}

export async function updateBusiness(businessId: string, formData: FormData) {
  const parsed = businessSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    tagline: formData.get("tagline") || undefined,
    timezone: formData.get("timezone"),
    currency: formData.get("currency"),
    logo_url: formData.get("logo_url")?.toString() || "",
    cover_image_url: formData.get("cover_image_url")?.toString() || "",
    brand_color: formData.get("brand_color")?.toString() || "#f5c518",
    contact_email: formData.get("contact_email")?.toString() || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description ?? null,
      tagline: parsed.data.tagline ?? null,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
      logo_url: parsed.data.logo_url || null,
      cover_image_url: parsed.data.cover_image_url || null,
      brand_color: parsed.data.brand_color ?? "#f5c518",
      contact_email: parsed.data.contact_email ?? null,
    })
    .eq("id", businessId);

  if (error) return { error: { form: [error.message] } };

  revalidatePath(`/dashboard/${businessId}/settings`);
  revalidatePath(`/b/${parsed.data.slug}`);
  revalidatePath(`/b/${parsed.data.slug}/book`);
  return { success: true };
}

export async function regenerateBookingToken(businessId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerate_booking_token", {
    p_business_id: businessId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/${businessId}/settings`);
  return { token: data as string };
}

export async function upsertService(businessId: string, formData: FormData) {
  const durationRaw = formData.get("duration_minutes");
  const intervalRaw = formData.get("slot_interval_minutes");

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    duration_minutes: durationRaw,
    slot_interval_minutes:
      intervalRaw != null && intervalRaw !== ""
        ? intervalRaw
        : durationRaw,
    price: formData.get("price"),
    image_url: formData.get("image_url")?.toString() || "",
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const serviceId = formData.get("id")?.toString();

  const payload = {
    ...parsed.data,
    slot_interval_minutes:
      parsed.data.slot_interval_minutes ?? parsed.data.duration_minutes,
    image_url: parsed.data.image_url || null,
  };

  if (serviceId) {
    const { error } = await supabase
      .from("services")
      .update(payload)
      .eq("id", serviceId)
      .eq("business_id", businessId);
    if (error) return { error: { form: [error.message] } };
  } else {
    const { error } = await supabase.from("services").insert({
      ...payload,
      business_id: businessId,
    });
    if (error) return { error: { form: [error.message] } };
  }

  revalidatePath(`/dashboard/${businessId}/services`);
  return { success: true };
}

export async function deleteService(businessId: string, serviceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId)
    .eq("business_id", businessId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/${businessId}/services`);
  return { success: true };
}

export async function updateBusinessHours(
  businessId: string,
  formData: FormData
) {
  const supabase = await createClient();

  for (let day = 0; day <= 6; day++) {
    const isClosed = formData.get(`closed_${day}`) === "on";
    const open = formData.get(`open_${day}`)?.toString() || "09:00";
    const close = formData.get(`close_${day}`)?.toString() || "17:00";

    const { error } = await supabase.from("business_hours").upsert(
      {
        business_id: businessId,
        day_of_week: day,
        open_time: `${open}:00`,
        close_time: `${close}:00`,
        is_closed: isClosed,
      },
      { onConflict: "business_id,day_of_week" }
    );

    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboard/${businessId}/settings`);
  return { success: true };
}

export async function createAppointment(
  bookingToken: string,
  formData: FormData
) {
  const serviceId = formData.get("serviceId")?.toString();
  const dateStr = formData.get("date")?.toString();
  const time = formData.get("time")?.toString();
  const notes = formData.get("notes")?.toString();

  if (!serviceId || !dateStr || !time) {
    return { error: "Missing booking details" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getPublicBusiness(bookingToken);
  if (!ctx) return { error: "Invalid booking link" };

  const service = ctx.services.find((s) => s.id === serviceId);
  if (!service) return { error: "Service not found" };

  const { start_at, end_at } = slotToTimestamps(
    dateStr,
    time,
    service.duration_minutes,
    ctx.business.timezone
  );

  const { data, error } = await supabase.rpc("create_public_appointment", {
    p_ref: bookingToken,
    p_service_id: serviceId,
    p_start_at: start_at,
    p_end_at: end_at,
    p_notes: notes || null,
  });

  if (error) return { error: error.message };

  const result = data as { success?: boolean; error?: string; id?: string } | null;
  if (result?.error) return { error: result.error };

  if (result?.id) {
    try {
      await sendBookingNotifications(result.id);
    } catch (err) {
      console.error("[notifications] Failed to send booking notifications", err);
    }
  }

  revalidatePath("/my-appointments");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: string,
  businessId: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status: status as "pending" | "confirmed" | "cancelled" | "completed" | "no_show" })
    .eq("id", appointmentId);

  if (error) return { error: error.message };

  try {
    await notifyCustomerAppointmentStatus(appointmentId, status);
  } catch (err) {
    console.error("[notifications] Customer status notification failed", err);
  }

  revalidatePath(`/dashboard/${businessId}/appointments`);
  revalidatePath("/my-appointments");
  return { success: true };
}

type RpcResult = { success?: boolean; error?: string; id?: string } | null;

export async function upsertAdminAppointment(
  businessId: string,
  formData: FormData
) {
  const parsed = adminAppointmentSchema.safeParse({
    id: formData.get("id")?.toString() || undefined,
    service_id: formData.get("service_id"),
    date: formData.get("date"),
    time: formData.get("time"),
    status: formData.get("status") || "confirmed",
    notes: formData.get("notes")?.toString() || undefined,
    customer_id: formData.get("customer_id")?.toString() || "",
    customer_email: formData.get("customer_email")?.toString() || "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid appointment data",
    };
  }

  const supabase = await createClient();

  const [{ data: service }, { data: business }] = await Promise.all([
    supabase
      .from("services")
      .select("duration_minutes")
      .eq("id", parsed.data.service_id)
      .eq("business_id", businessId)
      .single(),
    supabase
      .from("businesses")
      .select("timezone")
      .eq("id", businessId)
      .single(),
  ]);

  if (!service) return { error: "Service not found" };

  const timezone = business?.timezone ?? DEFAULT_TIMEZONE;

  const { start_at, end_at } = slotToTimestamps(
    parsed.data.date,
    parsed.data.time,
    service.duration_minutes,
    timezone
  );

  const notes = parsed.data.notes ?? null;
  const status = parsed.data.status;

  if (parsed.data.id) {
    const { data, error } = await supabase.rpc("admin_update_appointment", {
      p_business_id: businessId,
      p_appointment_id: parsed.data.id,
      p_service_id: parsed.data.service_id,
      p_start_at: start_at,
      p_end_at: end_at,
      p_notes: notes,
      p_status: status,
    });

    if (error) return { error: error.message };
    const result = data as RpcResult;
    if (result?.error) return { error: result.error };
  } else {
    const { data, error } = await supabase.rpc("admin_create_appointment", {
      p_business_id: businessId,
      p_service_id: parsed.data.service_id,
      p_start_at: start_at,
      p_end_at: end_at,
      p_customer_id: parsed.data.customer_id || null,
      p_customer_email: parsed.data.customer_email || null,
      p_notes: notes,
      p_status: status,
    });

    if (error) return { error: error.message };
    const result = data as RpcResult;
    if (result?.error) return { error: result.error };

    if (result?.id) {
      void sendBookingNotifications(result.id).catch((err) => {
        console.error("[notifications] Failed to send booking notifications", err);
      });
    }
  }

  revalidatePath(`/dashboard/${businessId}/appointments`);
  revalidatePath("/my-appointments");
  return { success: true };
}

export async function deleteAdminAppointment(
  businessId: string,
  appointmentId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_appointment", {
    p_business_id: businessId,
    p_appointment_id: appointmentId,
  });

  if (error) return { error: error.message };
  const result = data as RpcResult;
  if (result?.error) return { error: result.error };

  revalidatePath(`/dashboard/${businessId}/appointments`);
  revalidatePath("/my-appointments");
  return { success: true };
}

export async function cancelMyAppointment(appointmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .eq("customer_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/my-appointments");
  return { success: true };
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/dashboard");
}
