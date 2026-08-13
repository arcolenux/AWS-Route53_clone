import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWS Route 53",
  description: "Amazon Route 53 DNS Management Console Clone",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}