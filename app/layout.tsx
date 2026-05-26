import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BSO Operation",
  description: "BSO operation task board backed by Supabase.",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
