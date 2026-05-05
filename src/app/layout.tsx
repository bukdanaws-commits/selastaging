import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sheila On 7 — Melompat Lebih Tinggi Tour 2026 | Jakarta",
  description: "Konser Sheila On 7 Melompat Lebih Tinggi Tour 2026 di GBK Madya Stadium Jakarta. 25 April 2026. Dapatkan tiket sekarang — Sobat Duta!",
  keywords: ["Sheila On 7", "Melompat Lebih Tinggi", "Konser Jakarta", "GBK Madya", "Tiket Konser", "Sobat Duta"],
  authors: [{ name: "Sheila On 7 Tour 2026" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Sheila On 7 — Melompat Lebih Tinggi Tour 2026 | Jakarta",
    description: "Konser Sheila On 7 Melompat Lebih Tinggi Tour 2026 di GBK Madya Stadium Jakarta. 25 April 2026.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sheila On 7 — Melompat Lebih Tinggi Tour 2026",
    description: "Konser Sheila On 7 Melompat Lebih Tinggi Tour 2026. GBK Madya, 25 April 2026.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
