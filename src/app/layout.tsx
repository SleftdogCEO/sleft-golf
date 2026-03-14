import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { CapacitorBridge } from "@/components/capacitor-bridge";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0f0e",
};

export const metadata: Metadata = {
  title: "Sleft Golf",
  description: "The social network for golfers",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sleft Golf",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased`}>
        <CapacitorBridge />
        {children}
      </body>
    </html>
  );
}
