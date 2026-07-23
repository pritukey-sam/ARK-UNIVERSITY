import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

const inter = Inter({
 subsets: ["latin"],
 variable: "--font-inter",
});

const poppins = Poppins({
 subsets: ["latin"],
 weight: ["400", "500", "600", "700", "800", "900"],
 variable: "--font-poppins",
});

export const metadata: Metadata = {
 title: "ARK University LMS | Premium Learning",
 description: "Empower your workforce with smart learning.",
};

import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <html lang="en">
 <body className={`${inter.variable} ${poppins.variable} antialiased min-h-screen font-sans`}>
 <AuthProvider>
 <ClientLayoutWrapper>
 {children}
 </ClientLayoutWrapper>
 <Toaster position="top-right" />
 </AuthProvider>
 </body>
 </html>
 );
}
