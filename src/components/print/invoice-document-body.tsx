import { format } from "date-fns";
import { formatPrice } from "@/lib/utils";

export function InvoiceDocumentBody({
  customerName,
  customerPhone,
  uniqueKeyLine,
  invoiceNumber,
  status,
  issuedAt,
  paidAt,
  currency,
  items,
  subtotal,
  discountAmount,
  total,
  amountPaid,
  notes,
  payments,
}: {
  customerName: string;
  customerPhone?: string | null;
  uniqueKeyLine?: string | null;
  invoiceNumber: string | null;
  status: string;
  issuedAt: string | null;
  paidAt: string | null;
  currency: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  subtotal: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  notes?: string | null;
  payments: Array<{
    id: string;
    paid_at: string;
    method: string;
    amount: number;
  }>;
}) {
  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Bill to
          </p>
          <p className="font-medium text-zinc-900">{customerName}</p>
          {customerPhone ? (
            <p className="text-sm text-zinc-500">{customerPhone}</p>
          ) : null}
          {uniqueKeyLine ? (
            <p className="mt-1 text-sm font-medium text-zinc-900">{uniqueKeyLine}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Invoice
          </p>
          <p className="text-xl font-bold text-zinc-900">{invoiceNumber ?? "DRAFT"}</p>
          <p className="text-sm capitalize text-zinc-500">{status}</p>
          <p className="mt-2 text-sm text-zinc-500">
            Issued {issuedAt ? format(new Date(issuedAt), "PP") : "—"}
          </p>
          {paidAt ? (
            <p className="text-sm text-zinc-500">
              Paid {format(new Date(paidAt), "PP")}
            </p>
          ) : null}
        </div>
      </div>

      <table className="mb-6 w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
            <th className="py-2 font-semibold">Description</th>
            <th className="py-2 font-semibold">Qty</th>
            <th className="py-2 font-semibold">Price</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-zinc-100">
              <td className="py-3">{item.description}</td>
              <td className="py-3">{Number(item.quantity)}</td>
              <td className="py-3">{formatPrice(Number(item.unit_price), currency)}</td>
              <td className="py-3 text-right">
                {formatPrice(Number(item.quantity) * Number(item.unit_price), currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">Subtotal</span>
          <span>{formatPrice(subtotal, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Discount</span>
          <span>-{formatPrice(discountAmount, currency)}</span>
        </div>
        <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatPrice(total, currency)}</span>
        </div>
        <div className="flex justify-between text-zinc-500">
          <span>Amount paid</span>
          <span>{formatPrice(amountPaid, currency)}</span>
        </div>
      </div>

      {notes ? (
        <p className="mt-8 whitespace-pre-wrap text-sm text-zinc-600">{notes}</p>
      ) : null}

      {payments.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Payments
          </h2>
          <ul className="space-y-1 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>
                  {format(new Date(p.paid_at), "PP")} · {p.method.replace("_", " ")}
                </span>
                <span>{formatPrice(Number(p.amount), currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
