"use client";
import { Zap } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-md bg-[#0a0a14]/80">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-semibold text-white text-sm">WriteMate</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
          <a href="/#features" className="hover:text-white transition-colors">Features</a>
          <a href="/#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="/#demo" className="hover:text-white transition-colors">Demo</a>
          <a href="/install" className="hover:text-white transition-colors">Install</a>
        </div>
        <a
          href="/install"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Add to Chrome
        </a>
      </div>
    </nav>
  );
}
