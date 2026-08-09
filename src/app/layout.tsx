import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { Providers } from "./providers";

const fontUi = Inter({ variable: "--font-ui", subsets: ["latin"] });
const fontDisplay = Source_Serif_4({ variable: "--font-display", subsets: ["latin"] });
const fontMono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pravax — Markets that can explain how they resolve",
  description:
    "GenLayer-native prediction resolution protocol. Create future-event markets with locked rules, explicit sources, and evidence-grounded validator consensus.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fontUi.variable} ${fontDisplay.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <Providers>
          <NavBar />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
