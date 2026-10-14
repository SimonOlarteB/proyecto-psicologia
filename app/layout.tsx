import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://aurapsicohumana.com"),
  title: "Psicóloga en Medellín | Aura Elisa Sánchez - Terapia presencial y virtual",
  description:
    "Psicóloga humanista en Medellín. Terapia individual presencial y virtual para ansiedad, depresión, estrés y relaciones. Agenda tu sesión en línea.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "https://aurapsicohumana.com",
    siteName: "Aurapsicohumana",
    title: "Psicóloga en Medellín | Aurapsicohumana",
    description:
      "Terapia psicológica presencial en Medellín y virtual. Agenda tu sesión en línea.",
    // images: ["/og-image.jpg"], // TODO: imagen de 1200x630
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
     className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}