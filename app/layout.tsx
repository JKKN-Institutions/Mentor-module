import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { BugReporterWrapper } from "@/components/providers/BugReporterWrapper";
import { Toaster } from 'react-hot-toast';

// Professional font for entire application.
// Weight 300 dropped (no font-light usage); Inter removed (was never referenced).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "JKKN Mentor",
  description: "Devloped by Roja",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} antialiased`}
        style={{ fontFamily: "var(--font-poppins)" }}
        suppressHydrationWarning
      >
        <AuthProvider>
          <BugReporterWrapper>
            <ToastProvider>
              {children}
            </ToastProvider>
          </BugReporterWrapper>
        </AuthProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
