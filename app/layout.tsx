import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ListingReady｜可信 AI 跨境上新工作台",
  description: "整理多品类商品事实，生成带引用的 Amazon 美国站英文文案，检查风险并导出人工复核资料包。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
