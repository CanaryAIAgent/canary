"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useState, useEffect, useRef } from "react";

const VOICE_SYSTEM_PROMPT = `You are the Canary AI Assistant — the voice interface for an Emergency Operations Center (EOC) managing physical disaster response.

You help field responders and incident commanders report incidents, check shelter capacity, and get situational awareness — all through voice.

## Personality
- Decisive, calm, and concise — responders are often under stress
- Use clear emergency management terminology
- Confirm critical details back to the user before taking action
- Always state when you are creating an incident or pushing a signal

## Capabilities (via tools)
- push_signal: Report a new field signal and create an incident in the system
- create_incident: Create a formal incident record
- check_shelter_capacity: Look up nearby shelter availability
- log_activity: Log an action to the EOC activity feed

## Flow for incident reporting
1. Listen to the responder's report
2. Extract: incident type, location, severity (1-5), description
3. Confirm the details back verbally
4. Call push_signal to create the incident
5. Acknowledge completion with the incident summary

When information is unclear, ask one focused follow-up question. Do not ask more than one question at a time.`;

interface TranscriptEntry {
  id: string;
  source: "user" | "agent";
  text: string;
  timestamp: Date;
}

export default function VoiceConversation({ onClose }: { onClose: () => void }) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const conversation = useConversation({
    onConnect: () => setError(null),
    onDisconnect: () => {},
    onMessage: (message: { source?: string; message?: string }) => {
      if (message.message) {
        setTranscript((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            source: message.source === "user" ? "user" : "agent",
            text: message.message!,
            timestamp: new Date(),
          },
        ]);
      }
    },
    onError: (err: Error | string) => {
      const msg = typeof err === "string" ? err : err.message;
      console.error("[VoiceConversation] error:", msg);
      setError(msg);
    },
  });

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const startConversation = useCallback(async () => {
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const res = await fetch("/api/elevenlabs/signed-url");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to get signed URL (${res.status})`);
      }
      const { signedUrl } = (await res.json()) as { signedUrl: string };

      await conversation.startSession({
        signedUrl,
        overrides: {
          agent: {
            prompt: {
              prompt: VOICE_SYSTEM_PROMPT,
            },
            firstMessage: "Canary EOC online. I'm ready to take your incident report. What's the situation?",
          },
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start voice session";
      setError(msg);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isConnected = conversation.status === "connected";
  const isConnecting = conversation.status === "connecting";

  return (
    <div className="flex flex-col h-full">
      {/* Voice status header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/15">
        <div className="flex items-center gap-3">
          <div className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isConnected
              ? conversation.isSpeaking
                ? "bg-tertiary/20"
                : "bg-tertiary/10"
              : "bg-surface-container-highest"
          }`}>
            <span className={`material-symbols-outlined text-xl ${
              isConnected ? "text-tertiary" : "text-on-surface-variant"
            }`}>
              {isConnected ? (conversation.isSpeaking ? "graphic_eq" : "mic") : "mic_off"}
            </span>
            {isConnected && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-tertiary border-2 border-surface animate-pulse" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-on-surface">
              {isConnecting
                ? "Connecting..."
                : isConnected
                  ? conversation.isSpeaking
                    ? "Canary is speaking..."
                    : "Listening..."
                  : "Voice Mode"
              }
            </p>
            <p className="text-[11px] text-on-surface-variant">
              {isConnected
                ? "Speak to report incidents or ask questions"
                : "Start a voice conversation with Canary AI"
              }
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          aria-label="Close voice mode"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin">
        {transcript.length === 0 && !isConnected && !isConnecting && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-12">
            <div className="w-14 h-14 rounded-2xl bg-tertiary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-tertiary text-2xl">record_voice_over</span>
            </div>
            <p className="text-sm text-on-surface-variant font-semibold uppercase tracking-widest mb-1">
              Voice Incident Reporting
            </p>
            <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
              Start a voice conversation to report field signals, create incidents, or check shelter capacity — hands-free.
            </p>
          </div>
        )}

        {transcript.length === 0 && isConnected && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-tertiary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary text-3xl">mic</span>
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-tertiary/30 animate-ping" />
            </div>
            <p className="text-sm text-on-surface-variant font-medium">
              Listening — start speaking
            </p>
          </div>
        )}

        {transcript.map((entry) => (
          <div
            key={entry.id}
            className={`flex ${entry.source === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className="flex items-start gap-2.5 max-w-[85%]">
              {entry.source === "agent" && (
                <div className="w-7 h-7 rounded-full bg-tertiary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-tertiary text-[14px]">neurology</span>
                </div>
              )}
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  entry.source === "user"
                    ? "bg-tertiary/15 text-on-surface rounded-br-sm"
                    : "bg-surface-container-low text-on-surface rounded-bl-sm"
                }`}
              >
                <span className="whitespace-pre-wrap">{entry.text}</span>
              </div>
              {entry.source === "user" && (
                <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-on-secondary-container text-[10px] font-bold">OP</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mb-3 px-4 py-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-medium">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-5 py-4 border-t border-outline-variant/15">
        {!isConnected ? (
          <button
            onClick={startConversation}
            disabled={isConnecting}
            className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-tertiary-gradient text-white font-semibold text-sm disabled:opacity-50 transition-opacity active:scale-[0.97]"
          >
            <span className="material-symbols-outlined text-lg">
              {isConnecting ? "hourglass_top" : "mic"}
            </span>
            {isConnecting ? "Connecting..." : "Start Voice Session"}
          </button>
        ) : (
          <button
            onClick={stopConversation}
            className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-error/15 text-error font-semibold text-sm hover:bg-error/25 transition-colors active:scale-[0.97]"
          >
            <span className="material-symbols-outlined text-lg">stop_circle</span>
            End Session
          </button>
        )}
      </div>
    </div>
  );
}
