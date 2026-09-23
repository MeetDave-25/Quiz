import type { Metadata } from "next";
import { SocketProvider } from "./socket-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "KALANJALI 2026 | LJ University GK Quiz Championship",
  description: "Live Inter-College GK Quiz Competition at LJ University Ahmedabad",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
