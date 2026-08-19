import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { format } from "date-fns";
import {
  businessContactLines,
  parseDocumentTemplate,
  type DocumentBusiness,
} from "@/lib/document-template";
import { formatPrice } from "@/lib/utils";
import {
  groupResponsesBySection,
  type JobChecklistView,
} from "@/lib/checklist-types";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type Fonts = { regular: PDFFont; bold: PDFFont };

function hexRgb(hex: string): RGB {
  const raw = hex.replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = Number.parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return rgb(0.12, 0.13, 0.21);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const normalized = text.replace(/\r/g, "").split("\n");
  const lines: string[] = [];
  for (const paragraph of normalized) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        line = next;
      } else {
        if (line) lines.push(line);
        if (font.widthOfTextAtSize(word, size) <= maxWidth) {
          line = word;
        } else {
          let chunk = "";
          for (const ch of word) {
            const trial = chunk + ch;
            if (font.widthOfTextAtSize(trial, size) <= maxWidth) chunk = trial;
            else {
              if (chunk) lines.push(chunk);
              chunk = ch;
            }
          }
          line = chunk;
        }
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function embedLogo(pdf: PDFDocument, url: string | null | undefined) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("png") || url.toLowerCase().includes(".png")) {
      return pdf.embedPng(bytes);
    }
    return pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

class PdfWriter {
  pdf: PDFDocument;
  fonts: Fonts;
  brand: RGB;
  muted = rgb(0.36, 0.39, 0.47);
  ink = rgb(0.12, 0.13, 0.21);
  page!: PDFPage;
  y = 0;
  footerText = "";
  footerAlign: "left" | "center" = "center";
  headerHeight = 0;

  constructor(pdf: PDFDocument, fonts: Fonts, brand: RGB) {
    this.pdf = pdf;
    this.fonts = fonts;
    this.brand = brand;
  }

  addPage() {
    this.page = this.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  ensure(space: number) {
    if (this.y - space < MARGIN + 36) {
      this.drawFooter();
      this.addPage();
    }
  }

  drawFooter() {
    const lines = wrapText(this.footerText, this.fonts.regular, 8, CONTENT_WIDTH);
    let y = MARGIN - 4;
    for (const line of lines.slice(0, 3).reverse()) {
      const width = this.fonts.regular.widthOfTextAtSize(line, 8);
      const x =
        this.footerAlign === "center"
          ? (PAGE_WIDTH - width) / 2
          : MARGIN;
      this.page.drawText(line, {
        x,
        y,
        size: 8,
        font: this.fonts.regular,
        color: this.muted,
      });
      y += 11;
    }
  }

  text(
    value: string,
    opts: {
      size?: number;
      bold?: boolean;
      color?: RGB;
      align?: "left" | "right" | "center";
      maxWidth?: number;
    } = {}
  ) {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.fonts.bold : this.fonts.regular;
    const color = opts.color ?? this.ink;
    const maxWidth = opts.maxWidth ?? CONTENT_WIDTH;
    const lines = wrapText(value, font, size, maxWidth);
    for (const line of lines) {
      this.ensure(size + 4);
      const width = font.widthOfTextAtSize(line, size);
      let x = MARGIN;
      if (opts.align === "right") x = MARGIN + maxWidth - width;
      if (opts.align === "center") x = MARGIN + (maxWidth - width) / 2;
      this.page.drawText(line, { x, y: this.y - size, size, font, color });
      this.y -= size + 3;
    }
  }

  gap(n = 8) {
    this.y -= n;
  }
}

async function startDocument(business: DocumentBusiness & { document_template?: unknown }) {
  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const brand = hexRgb(business.brand_color || "#1e2235");
  const writer = new PdfWriter(pdf, fonts, brand);
  const layout = parseDocumentTemplate(business.document_template);
  writer.footerAlign = layout.footer_align;
  writer.footerText = layout.footer_text.trim()
    ? layout.footer_text.trim()
    : `Thank you for your business · ${business.name}`;
  writer.addPage();

  const logo = layout.show_logo ? await embedLogo(pdf, business.logo_url) : null;
  const headerCentered = layout.header_align === "center";
  const startY = writer.y;

  if (logo) {
    const size = 42;
    const x = headerCentered ? (PAGE_WIDTH - size) / 2 : MARGIN;
    writer.page.drawImage(logo, {
      x,
      y: writer.y - size,
      width: size,
      height: size,
    });
    if (!headerCentered) {
      writer.y -= 4;
    } else {
      writer.y -= size + 8;
    }
  } else if (layout.show_logo) {
    const size = 42;
    const x = headerCentered ? (PAGE_WIDTH - size) / 2 : MARGIN;
    writer.page.drawRectangle({
      x,
      y: writer.y - size,
      width: size,
      height: size,
      color: brand,
    });
    const letter = (business.name.slice(0, 1) || "B").toUpperCase();
    const w = fonts.bold.widthOfTextAtSize(letter, 18);
    writer.page.drawText(letter, {
      x: x + (size - w) / 2,
      y: writer.y - size + 13,
      size: 18,
      font: fonts.bold,
      color: rgb(1, 1, 1),
    });
    if (headerCentered) writer.y -= size + 8;
  }

  const textX = headerCentered || !layout.show_logo ? MARGIN : MARGIN + 52;
  const textWidth = headerCentered || !layout.show_logo ? CONTENT_WIDTH : CONTENT_WIDTH - 52;
  const savedY = writer.y;
  if (!headerCentered && layout.show_logo) {
    writer.y = startY - 2;
  }

  const align = headerCentered ? "center" : "left";
  if (layout.show_name) {
    const size = 16;
    const lines = wrapText(business.name, fonts.bold, size, textWidth);
    for (const line of lines) {
      const width = fonts.bold.widthOfTextAtSize(line, size);
      const x =
        align === "center" ? (PAGE_WIDTH - width) / 2 : textX;
      writer.page.drawText(line, {
        x,
        y: writer.y - size,
        size,
        font: fonts.bold,
        color: brand,
      });
      writer.y -= size + 3;
    }
  }
  if (layout.show_address && business.address) {
    writer.text(business.address, {
      size: 9,
      color: writer.muted,
      align,
      maxWidth: textWidth,
    });
  }
  const contacts = layout.show_contact ? businessContactLines(business) : [];
  if (contacts.length > 0) {
    writer.text(contacts.join("  ·  "), {
      size: 9,
      color: writer.muted,
      align,
      maxWidth: textWidth,
    });
  }
  if (layout.header_text.trim()) {
    writer.gap(6);
    writer.text(layout.header_text.trim(), {
      size: 9,
      color: writer.muted,
      align,
    });
  }

  if (!headerCentered && layout.show_logo) {
    writer.y = Math.min(writer.y, savedY - 42);
  }

  writer.gap(10);
  writer.page.drawLine({
    start: { x: MARGIN, y: writer.y },
    end: { x: PAGE_WIDTH - MARGIN, y: writer.y },
    thickness: 1,
    color: brand,
    opacity: 0.25,
  });
  writer.gap(16);
  return { pdf, writer };
}

export type InvoicePdfInput = {
  business: DocumentBusiness & { document_template?: unknown };
  invoice: {
    invoice_number: string | null;
    status: string;
    currency: string;
    subtotal: number;
    discount_amount: number;
    total: number;
    amount_paid: number;
    notes: string | null;
    issued_at: string | null;
    paid_at: string | null;
  };
  customerName: string;
  customerPhone?: string | null;
  uniqueKeyLine?: string | null;
  items: Array<{ description: string; quantity: number; unit_price: number }>;
  payments: Array<{ paid_at: string; method: string; amount: number }>;
};

export async function buildInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const { pdf, writer } = await startDocument(input.business);
  const currency = input.invoice.currency;

