"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function normalizeHex(value: string, fallback: string): string {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (HEX_COLOR.test(withHash)) return withHash.toLowerCase();
  return fallback;
}

export function BrandColorField({
  id,
  name,
  label,
  description,
  defaultValue,
  className,
}: {
  id: string;
  name: string;
  label: string;
  description?: string;
  defaultValue: string;
  className?: string;
}) {
  const fallback = normalizeHex(defaultValue, "#000000");
  const [value, setValue] = useState(fallback);

  function handleTextChange(next: string) {
    if (next === "" || /^#?[0-9A-Fa-f]{0,6}$/i.test(next)) {
      const withHash = next.startsWith("#") || next === "" ? next : `#${next}`;
      setValue(withHash);
    }
  }

  function handleTextBlur() {
    setValue((current) => normalizeHex(current, fallback));
  }

  function handlePickerChange(next: string) {
    setValue(next.toLowerCase());
  }

  const pickerValue = HEX_COLOR.test(value) ? value : fallback;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {description ? (
        <p className="text-xs text-zinc-500 lg:text-[#8b92a5]">{description}</p>
      ) : null}
      <div className="flex gap-3">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={pickerValue}
          onChange={(event) => handlePickerChange(event.target.value)}
          className="brand-color-picker h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-[#1e2235]/15 bg-white p-1"
        />
        <Input
          id={id}
          name={name}
          value={value}
          onChange={(event) => handleTextChange(event.target.value)}
          onBlur={handleTextBlur}
          placeholder="#f5c518"
          autoComplete="off"
          spellCheck={false}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}
