import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SRT Translator",
  description: "Translate SRT subtitles while preserving timestamps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-white font-sans">
        {children}
      </body>
    </html>
  );
}
