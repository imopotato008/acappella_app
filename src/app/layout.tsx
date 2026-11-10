import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "Acappella Band Hub - アカペラバンド運営",
  description: "アカペラバンド専用の日程調整・バンド運営支援Webアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased font-sans">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
