import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elsewhere: Try on the lives first",
  description: "A mobile-first decision instrument for careers, moving, relationships, education, and the life choices living in your Notes app.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
