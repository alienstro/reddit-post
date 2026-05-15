import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reddit JSON Reader",
  description: "Read hot Reddit posts and comments through a Django proxy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
