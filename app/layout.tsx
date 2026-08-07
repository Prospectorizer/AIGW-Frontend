import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prospector — AI Gateway",
  description: "Ship reliable AI with one intelligent gateway.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('prospector-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}})()` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
