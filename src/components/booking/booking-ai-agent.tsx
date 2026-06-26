"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Loader2, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const WELCOME =
  "Hi! I can help you book an appointment, check open times, list your bookings, or cancel an upcoming visit. What would you like to do?";

function isAuthPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.endsWith("/login") ||
    pathname.endsWith("/register")
  );
}

export function BookingAiAgent({
  bookingRef,
  businessName,
  loginHref,
  isGuest,
}: {
  bookingRef: string;
  businessName: string;
  loginHref: string;
  isGuest: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: WELCOME },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (isGuest) {
      setError("Sign in to chat with the booking assistant.");
      return;
    }

    setError(null);
    setInput("");
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/booking/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingRef,
          messages: nextMessages,
        }),
      });

      const data = (await res.json()) as {
        message?: string;
        error?: string;
        booking?: { appointmentId: string };
        cancelled?: { appointmentId: string };
      };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setMessages(messages);
        return;
      }

      const reply = data.message ?? "Done!";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      if (data.booking?.appointmentId) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Your booking is confirmed! You can view it under My Bookings anytime.",
          },
        ]);
      }

      if (data.cancelled?.appointmentId) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Your appointment has been cancelled. Let me know if you'd like to book a new time.",
          },
        ]);
      }
    } catch {
      setError("Network error. Please try again.");
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  }, [bookingRef, input, isGuest, loading, messages]);

  if (isAuthPath(pathname)) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-booking-accent text-booking-accent-fg shadow-lg shadow-black/30 transition hover:scale-105 active:scale-95"
          aria-label="Open booking assistant"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-lg flex-col rounded-t-3xl border border-white/10 bg-booking-bg shadow-2xl shadow-black/50"
          style={{ height: "min(78dvh, 640px)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Booking assistant</p>
              <p className="truncate text-xs text-booking-muted">{businessName}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-booking-muted hover:bg-booking-elevated hover:text-white"
              aria-label="Close assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {isGuest ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <Bot className="h-10 w-10 text-booking-accent" />
              <p className="text-sm text-booking-muted">
                Sign in to chat with the AI assistant and book appointments.
              </p>
              <Link
                href={loginHref}
                className="rounded-2xl bg-booking-accent px-5 py-2.5 text-sm font-semibold text-booking-accent-fg"
              >
                Sign in
              </Link>
            </div>
          ) : (
            <>
              <div
                ref={listRef}
                className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
              >
                {messages.map((msg, i) => (
                  <div
                    key={`${msg.role}-${i}`}
                    className={cn(
                      "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "ml-auto bg-booking-accent text-booking-accent-fg"
                        : "bg-booking-elevated text-white"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
                {loading && (
                  <div className="flex max-w-[88%] items-center gap-2 rounded-2xl bg-booking-elevated px-4 py-3 text-sm text-booking-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking…
                  </div>
                )}
              </div>

              {error && (
                <p className="px-4 pb-2 text-center text-xs text-red-300">{error}</p>
              )}

              <form
                className="border-t border-white/10 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMessage();
                }}
              >
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    rows={1}
                    placeholder="Book, list, or cancel appointments…"
                    disabled={loading}
                    className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border-0 bg-booking-elevated px-4 py-3 text-sm text-white placeholder:text-booking-muted focus:outline-none focus:ring-2 focus:ring-booking-accent/50 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-booking-accent text-booking-accent-fg disabled:opacity-50"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
