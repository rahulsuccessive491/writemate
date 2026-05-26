"use client";
import { useState, useRef, useEffect } from "react";
import { MessageSquarePlus, X, Send, CheckCircle } from "lucide-react";

type Status = "idle" | "sending" | "success" | "error";

export default function FeedbackWidget() {
  const [open, setOpen]     = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm]     = useState({ name: "", email: "", message: "" });
  const panelRef            = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (open && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* Reset when closed */
  useEffect(() => {
    if (!open) setTimeout(() => setStatus("idle"), 300);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Panel */}
      {open && (
        <div
          className="w-80 rounded-2xl border border-white/10 bg-[#13131f] shadow-2xl overflow-hidden"
          style={{ animation: "wmFbIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
        >
          <style>{`@keyframes wmFbIn{from{opacity:0;transform:scale(0.92) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-indigo-500/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                <MessageSquarePlus size={13} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-white">Send Feedback</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {status === "success" ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle size={36} className="text-green-400" />
                <p className="text-white font-semibold text-sm">Thank you!</p>
                <p className="text-white/40 text-xs">Your feedback has been sent.</p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-2 text-indigo-400 text-xs hover:text-indigo-300 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1 font-medium">Name</label>
                  <input
                    required
                    type="text"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-white text-sm placeholder-white/20 outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-1 font-medium">Email</label>
                  <input
                    required
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-white text-sm placeholder-white/20 outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-1 font-medium">Feedback</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="What do you think about WriteMate?"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-white text-sm placeholder-white/20 outline-none focus:border-indigo-500/50 transition-colors resize-none"
                  />
                </div>

                {status === "error" && (
                  <p className="text-red-400 text-xs">Something went wrong. Please try again.</p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  {status === "sending" ? (
                    "Sending…"
                  ) : (
                    <><Send size={13} /> Send Feedback</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105 text-sm font-semibold ${
          open
            ? "bg-white/10 text-white border border-white/15"
            : "bg-indigo-600 hover:bg-indigo-500 text-white"
        }`}
      >
        {open ? <X size={16} /> : <MessageSquarePlus size={16} />}
        {open ? "Close" : "Feedback"}
      </button>
    </div>
  );
}
