"use client";

import { useState, useTransition } from "react";
import { UserCog, Trash2, Plus, Loader2, Pencil, X, Check } from "lucide-react";
import { ProfileImageUpload } from "@/components/account/profile-image-upload";
import { UserAvatar } from "@/components/account/user-avatar";
import { cn } from "@/lib/utils";
import type { BusinessRole } from "@/types/database";
import {
    addStaffMember,
    inviteStaffMember,
    removeStaffMember,
    updateStaffMember,
    assignStaffServices,
} from "@/lib/actions/staff";

interface StaffMember {
    id: string;
    role: BusinessRole;
    created_at: string;
    staff_name?: string | null;
    staff_phone?: string | null;
    avatar_url?: string | null;
    profiles: {
        id: string;
        full_name: string | null;
        phone: string | null;
        avatar_url?: string | null;
    }[] | {
        id: string;
        full_name: string | null;
        phone: string | null;
        avatar_url?: string | null;
    } | null;
}

interface Service {
    id: string;
    name: string;
}

export function StaffList({
    businessId,
    members,
    services,
    staffServicesMap,
}: {
    businessId: string;
    members: StaffMember[];
    services: Service[];
    staffServicesMap: Record<string, string[]>;
}) {
    const [showAdd, setShowAdd] = useState(false);
    const [addMode, setAddMode] = useState<"manual" | "email">("manual");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<BusinessRole>("staff");
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editRole, setEditRole] = useState<BusinessRole>("staff");

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        startTransition(async () => {
            let result: { error?: string };
            if (addMode === "manual") {
                result = await addStaffMember(businessId, name, phone, inviteRole);
            } else {
                result = await inviteStaffMember(businessId, email, inviteRole);
            }
            if (result.error) {
                setError(result.error);
            } else {
                setSuccess("Staff member added successfully");
                setName("");
                setPhone("");
                setEmail("");
                setShowAdd(false);
            }
        });
    }

    function startEdit(member: StaffMember) {
        const raw = member.profiles;
        const profile = Array.isArray(raw) ? raw[0] : raw;
        setEditingId(member.id);
        setEditName(member.staff_name || profile?.full_name || "");
        setEditPhone(member.staff_phone || profile?.phone || "");
        setEditRole(member.role);
    }

    function handleUpdate(memberId: string) {
        startTransition(async () => {
            await updateStaffMember(businessId, memberId, {
                staff_name: editName,
                staff_phone: editPhone || undefined,
                role: editRole,
            });
            setEditingId(null);
        });
    }

    function handleRemove(memberId: string) {
        if (!confirm("Are you sure you want to remove this team member?")) return;
        startTransition(async () => {
            await removeStaffMember(businessId, memberId);
        });
    }

    const roleColors: Record<BusinessRole, string> = {
        owner: "bg-amber-100 text-amber-800",
        admin: "bg-blue-100 text-blue-800",
        staff: "bg-green-100 text-green-800",
    };

    function handleServiceToggle(memberId: string, serviceId: string, currentServices: string[]) {
        const updated = currentServices.includes(serviceId)
            ? currentServices.filter((s) => s !== serviceId)
            : [...currentServices, serviceId];
        startTransition(async () => {
            await assignStaffServices(businessId, memberId, updated);
        });
    }

    return (
        <div className="space-y-4">
            {/* Add button */}
            <div className="flex justify-end">
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center gap-2 rounded-full bg-booking-accent px-4 py-2.5 text-sm font-medium text-booking-accent-fg transition hover:brightness-110"
                >
                    <Plus className="h-4 w-4" />
                    Add staff member
                </button>
            </div>

            {/* Add form */}
            {showAdd && (
                <form onSubmit={handleSubmit} className="admin-card p-5 space-y-4">
                    <h3 className="font-semibold text-[#1e2235]">Add a team member</h3>

                    {/* Mode toggle */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setAddMode("manual")}
                            className={cn(
                                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                                addMode === "manual"
                                    ? "bg-booking-accent text-booking-accent-fg"
                                    : "bg-[#f0f2f5] text-[#8b92a5] hover:text-[#1e2235]"
                            )}
                        >
                            By name & phone
                        </button>
                        <button
                            type="button"
                            onClick={() => setAddMode("email")}
                            className={cn(
                                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                                addMode === "email"
                                    ? "bg-booking-accent text-booking-accent-fg"
                                    : "bg-[#f0f2f5] text-[#8b92a5] hover:text-[#1e2235]"
                            )}
                        >
                            Link existing account
                        </button>
                    </div>

                    {addMode === "manual" ? (
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Full name"
                                className="flex-1 rounded-xl border border-[#1e2235]/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#1e2235]/30"
                            />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Phone (optional)"
                                className="rounded-xl border border-[#1e2235]/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#1e2235]/30 sm:w-44"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="team@example.com"
                                className="flex-1 rounded-xl border border-[#1e2235]/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#1e2235]/30"
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as BusinessRole)}
                            className="rounded-xl border border-[#1e2235]/10 bg-white px-4 py-2.5 text-sm outline-none"
                        >
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex items-center justify-center gap-2 rounded-xl bg-booking-accent px-5 py-2.5 text-sm font-medium text-booking-accent-fg transition hover:brightness-110 disabled:opacity-50"
                        >
                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Add
                        </button>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {success && <p className="text-sm text-green-600">{success}</p>}
                </form>
            )}

            {/* Members list */}
            {members.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {members.map((member) => {
                        const raw = member.profiles;
                        const profile = Array.isArray(raw) ? raw[0] : raw;
                        const displayName = member.staff_name || profile?.full_name || "Unknown";
                        const displayPhone = member.staff_phone || profile?.phone || "No phone";
                        const avatarUrl = member.avatar_url || profile?.avatar_url || null;
                        const assignedServices = staffServicesMap[member.id] ?? [];
                        const isEditing = editingId === member.id;
                        return (
                            <div key={member.id} className="admin-card p-5">
                                <div className="flex items-start gap-3">
                                    {isEditing ? (
                                        <ProfileImageUpload
                                            kind="staff"
                                            size="md"
                                            businessId={businessId}
                                            memberId={member.id}
                                            defaultUrl={avatarUrl ?? ""}
                                            displayName={displayName}
                                            onUploaded={(url) => {
                                                void updateStaffMember(businessId, member.id, {
                                                    avatar_url: url || null,
                                                });
                                            }}
                                        />
                                    ) : (
                                        <UserAvatar name={displayName} src={avatarUrl} />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="w-full rounded-lg border border-[#1e2235]/10 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-[#1e2235]/30"
                                                />
                                                <input
                                                    type="tel"
                                                    value={editPhone}
                                                    onChange={(e) => setEditPhone(e.target.value)}
                                                    placeholder="Phone"
                                                    className="w-full rounded-lg border border-[#1e2235]/10 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#1e2235]/30"
                                                />
                                                <select
                                                    value={editRole}
                                                    onChange={(e) => setEditRole(e.target.value as BusinessRole)}
                                                    className="w-full rounded-lg border border-[#1e2235]/10 bg-white px-3 py-1.5 text-sm outline-none"
                                                >
                                                    <option value="staff">Staff</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <div className="flex gap-2 pt-1">
                                                    <button
                                                        onClick={() => handleUpdate(member.id)}
                                                        disabled={isPending}
                                                        className="flex items-center gap-1 rounded-lg bg-booking-accent px-3 py-1.5 text-xs font-medium text-booking-accent-fg transition hover:brightness-110 disabled:opacity-50"
                                                    >
                                                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="flex items-center gap-1 rounded-lg bg-[#f0f2f5] px-3 py-1.5 text-xs font-medium text-[#8b92a5] transition hover:text-[#1e2235]"
                                                    >
                                                        <X className="h-3 w-3" />
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="truncate font-semibold text-[#1e2235]">
                                                    {displayName}
                                                </p>
                                                <p className="text-sm text-[#8b92a5]">
                                                    {displayPhone}
                                                </p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span
                                                        className={cn(
                                                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                                                            roleColors[member.role]
                                                        )}
                                                    >
                                                        {member.role}
                                                    </span>
                                                </div>
                                                {member.role !== "owner" && (
                                                    <div className="mt-3 flex items-center gap-2">
                                                        <button
                                                            onClick={() => startEdit(member)}
                                                            className="rounded-lg p-1.5 text-[#8b92a5] transition hover:bg-[#f0f2f5] hover:text-[#1e2235]"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemove(member.id)}
                                                            className="rounded-lg p-1.5 text-[#8b92a5] transition hover:bg-red-50 hover:text-red-600"
                                                            title="Remove"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Service assignment */}
                                        {services.length > 0 && (
                                            <div className="mt-3 border-t border-[#1e2235]/5 pt-3">
                                                <p className="mb-1.5 text-xs font-medium text-[#8b92a5]">
                                                    Assigned services
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {services.map((svc) => {
                                                        const assigned = assignedServices.includes(svc.id);
                                                        return (
                                                            <button
                                                                key={svc.id}
                                                                type="button"
                                                                disabled={isPending}
                                                                onClick={() =>
                                                                    handleServiceToggle(member.id, svc.id, assignedServices)
                                                                }
                                                                className={cn(
                                                                    "rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-50",
                                                                    assigned
                                                                        ? "bg-booking-accent text-booking-accent-fg"
                                                                        : "bg-[#f0f2f5] text-[#8b92a5] hover:bg-[#e4e6eb] hover:text-[#1e2235]"
                                                                )}
                                                            >
                                                                {svc.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="admin-card flex flex-col items-center justify-center p-10 text-center">
                    <UserCog className="h-10 w-10 text-[#8b92a5]" />
                    <p className="mt-3 font-semibold text-[#1e2235]">No team members yet</p>
                    <p className="mt-1 text-sm text-[#8b92a5]">
                        Add staff to help manage your business
                    </p>
                </div>
            )}
        </div>
    );
}
