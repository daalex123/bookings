export type DocumentHeaderAlign = "left" | "center";
export type DocumentFooterAlign = "left" | "center";

export type DocumentTemplate = {
  header_align: DocumentHeaderAlign;
  footer_align: DocumentFooterAlign;
  show_logo: boolean;
  show_name: boolean;
  show_address: boolean;
  show_contact: boolean;
  header_text: string;
  footer_text: string;
};

export const DEFAULT_DOCUMENT_TEMPLATE: DocumentTemplate = {
  header_align: "left",
  footer_align: "center",
  show_logo: true,
  show_name: true,
  show_address: true,
  show_contact: true,
  header_text: "",
  footer_text: "",
};

export type DocumentBusiness = {
  name: string;
  logo_url?: string | null;
  brand_color?: string | null;
  address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
};

export function parseDocumentTemplate(value: unknown): DocumentTemplate {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_DOCUMENT_TEMPLATE };
  }
  const row = value as Record<string, unknown>;
  return {
    header_align: row.header_align === "center" ? "center" : "left",
    footer_align: row.footer_align === "left" ? "left" : "center",
    show_logo: row.show_logo !== false,
    show_name: row.show_name !== false,
    show_address: row.show_address !== false,
    show_contact: row.show_contact !== false,
    header_text: typeof row.header_text === "string" ? row.header_text : "",
    footer_text: typeof row.footer_text === "string" ? row.footer_text : "",
  };
}

export function businessContactLines(business: DocumentBusiness): string[] {
  return [
    business.contact_phone,
    business.contact_whatsapp,
    business.contact_email,
  ].filter((value): value is string => Boolean(value && value.trim()));
}
