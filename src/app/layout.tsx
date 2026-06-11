import type { Metadata } from "next";
import { Geist, Geist_Mono, Permanent_Marker, Fredoka, Orbitron } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const crayon = Permanent_Marker({
  variable: "--font-crayon",
  weight: "400",
  subsets: ["latin"],
});

// Rounded brand face for the GLIFS wordmark
const brand = Fredoka({
  variable: "--font-brand",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

// Futuristic face for "guide"
const future = Orbitron({
  variable: "--font-future",
  weight: ["500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "glif dictionary — built by tut",
  description:
    "An open-source dictionary of the GLiFS by Efdot. See all 300, sort them by collection, and build the language.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${crayon.variable} ${brand.variable} ${future.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
