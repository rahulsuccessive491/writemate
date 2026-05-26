"use client";
import { motion } from "framer-motion";
import { Briefcase, MessageCircle, List, Scissors } from "lucide-react";

const modes = [
  {
    icon: Briefcase,
    label: "Professional",
    color: "indigo",
    description: "Transforms rough drafts into polished executive copy. Perfect for client emails, reports, and formal communications.",
    example: "The API defect raised last week is now customer-visible. I recommend prioritizing a fix in the current sprint.",
  },
  {
    icon: MessageCircle,
    label: "Casual",
    color: "violet",
    description: "Rewrites text to sound warm and conversational. Ideal for Slack messages, team updates, and internal chats.",
    example: "Hey, that bug John flagged last week is starting to affect clients. Worth bumping it up the priority list soon.",
  },
  {
    icon: List,
    label: "Bullet Points",
    color: "purple",
    description: "Extracts key ideas into clean, scannable bullets. Great for meeting notes, status updates, and summaries.",
    example: "• API bug is now customer-visible\n• Clients are beginning to notice\n• Recommend prioritizing fix this sprint",
  },
  {
    icon: Scissors,
    label: "Concise",
    color: "fuchsia",
    description: "Cuts every word that doesn't earn its place. Use when brevity matters — subject lines, notifications, headlines.",
    example: "API bug from last week now affects clients — needs urgent prioritization.",
  },
];

const colorMap: Record<string, string> = {
  indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 group-hover:border-indigo-500/50",
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/20 group-hover:border-violet-500/50",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20 group-hover:border-purple-500/50",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 group-hover:border-fuchsia-500/50",
};

export default function Features() {
  return (
    <section id="features" className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="text-indigo-400 text-sm font-medium mb-3">Four modes. One shortcut.</div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Write for every context
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Right-click any selected text and choose the tone that fits. The AI agent handles the rest.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4">
          {modes.map((mode, i) => (
            <motion.div
              key={mode.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`group card-glow bg-[#13131f] border border-white/8 rounded-2xl p-6 transition-all duration-300 ${colorMap[mode.color]}`}
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border mb-4 ${colorMap[mode.color]}`}>
                <mode.icon size={18} />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{mode.label}</h3>
              <p className="text-white/40 text-sm leading-relaxed mb-4">{mode.description}</p>
              <div className="bg-white/4 rounded-xl p-3 border border-white/6">
                <div className="text-white/30 text-xs mb-1.5">Output preview</div>
                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{mode.example}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
