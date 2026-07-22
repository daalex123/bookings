"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "booknow-admin-theme";

type AdminTheme = "dark" | "light";

function applyAdminTheme(theme: AdminTheme) {
    const shell = document.getElementById("admin-app-shell");
    if (shell) {
        shell.classList.toggle("admin-theme-light", theme === "light");
    }
}

export function AdminThemeToggle({ compact = false }: { compact?: boolean }) {
    const [theme, setTheme] = useState<AdminTheme>("dark");

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const nextTheme: AdminTheme = stored === "light" ? "light" : "dark";
        setTheme(nextTheme);
        applyAdminTheme(nextTheme);
    }, []);

    const toggle = () => {
        const nextTheme: AdminTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        localStorage.setItem(STORAGE_KEY, nextTheme);
        applyAdminTheme(nextTheme);
    };

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label="Toggle admin theme"
            className={cn(
                "inline-flex items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-elevated)] text-[var(--admin-navy)] transition-colors hover:bg-[var(--admin-surface)]",
                compact ? "h-9 px-3 text-xs font-semibold" : "h-10 px-4 text-sm font-medium"
            )}
        >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === "dark" ? "Light" : "Dark"} mode</span>
        </button>
    );
}
