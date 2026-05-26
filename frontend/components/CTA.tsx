"use client";
import { motion } from "framer-motion";
import { Globe, Zap } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-28">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-linear-to-br from-indigo-600/20 via-purple-600/15 to-fuchsia-600/10 border border-indigo-500/20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-125 h-50 bg-indigo-500/10 blur-3xl" />

          <div className="relative px-8 py-20 text-center">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <Zap size={11} />
              Free forever · No account required
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Stop rewriting manually.
            </h2>
            <p className="text-white/50 text-lg max-w-lg mx-auto mb-10">
              Install in 30 seconds. Works on Gmail, Notion, Slack, Jira, Google Docs — anywhere you type.
            </p>

            <a
              href="#"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:scale-105 text-base"
            >
              <Globe size={20} />
              Add to Chrome — It&apos;s Free
            </a>

            <div className="mt-8 flex flex-wrap justify-center gap-6 text-white/30 text-sm">
              <span>✓ No sign-up</span>
              <span>✓ Runs locally</span>
              <span>✓ 4 rephrase modes</span>
              <span>✓ Works on any website</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
