import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "VedaAI | Premium AI-Powered Worksheet & Exam Generator",
  description: "Create highly structured, beautiful exam worksheets for students in seconds using advanced curriculum-aligned AI models.",
  icons: {
    icon: "/vedaaaai.png",
    shortcut: "/vedaaaai.png",
    apple: "/vedaaaai.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#f3f4f6] text-gray-800">
        {children}
      </body>
    </html>
  );
}
