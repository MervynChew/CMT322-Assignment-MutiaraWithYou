import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MobileTabBar, Navbar } from "@/components/layout/navbar";
import { Providers } from "@/components/layout/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mutiara with you",
    template: "%s · Mutiara with you",
  },
  description: "Track Mutiara LRT Line construction and road closures across Penang.",
};

/**
 * Some browsers and extensions (Edge form autofill, password managers,
 * Bitdefender…) stamp attributes such as `fdprocessedid` onto buttons and
 * inputs before React loads, which React reports as a hydration mismatch.
 * This runs first and removes them as they appear, until the page has loaded.
 */
const STRIP_EXTENSION_ATTRIBUTES = `(() => {
  try {
    const names = ["fdprocessedid", "bis_skin_checked", "bis_size", "bis_id"];
    const observer = new MutationObserver((records) => {
      for (const r of records) if (r.attributeName) r.target.removeAttribute(r.attributeName);
    });
    observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: names });
    addEventListener("load", () => setTimeout(() => observer.disconnect(), 5000));
  } catch {}
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: extensions also add attributes to <html>/<body>; this only silences those two tags.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRIBUTES }} />
      </head>
      <body suppressHydrationWarning className="min-h-full bg-slate-50 text-slate-900">
        <Providers>
          {/* Soft colour at the top of every page, so the frosted navbar reads as glass even before scrolling */}
          <div aria-hidden className="mu-aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] overflow-hidden" />
          <Navbar />
          {children}
          <MobileTabBar />
        </Providers>
      </body>
    </html>
  );
}
