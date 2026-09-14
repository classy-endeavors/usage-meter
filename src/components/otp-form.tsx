"use client";

import { GlowButton } from "@/components/glow-button";
import { useRef, useState } from "react";

export function OtpForm() {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  function update(index: number, value: string) {
    const next = [...digits];
    next[index] = value.slice(-1).replace(/\D/g, "");
    setDigits(next);
    setError("");
    if (next[index] && index < 3) {
      inputs.current[index + 1]?.focus();
    }
    if (next.every(Boolean)) {
      void submit(next.join(""));
    }
  }

  async function submit(code: string) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        setError("That code is not valid.");
        setDigits(["", "", "", ""]);
        inputs.current[0]?.focus();
        return;
      }
      window.location.href = "/";
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="flex flex-col items-center gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(digits.join(""));
      }}
    >
      <div className="flex gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              inputs.current[index] = node;
            }}
            value={digit}
            inputMode="numeric"
            maxLength={1}
            autoFocus={index === 0}
            disabled={pending}
            onChange={(event) => update(index, event.target.value)}
            onPaste={(event) => {
              event.preventDefault();
              const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
              if (!pasted) return;
              const next = ["", "", "", ""];
              pasted.split("").forEach((char, i) => {
                next[i] = char;
              });
              setDigits(next);
              if (pasted.length === 4) void submit(pasted);
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digits[index] && index > 0) {
                inputs.current[index - 1]?.focus();
              }
            }}
            className="h-16 w-12 rounded-2xl border border-black/10 bg-white text-center text-2xl font-semibold shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
          />
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <GlowButton type="submit" disabled={pending || digits.join("").length < 4}>
        {pending ? "Checking" : "Enter dashboard"}
      </GlowButton>
    </form>
  );
}
