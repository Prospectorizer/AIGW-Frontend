import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relay — AI Gateway",
  description: "Ship reliable AI with one intelligent gateway.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
