import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  businessContactLines,
  parseDocumentTemplate,
  type DocumentBusiness,
  type DocumentTemplate,
} from "@/lib/document-template";

export function DocumentChrome({
  business,
  template,
  preview = false,
  children,
}: {
  business: DocumentBusiness;
  template?: DocumentTemplate | unknown;
  preview?: boolean;
  children: ReactNode;
}) {
  const layout = parseDocumentTemplate(template);
  const brand = business.brand_color || "#1e2235";
  const contacts = businessContactLines(business);
  const headerCentered = layout.header_align === "center";
  const footerCentered = layout.footer_align === "center";

  return (
    <div
      className={cn(
        "flex min-h-[28rem] flex-col bg-white text-[#1e2235]",
        preview && "rounded-xl border border-[#1e2235]/10 p-6 shadow-sm"
      )}
    >
      <header
        className={cn(
          "mb-8 border-b pb-5",
          headerCentered ? "text-center" : "text-left"
        )}
        style={{ borderColor: `${brand}33` }}
      >
        <div
          className={cn(
            "flex gap-3",
            headerCentered
              ? "flex-col items-center"
              : "items-start justify-between"
          )}
        >
          <div
            className={cn(
              "flex gap-3",
              headerCentered ? "flex-col items-center" : "items-center"
            )}
          >
            {layout.show_logo ? (
              business.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={business.logo_url}
                  alt=""
                  className="h-14 w-14 rounded-xl object-cover"
                />
              ) : (
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white"
                  style={{ backgroundColor: brand }}
                >
                  {business.name.slice(0, 1)}
                </div>
              )
            ) : null}
            <div>
              {layout.show_name ? (
                <p className="text-2xl font-bold" style={{ color: brand }}>
                  {business.name}
                </p>
              ) : null}
              {layout.show_address && business.address ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-[#5c6378]">
                  {business.address}
                </p>
              ) : null}
              {layout.show_contact && contacts.length > 0 ? (
                <p className="mt-1 text-sm text-[#5c6378]">
                  {contacts.join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        {layout.header_text.trim() ? (
          <p
            className={cn(
              "mt-4 whitespace-pre-wrap text-sm text-[#5c6378]",
              headerCentered && "mx-auto max-w-xl"
            )}
          >
            {layout.header_text.trim()}
          </p>
        ) : null}
      </header>

      <div className="flex-1">{children}</div>

      {(layout.footer_text.trim() || layout.show_name) && (
        <footer
          className={cn(
            "mt-10 border-t pt-4 text-xs text-[#5c6378]",
            footerCentered ? "text-center" : "text-left"
          )}
          style={{ borderColor: `${brand}33` }}
        >
          {layout.footer_text.trim() ? (
            <p className="whitespace-pre-wrap">{layout.footer_text.trim()}</p>
          ) : (
            <p>Thank you for your business · {business.name}</p>
          )}
        </footer>
      )}
    </div>
  );
}
