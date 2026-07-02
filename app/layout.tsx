import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market Breadth Monitor",
  description: "NSE India market breadth dashboard — live daily readings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
