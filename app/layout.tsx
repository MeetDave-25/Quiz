import type { Metadata } from "next";
import { SocketProvider } from "./socket-provider";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "KALANJALI 2026 | LJ University GK Quiz Championship",
  description: "Live Inter-College GK Quiz Competition at LJ University Ahmedabad",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LangProvider>
          <SocketProvider>
            {children}
          </SocketProvider>
        </LangProvider>
      </body>
    </html>
  );
}
