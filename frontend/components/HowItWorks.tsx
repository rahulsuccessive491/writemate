"use client";
import { motion } from "framer-motion";
import { MousePointer2, Sparkles, CheckCheck } from "lucide-react";

const steps = [
  {
    icon: MousePointer2,
    step: "01",
    title: "Select any text",
    description: "Highlight text anywhere on the web — Gmail, Notion, Google Docs, Slack, GitHub, anywhere.",
  },
  {
    icon: Sparkles,
    step: "02",
    title: "Pick your tone",
    description: "Right-click → Rephrase with AI → choose Professional, Casual, Bullet Points, or Concise.",
  },
  {
    icon: CheckCheck,
    step: "03",
    title: "Text replaced instantly",
    description: "The AI agent rewrites the selection and injects it back in-place. No copy-paste needed.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="text-indigo-400 text-sm font-medium mb-3">Zero learning curve</div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Three steps, done.
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            No new tabs. No copy-paste. No switching apps. Works inside the page you&apos;re already on.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative"
            >
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-indigo-500/30 to-transparent z-10 -translate-y-1/2" style={{ width: "calc(100% - 2.5rem)", left: "calc(100% - 1rem)" }} />
              )}
              <div className="card-glow bg-[#13131f] border border-white/8 rounded-2xl p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <step.icon size={18} className="text-indigo-400" />
                  </div>
                  <span className="text-white/10 text-3xl font-bold tabular-nums">{step.step}</span>
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
