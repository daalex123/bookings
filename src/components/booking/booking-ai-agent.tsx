"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Loader2, Mic, MicOff, Send, Volume2, VolumeX, X } from "lucide-react";
import { useVoiceBooking } from "@/hooks/use-voice-booking";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const WELCOME =
  "Hi! I can help you book an appointment, check open times, list your bookings, or cancel an upcoming visit. Tap the mic to speak, or type below.";

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
  const messagesRef = useRef(messages);
  const submitRef = useRef<(text: string) => void>(() => {});
  messagesRef.current = messages;

  const {
    speechSupported,
    listening,
    interimTranscript,
    voiceReplies,
    setVoiceReplies,
    toggleListening,
    stopListening,
    stopSpeaking,
    speak,
  } = useVoiceBooking({
    onFinalTranscript: (text) => {
      setVoiceReplies(true);
      submitRef.current(text);
    },
    onError: (message) => setError(message),
  });

  const submitMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      if (isGuest) {
        setError("Sign in to chat with the booking assistant.");
        return;
      }

      setError(null);
      setInput("");

      const prior = messagesRef.current;
      const nextMessages: ChatMessage[] = [
        ...prior,
        { role: "user", content: trimmed },
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
          setMessages(prior);
          return;
        }

        const reply = data.message ?? "Done!";
        const spoken: string[] = [reply];

        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

        if (data.booking?.appointmentId) {
          const confirmation =
            "Your booking is confirmed! You can view it under My Bookings anytime.";
          spoken.push(confirmation);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: confirmation },
          ]);
        }

        if (data.cancelled?.appointmentId) {
          const confirmation =
            "Your appointment has been cancelled. Let me know if you'd like to book a new time.";
          spoken.push(confirmation);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: confirmation },
          ]);
        }

        speak(spoken.join(" "));
      } catch {
        setError("Network error. Please try again.");
        setMessages(prior);
      } finally {
        setLoading(false);
      }
    },
    [bookingRef, isGuest, loading, speak]
  );

  submitRef.current = (text) => {
    void submitMessage(text);
  };

  const sendMessage = useCallback(() => {
    void submitMessage(input);
  }, [input, submitMessage]);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  useEffect(() => {
    if (open && !listening) {
      inputRef.current?.focus();
    }
  }, [open, listening]);

  const closePanel = useCallback(() => {
    stopListening();
    stopSpeaking();
    setOpen(false);
  }, [stopListening, stopSpeaking]);

  if (isAuthPath(pathname)) return null;

  const displayInput = listening
    ? interimTranscript || "Listening…"
    : input;

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
        <div
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-lg flex-col rounded-t-3xl border border-white/10 bg-booking-bg shadow-2xl shadow-black/50"
          style={{
            height: "min(78dvh, 640px)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Booking assistant</p>
              <p className="truncate text-xs text-booking-muted">{businessName}</p>
            </div>
            <div className="flex items-center gap-1">
              {speechSupported && !isGuest && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !voiceReplies;
                    if (!next) stopSpeaking();
                    setVoiceReplies(next);
                  }}
                  className={cn(
                    "rounded-full p-2 transition",
                    voiceReplies
                      ? "text-booking-accent hover:bg-booking-elevated"
                      : "text-booking-muted hover:bg-booking-elevated hover:text-white"
                  )}
                  aria-label={voiceReplies ? "Mute voice replies" : "Enable voice replies"}
                  title={voiceReplies ? "Voice replies on" : "Voice replies off"}
                >
                  {voiceReplies ? (
                    <Volume2 className="h-5 w-5" />
                  ) : (
                    <VolumeX className="h-5 w-5" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={closePanel}
                className="rounded-full p-2 text-booking-muted hover:bg-booking-elevated hover:text-white"
                aria-label="Close assistant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
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

              {listening && (
                <p className="px-4 pb-2 text-center text-xs text-booking-accent">
                  Listening… speak now
                </p>
              )}

              <form
                className="border-t border-white/10 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!listening) sendMessage();
                }}
              >
                <div className="flex items-end gap-2">
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      disabled={loading}
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition disabled:opacity-50",
                        listening
                          ? "bg-red-500/25 text-red-300 ring-2 ring-red-400/50"
                          : "bg-booking-elevated text-booking-muted hover:text-white"
                      )}
                      aria-label={listening ? "Stop listening" : "Start voice input"}
                      title={listening ? "Stop" : "Voice booking"}
                    >
                      {listening ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  <textarea
                    ref={inputRef}
                    value={displayInput}
                    onChange={(e) => {
                      if (!listening) setInput(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !listening) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={1}
                    readOnly={listening}
                    placeholder={
                      speechSupported
                        ? "Speak or type your request…"
                        : "Book, list, or cancel appointments…"
                    }
                    disabled={loading}
                    className={cn(
                      "max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border-0 bg-booking-elevated px-4 py-3 text-sm text-white placeholder:text-booking-muted focus:outline-none focus:ring-2 focus:ring-booking-accent/50 disabled:opacity-60",
                      listening && "text-booking-accent"
                    )}
                  />
                  <button
                    type="submit"
                    disabled={loading || listening || !input.trim()}
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
