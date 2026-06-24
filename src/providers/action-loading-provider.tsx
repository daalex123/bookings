"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";

type ActionLoadingContextValue = {
  show: (message?: string) => void;
  hide: () => void;
  isLoading: boolean;
};

const ActionLoadingContext = createContext<ActionLoadingContextValue | null>(
  null
);

export function ActionLoadingProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("Please wait…");
  const countRef = useRef(0);

  const show = useCallback((nextMessage = "Please wait…") => {
    countRef.current += 1;
    setMessage(nextMessage);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current === 0) {
      setVisible(false);
    }
  }, []);

  const value = useMemo(
    () => ({ show, hide, isLoading: visible }),
    [show, hide, visible]
  );

  return (
    <ActionLoadingContext.Provider value={value}>
      {children}
      {visible ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label={message}
        >
          <div className="mx-6 flex max-w-sm flex-col items-center gap-4 rounded-3xl bg-zinc-900 px-8 py-10 text-center text-white shadow-2xl">
            <Loader2 className="h-10 w-10 animate-spin text-teal-400" />
            <p className="text-base font-medium">{message}</p>
          </div>
        </div>
      ) : null}
    </ActionLoadingContext.Provider>
  );
}

export function useActionLoading() {
  const ctx = useContext(ActionLoadingContext);
  if (!ctx) {
    throw new Error("useActionLoading must be used within ActionLoadingProvider");
  }
  return ctx;
}
