import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WriteMate — Rephrase anything, instantly",
  description:
    "WriteMate is a Chrome extension that rewrites your selected text into professional copy, casual messages, bullet points, or concise summaries using AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-full flex flex-col bg-[#0a0a14]">{children}</body>
    </html>
  );
}