  const leftY = writer.y;
  writer.text("Bill to", { size: 8, color: writer.muted, bold: true });
  writer.text(input.customerName, { size: 11, bold: true });
  if (input.customerPhone) writer.text(input.customerPhone, { size: 9, color: writer.muted });
  if (input.uniqueKeyLine) writer.text(input.uniqueKeyLine, { size: 10, bold: true });
  const afterLeft = writer.y;

  writer.y = leftY;
  writer.text("Invoice", {
    size: 8,
    color: writer.muted,
    bold: true,
    align: "right",
  });
  writer.text(input.invoice.invoice_number ?? "DRAFT", {
    size: 14,
    bold: true,
    align: "right",
  });
  writer.text(input.invoice.status, {
    size: 9,
    color: writer.muted,
    align: "right",
  });
  writer.text(
    `Issued ${input.invoice.issued_at ? format(new Date(input.invoice.issued_at), "PP") : "—"}`,
    { size: 9, color: writer.muted, align: "right" }
  );
  if (input.invoice.paid_at) {
    writer.text(`Paid ${format(new Date(input.invoice.paid_at), "PP")}`, {
      size: 9,
      color: writer.muted,
      align: "right",
    });
  }
  writer.y = Math.min(afterLeft, writer.y) - 12;

  writer.page.drawLine({
    start: { x: MARGIN, y: writer.y },
    end: { x: PAGE_WIDTH - MARGIN, y: writer.y },
    thickness: 0.6,
    color: rgb(0.85, 0.86, 0.88),
  });
  writer.gap(14);
  writer.text("Description                          Qty        Price           Amount", {
    size: 8,
    bold: true,
    color: writer.muted,
  });
  writer.gap(4);

  for (const item of input.items) {
    writer.ensure(28);
    const amount = Number(item.quantity) * Number(item.unit_price);
    const qty = String(Number(item.quantity));
    const price = formatPrice(Number(item.unit_price), currency);
    const amt = formatPrice(amount, currency);
    const descWidth = 250;
    const lines = wrapText(item.description, writer.fonts.regular, 10, descWidth);
    const rowTop = writer.y;
    writer.text(lines[0] ?? "", { size: 10, maxWidth: descWidth });
    writer.y = rowTop;
    writer.page.drawText(qty, {
      x: MARGIN + 260,
      y: rowTop - 10,
      size: 10,
      font: writer.fonts.regular,
      color: writer.ink,
    });
    writer.page.drawText(price, {
      x: MARGIN + 320,
      y: rowTop - 10,
      size: 10,
      font: writer.fonts.regular,
      color: writer.ink,
    });
    const amtWidth = writer.fonts.regular.widthOfTextAtSize(amt, 10);
    writer.page.drawText(amt, {
      x: PAGE_WIDTH - MARGIN - amtWidth,
      y: rowTop - 10,
      size: 10,
      font: writer.fonts.regular,
      color: writer.ink,
    });
    writer.y = rowTop - 14;
    for (const extra of lines.slice(1)) {
      writer.text(extra, { size: 10, maxWidth: descWidth, color: writer.muted });
    }
    writer.gap(4);
  }

