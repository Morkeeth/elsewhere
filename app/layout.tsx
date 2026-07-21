import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elsewhere: Try on the lives first",
  description: "A mobile-first decision instrument for consequential career and moving choices: rehearse the lives, find the hinge, and test it in reality.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
