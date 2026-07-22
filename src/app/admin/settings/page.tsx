import { getCurrentUser } from "@/lib/supabase/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Database, Bell, Shield } from "lucide-react";

export default async function AdminSettingsPage() {
    const user = await getCurrentUser();
    if (!user) return null;

    const settingsGroups = [
        {
            title: "Platform Configuration",
            description: "Core platform settings and configurations",
            icon: SettingsIcon,
            items: [
                { label: "Platform Name", value: "BookNow" },
                { label: "Environment", value: process.env.NODE_ENV },
                { label: "Region", value: "Auto" },
            ],
        },
        {
            title: "Database",
            description: "Supabase connection and configuration",
            icon: Database,
            items: [
                { label: "Status", value: "Connected" },
                { label: "Provider", value: "Supabase" },
            ],
        },
        {
            title: "Notifications",
            description: "Email, SMS, and WhatsApp configuration",
            icon: Bell,
            items: [
                { label: "Email Provider", value: "Resend" },
                { label: "SMS Provider", value: "Twilio" },
                { label: "WhatsApp", value: "Meta Business API" },
            ],
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
                    Platform Settings
                </h1>
                <p className="mt-2 text-zinc-400">
                    Configure platform-wide settings and integrations
                </p>
            </div>

            <div className="space-y-6">
                {settingsGroups.map((group) => (
                    <Card
                        key={group.title}
                        className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm"
                    >
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-zinc-800 p-2">
                                    <group.icon className="h-5 w-5 text-zinc-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg text-zinc-100">
                                        {group.title}
                                    </CardTitle>
                                    <CardDescription className="text-zinc-500">
                                        {group.description}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-4">
                                {group.items.map((item) => (
                                    <div
                                        key={item.label}
                                        className="flex items-center justify-between border-b border-zinc-800 pb-3 last:border-0 last:pb-0"
                                    >
                                        <dt className="text-sm font-medium text-zinc-400">
                                            {item.label}
                                        </dt>
                                        <dd className="text-sm text-zinc-100">{item.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-500/10 p-2">
                            <Shield className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-zinc-100">
                                Super Admin Access
                            </CardTitle>
                            <CardDescription className="text-zinc-500">
                                You have full platform access as a super administrator
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        </div>
    );
}