  writer.gap(8);
  const totals = [
    ["Subtotal", formatPrice(Number(input.invoice.subtotal), currency)],
    ["Discount", `-${formatPrice(Number(input.invoice.discount_amount), currency)}`],
    ["Total", formatPrice(Number(input.invoice.total), currency)],
    ["Amount paid", formatPrice(Number(input.invoice.amount_paid), currency)],
  ] as const;
  for (const [label, value] of totals) {
    writer.ensure(16);
    const bold = label === "Total";
    writer.page.drawText(label, {
      x: MARGIN + 280,
      y: writer.y - 10,
      size: bold ? 11 : 10,
      font: bold ? writer.fonts.bold : writer.fonts.regular,
      color: bold ? writer.ink : writer.muted,
    });
    const w = (bold ? writer.fonts.bold : writer.fonts.regular).widthOfTextAtSize(
      value,
      bold ? 11 : 10
    );
    writer.page.drawText(value, {
      x: PAGE_WIDTH - MARGIN - w,
      y: writer.y - 10,
      size: bold ? 11 : 10,
      font: bold ? writer.fonts.bold : writer.fonts.regular,
      color: writer.ink,
    });
    writer.y -= bold ? 16 : 14;
  }

  if (input.invoice.notes) {
    writer.gap(12);
    writer.text(input.invoice.notes, { size: 9, color: writer.muted });
  }

  if (input.payments.length > 0) {
    writer.gap(14);
    writer.text("Payments", { size: 8, bold: true, color: writer.muted });
    for (const payment of input.payments) {
      writer.text(
        `${format(new Date(payment.paid_at), "PP")} · ${payment.method.replace("_", " ")}    ${formatPrice(Number(payment.amount), currency)}`,
        { size: 9 }
      );
    }
  }

  writer.drawFooter();
  return pdf.save();
}

export type ChecklistPdfInput = {
  business: DocumentBusiness & { document_template?: unknown };
  title: string;
  subtitle: string;
  uniqueKeyLine?: string | null;
  customerPhone?: string | null;
  checklists: JobChecklistView[];
};

export async function buildChecklistPdf(input: ChecklistPdfInput): Promise<Uint8Array> {
  const { pdf, writer } = await startDocument(input.business);
  writer.text("Checklist", { size: 8, bold: true, color: writer.muted });
  writer.text(input.title, { size: 14, bold: true });
  writer.text(input.subtitle, { size: 10, color: writer.muted });
  if (input.customerPhone) writer.text(input.customerPhone, { size: 9, color: writer.muted });
  if (input.uniqueKeyLine) writer.text(input.uniqueKeyLine, { size: 10, bold: true });
  writer.gap(10);

  if (input.checklists.length === 0) {
    writer.text("No checklist on this job yet.", { size: 10, color: writer.muted });
  }

  for (const checklist of input.checklists) {
    writer.ensure(40);
    writer.text(checklist.title, { size: 12, bold: true });
    if (checklist.header_fields.length > 0) {
      writer.gap(4);
      for (const field of checklist.header_fields) {
        writer.text(
          `${field.label}: ${checklist.header_values[field.id] || "—"}`,
          { size: 9 }
        );
      }
    }
    const sections = groupResponsesBySection(checklist.responses);
    for (const section of sections) {
      writer.gap(8);
      writer.text(section.title, { size: 8, bold: true, color: writer.muted });
      for (const item of section.items) {
        const option = checklist.status_options.find((o) => o.code === item.value);
        const value =
          item.item_type === "status"
            ? option
              ? `${option.code} ${option.label}`
              : item.value || "—"
            : item.value || "—";
        writer.ensure(16);
        writer.page.drawText(item.label.slice(0, 80), {
          x: MARGIN,
          y: writer.y - 10,
          size: 9,
          font: writer.fonts.regular,
          color: writer.ink,
        });
        const vw = writer.fonts.bold.widthOfTextAtSize(value, 9);
        writer.page.drawText(value, {
          x: PAGE_WIDTH - MARGIN - vw,
          y: writer.y - 10,
          size: 9,
          font: writer.fonts.bold,
          color: writer.ink,
        });
        writer.y -= 14;
      }
    }
    if (checklist.comments) {
      writer.gap(6);
      writer.text(checklist.comments, { size: 9, color: writer.muted });
    }
    writer.gap(12);
  }

  writer.drawFooter();
  return pdf.save();
}

export function pdfFileResponse(bytes: Uint8Array, filename: string) {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
