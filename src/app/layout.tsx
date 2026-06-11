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
  title: "glifsguide — a GLiFS guide by Efdot fans",
  description:
    "glifsguide — an open-source, zoomable map + dictionary of the 300 GLiFS by Efdot, sorted into collections. Unofficial. No wallet connect, ever.",
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
