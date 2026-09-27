import "./globals.css";
import { PortfolioProvider } from "@/context/PortfolioContext";
import { HouseholdProvider } from "@/context/HouseholdContext";

export const metadata = {
  title: "Finlight Wealth — Family Wealth Decision Platform",
  description: "Enterprise-grade wealth tracking and deterministic decision simulation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        <PortfolioProvider>
          <HouseholdProvider>
            {children}
          </HouseholdProvider>
        </PortfolioProvider>
      </body>
    </html>
  );
}
