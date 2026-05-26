import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
            <Zap size={12} className="text-white" />
          </div>
          <span className="text-white/40 text-sm">WriteMate</span>
        </div>
        <p className="text-white/20 text-sm">Built with Next.js · Powered by Groq · Open source</p>
      </div>
    </footer>
  );
}
