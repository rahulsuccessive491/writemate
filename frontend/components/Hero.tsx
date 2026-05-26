"use client";
import { motion } from "framer-motion";
import { Globe, Zap } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-75 h-75 bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Zap size={11} />
            Powered by LLaMA 3.1 · Free to use
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            Rephrase anything,{" "}
            <span className="gradient-text">instantly.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            WriteMate is a Chrome extension that rewrites your selected text into
            polished professional copy, casual Slack messages, bullet points, or concise summaries — right inside any webpage.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              id="install"
              href="#"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3.5 rounded-xl transition-all hover:scale-105"
            >
              <Globe size={18} />
              Add to Chrome — It&apos;s Free
            </a>
            <a
              href="#demo"
              className="text-white/60 hover:text-white text-sm font-medium transition-colors"
            >
              See it in action →
            </a>
          </div>
        </motion.div>

        {/* Browser mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-20 relative mx-auto max-w-3xl"
        >
          <div className="card-glow rounded-2xl bg-[#13131f] border border-white/8 overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-[#0f0f1a]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 bg-white/5 rounded-md h-6 mx-4 flex items-center px-3">
                <span className="text-white/30 text-xs">mail.google.com</span>
              </div>
            </div>

            {/* Page content mockup */}
            <div className="p-6 text-left relative">
              <div className="text-white/30 text-xs mb-3 font-mono">Gmail — Compose</div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/8">
                <p className="text-white/40 text-sm leading-relaxed mb-1 line-through">
                  hey just wanted to check if u got the report i sent last week bcz the client is asking and i need to know asap thanks
                </p>
                <div className="flex items-center gap-2 my-3">
                  <div className="h-px flex-1 bg-indigo-500/30" />
                  <span className="text-indigo-400 text-xs font-medium flex items-center gap-1">
                    <Zap size={10} /> WriteMate
                  </span>
                  <div className="h-px flex-1 bg-indigo-500/30" />
                </div>
                <p className="text-white text-sm leading-relaxed">
                  Hi, I wanted to follow up on the report I shared last week. Our client has been requesting an update — could you confirm receipt at your earliest convenience?
                </p>
              </div>

              {/* Floating popup */}
              <div className="absolute top-4 right-4 bg-[#1a1a2e] border border-indigo-500/30 rounded-xl p-3 shadow-2xl w-44">
                <div className="text-white/70 text-xs font-medium mb-2">Rephrase as</div>
                <div className="space-y-1">
                  {["Professional", "Casual", "Bullet Points", "Concise"].map((m, i) => (
                    <div
                      key={m}
                      className={`text-xs px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        i === 0
                          ? "bg-indigo-600 text-white font-medium"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
