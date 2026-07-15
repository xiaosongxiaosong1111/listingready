import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ListingReady｜跨境商品本地化上新助手",
  description: "把中文商品资料转成可检查的 Amazon 美国站 Listing。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
