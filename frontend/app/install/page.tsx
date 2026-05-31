"use client";
import { motion } from "framer-motion";
import {
  Download,
  FolderOpen,
  ToggleRight,
  Puzzle,
  Pin,
  CheckCircle2,
  Zap,
  ExternalLink,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const steps = [
  {
    icon: Download,
    step: "01",
    title: "Download the extension",
    description:
      "Clone or download the WriteMate repo from GitHub. You only need the chrome-extension/ folder.",
    action: {
      label: "View on GitHub",
      href: "https://github.com/rahulsuccessive491/writemate",
      external: true,
    },
    tip: 'Click "Code → Download ZIP", then unzip it anywhere on your computer.',
  },
  {
    icon: FolderOpen,
    step: "02",
    title: "Open Chrome Extensions",
    description:
      "In your Chrome browser, type the URL below and press Enter to open the Extensions manager.",
    action: {
      label: "chrome://extensions",
      href: "chrome://extensions",
      external: false,
    },
    tip: "You can also go to Menu → More Tools → Extensions.",
  },
  {
    icon: ToggleRight,
    step: "03",
    title: "Enable Developer Mode",
    description:
      'Toggle on "Developer mode" in the top-right corner of the Extensions page.',
    tip: 'The toggle is labelled "Developer mode" — flip it ON. Three new buttons will appear.',
  },
  {
    icon: Download,
    step: "04",
    title: 'Click "Load unpacked"',
    description:
      'Press the "Load unpacked" button that appears after enabling Developer Mode.',
    tip: "A file picker will open. Navigate to where you saved the repo.",
  },
  {
    icon: FolderOpen,
    step: "05",
    title: "Select the chrome-extension folder",
    description:
      'Inside the repo folder, select only the chrome-extension/ sub-folder and click "Select Folder".',
    tip: 'Make sure you select the chrome-extension/ folder itself — not the file inside it.',
  },
  {
    icon: Pin,
    step: "06",
    title: "Pin WriteMate to your toolbar",
    description:
      "Click the puzzle-piece icon in Chrome's toolbar, find WriteMate, and click the pin icon.",
    tip: "Pinning lets you toggle inline suggestions from the popup without right-clicking.",
  },
];

export default function InstallPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      <Navbar />

      <main className="flex-1 pt-24 pb-24">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
                <Zap size={11} />
                Free · No account needed · 2 minutes
              </div>

              <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-5">
                Install <span className="gradient-text">WriteMate</span>
              </h1>

              <p className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed">
                WriteMate isn&apos;t on the Chrome Web Store yet — install it in developer mode in
                under 2 minutes using the steps below.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Steps */}
        <section className="max-w-3xl mx-auto px-6">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/40 via-indigo-500/20 to-transparent hidden md:block" />

            <div className="space-y-6">
              {steps.map((step, i) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="relative flex gap-6"
                >
                  {/* Icon bubble */}
                  <div className="hidden md:flex flex-shrink-0 w-16 items-start justify-center pt-1">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center z-10 relative">
                      <step.icon size={18} className="text-indigo-400" />
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 card-glow bg-[#13131f] border border-white/8 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="md:hidden w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <step.icon size={14} className="text-indigo-400" />
                        </div>
                        <div>
                          <span className="text-indigo-400 text-xs font-medium">Step {step.step}</span>
                          <h3 className="text-white font-semibold text-lg leading-tight">{step.title}</h3>
                        </div>
                      </div>
                    </div>

                    <p className="text-white/50 text-sm leading-relaxed mb-4">{step.description}</p>

                    {step.action && (
                      <a
                        href={step.action.href}
                        target={step.action.external ? "_blank" : undefined}
                        rel={step.action.external ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors mb-4"
                      >
                        {step.action.label}
                        {step.action.external && <ExternalLink size={13} />}
                      </a>
                    )}

                    <div className="flex items-start gap-2 bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                      <CheckCircle2 size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                      <p className="text-white/35 text-xs leading-relaxed">{step.tip}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Done banner */}
        <section className="max-w-3xl mx-auto px-6 mt-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-glow bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border border-indigo-500/30 rounded-2xl p-8 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
              <Puzzle size={22} className="text-indigo-400" />
            </div>
            <h2 className="text-white font-bold text-2xl mb-2">You&apos;re all set!</h2>
            <p className="text-white/50 text-sm max-w-md mx-auto mb-6 leading-relaxed">
              Select any text on any webpage, right-click, and choose{" "}
              <span className="text-indigo-300 font-medium">Rephrase with WriteMate</span> — or
              use the toolbar popup to toggle inline suggestions.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:scale-105"
            >
              <Zap size={15} />
              Back to home
            </a>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
