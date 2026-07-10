"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function createRecognition(): SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 1;
  return recognition;
}

export function useVoiceBooking({
  onFinalTranscript,
  onError,
}: {
  onFinalTranscript: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceReplies, setVoiceReplies] = useState(true);

  const speechSupported =
    isSpeechRecognitionSupported() || isSpeechSynthesisSupported();

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterimTranscript("");
  }, []);

  const startListening = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      onError?.("Voice input is not supported in this browser.");
      return;
    }

    stopListening();
    window.speechSynthesis?.cancel();

    const recognition = createRecognition();
    if (!recognition) {
      onError?.("Could not start voice input.");
      return;
    }

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setListening(true);
      setInterimTranscript("");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim.trim());

      if (finalText.trim()) {
        onFinalTranscript(finalText.trim());
        setInterimTranscript("");
      }
    };

    recognition.onerror = (event) => {
      setListening(false);
      setInterimTranscript("");
      if (event.error === "aborted" || event.error === "no-speech") return;
      onError?.(
        event.error === "not-allowed"
          ? "Microphone permission denied."
          : "Voice input failed. Try again."
      );
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch {
      onError?.("Could not start voice input.");
      setListening(false);
    }
  }, [onError, onFinalTranscript, stopListening]);

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  const speak = useCallback(
    (text: string) => {
      if (!voiceReplies || !isSpeechSynthesisSupported()) return;

      const cleaned = text.replace(/\s+/g, " ").trim();
      if (!cleaned) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    },
    [voiceReplies]
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    speechSupported,
    listening,
    interimTranscript,
    voiceReplies,
    setVoiceReplies,
    toggleListening,
    stopListening,
    stopSpeaking,
    speak,
  };
}
