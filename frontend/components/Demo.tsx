"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";

const examples = [
  {
    mode: "Professional",
    raw: "hey i need the budget numbers by eod today or the client meeting tomorrow is gonna be a mess tbh",
    output: "Please send the budget figures by end of day today. They are required for tomorrow's client meeting.",
  },
  {
    mode: "Casual",
    raw: "The aforementioned deliverables must be submitted prior to the commencement of the next operational cycle.",
    output: "Just a heads-up — make sure to submit everything before the next cycle kicks off!",
  },
  {
    mode: "Bullet Points",
    raw: "We need to fix the login bug, update the dashboard design, write tests for the payment module, and review the API docs before the release next Friday.",
    output: "• Fix login bug\n• Update dashboard design\n• Write tests for payment module\n• Review API docs\n• Complete all items before Friday release",
  },
  {
    mode: "Concise",
    raw: "I just wanted to reach out and let you know that in terms of the project timeline, we are currently running a little bit behind schedule due to some unexpected issues that came up.",
    output: "Project is behind schedule due to unexpected issues.",
  },
];

export default function Demo() {
  const [active, setActive] = useState(0);

  return (
    <section id="demo" className="py-28">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="text-indigo-400 text-sm font-medium mb-3">See the transformation</div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Before & After
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Real examples of what the AI agent produces across all four modes.
          </p>
        </motion.div>

        {/* Mode tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {examples.map((ex, i) => (
            <button
              key={ex.mode}
              onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active === i
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-white/50 hover:text-white hover:bg-white/8"
              }`}
            >
              {ex.mode}
            </button>
          ))}
        </div>

        {/* Before/After card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto"
          >
            <div className="card-glow bg-[#13131f] border border-white/8 rounded-2xl p-6">
              <div className="text-white/30 text-xs font-medium mb-3 uppercase tracking-wider">Before</div>
              <p className="text-white/50 text-sm leading-relaxed">{examples[active].raw}</p>
            </div>

            <div className="relative">
              <div className="card-glow bg-[#13131f] border border-indigo-500/20 rounded-2xl p-6 h-full">
                <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-medium mb-3 uppercase tracking-wider">
                  <Zap size={10} />
                  After — {examples[active].mode}
                </div>
                <p className="text-white text-sm leading-relaxed whitespace-pre-line">{examples[active].output}</p>
              </div>
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-indigo-600 border border-indigo-500">
                <ArrowRight size={14} className="text-white" />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
