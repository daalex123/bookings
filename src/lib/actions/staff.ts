"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BusinessRole } from "@/types/database";

/** Add a staff member by name/phone (no account required) */
export async function addStaffMember(
    businessId: string,
    name: string,
    phone: string,
    role: BusinessRole
): Promise<{ error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase.from("business_members").insert({
        business_id: businessId,
        user_id: null,
        staff_name: name,
        staff_phone: phone || null,
        role,
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/${businessId}/staff`);
    return {};
}

/** Link a registered user by email */
export async function inviteStaffMember(
    businessId: string,
    email: string,
    role: BusinessRole
): Promise<{ error?: string }> {
    const supabase = await createClient();

    // Look up user by email via profiles joined with auth
    // Since we can't query auth.users directly from client, search profiles by phone or name won't work.
    // We'll use the admin approach: look for a profile whose auth user has this email.
    // For now, use a custom RPC or a workaround: query the business_members view.
    // Simplest approach: use supabase admin to list users by email
    const { data: users, error: lookupErr } = await supabase.rpc(
        "get_user_id_by_email",
        { p_email: email }
    );

    const userId = Array.isArray(users) ? users[0]?.id : users?.id ?? users;

    if (!userId || lookupErr) {
        return { error: "No registered user found with that email address" };
    }

    // Check if already a member
    const { data: existing } = await supabase
        .from("business_members")
        .select("id")
        .eq("business_id", businessId)
        .eq("user_id", userId)
        .single();

    if (existing) {
        return { error: "This user is already a member of this business" };
    }

    const { error } = await supabase.from("business_members").insert({
        business_id: businessId,
        user_id: userId,
        role,
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/${businessId}/staff`);
    return {};
}

export async function updateStaffRole(
    businessId: string,
    memberId: string,
    newRole: BusinessRole
): Promise<{ error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("business_members")
        .update({ role: newRole })
        .eq("id", memberId)
        .eq("business_id", businessId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/${businessId}/staff`);
    return {};
}

/** Update staff name/phone */
export async function updateStaffMember(
    businessId: string,
    memberId: string,
    data: {
      staff_name?: string;
      staff_phone?: string;
      role?: BusinessRole;
      avatar_url?: string | null;
    }
): Promise<{ error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("business_members")
        .update(data)
        .eq("id", memberId)
        .eq("business_id", businessId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/${businessId}/staff`);
    return {};
}

/** Set assigned services for a staff member (replaces all) */
export async function assignStaffServices(
    businessId: string,
    memberId: string,
    serviceIds: string[]
): Promise<{ error?: string }> {
    const supabase = await createClient();

    // Delete existing assignments
    const { error: delErr } = await supabase
        .from("staff_services")
        .delete()
        .eq("member_id", memberId);

    if (delErr) {
        return { error: delErr.message };
    }

    // Insert new assignments
    if (serviceIds.length > 0) {
        const rows = serviceIds.map((sid) => ({
            member_id: memberId,
            service_id: sid,
        }));
        const { error: insErr } = await supabase
            .from("staff_services")
            .insert(rows);

        if (insErr) {
            return { error: insErr.message };
        }
    }

    revalidatePath(`/dashboard/${businessId}/staff`);
    return {};
}

export async function removeStaffMember(
    businessId: string,
    memberId: string
): Promise<{ error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("business_members")
        .delete()
        .eq("id", memberId)
        .eq("business_id", businessId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/${businessId}/staff`);
    return {};
}
