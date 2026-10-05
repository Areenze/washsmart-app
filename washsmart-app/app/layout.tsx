import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SwRegister from "@/components/sw-register";
import Analytics from "@/components/analytics";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WashSMART — One Subscription. Multiple Washes.",
  description:
    "Subscribe to WashSMART and get wash credits redeemable at approved car-wash partners across Lagos. One subscription. Multiple washes. No cash at the wash center.",
  keywords: [
    "car wash subscription Lagos",
    "car wash Lagos",
    "car wash membership Lagos",
    "mobile car wash Lagos",
    "car detailing Lagos",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "WashSMART",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    title: "WashSMART — One Subscription. Multiple Washes.",
    description:
      "Subscribe. Get credits. Get washed. Wash credits redeemable at approved car-wash partners across Lagos.",
    images: [{ url: "/images/hero-1.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WashSMART — One Subscription. Multiple Washes.",
    description:
      "Subscribe. Get credits. Get washed. Wash credits redeemable at approved car-wash partners across Lagos.",
    images: ["/images/hero-1.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#34d186",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SwRegister />
        <Analytics />
        {children}
      </body>
    </html>
  );
}
