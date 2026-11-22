import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PetMCP｜毛孩健康手帳",
  description: "自己的寵物、自己的紀錄。保留血檢原始數值、照護日常與食品標籤。",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant-TW">
      <body className="antialiased">{children}</body>
    </html>
  );
}
