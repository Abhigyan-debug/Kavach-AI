import type { Metadata, Viewport } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { MotionProvider } from "./components/MotionProvider";

const display = Outfit({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Telemetry labels and readouts only; body text stays Inter for readability.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mono",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kavach - AI Scam Shield for Families",
  description:
    "Check if a message is a scam, practise against a safe AI scammer, and tell your family when the risk is real.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { title: "Kavach", statusBarStyle: "black-translucent" },
  // Pairs with appleWebApp: browsers deprecate the Apple-only tag on its own.
  other: { "mobile-web-app-capable": "yes" },
  // Declared explicitly: any `icons` value overrides Next's file-based icon
  // convention, so omitting `icon` here would silently drop the favicon link.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1018",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Runs before first paint. Turns the boot intro on only for: the landing page,
 * people who have not asked for reduced motion, and the first visit this
 * session. Doing this before React loads means the overlay is there from frame
 * one, with no flash of the page underneath.
 */
const BOOT_SCRIPT = `(function(){try{
if(location.pathname!=="/")return;
if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
if(sessionStorage.getItem("kavach.intro"))return;
document.documentElement.setAttribute("data-intro","on");
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: BOOT_SCRIPT may add data-intro to <html> before
    // React hydrates. It applies to this element only, not its children.
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body className="font-body antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
