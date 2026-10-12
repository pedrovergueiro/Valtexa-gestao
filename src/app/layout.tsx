import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "ValTexa — ERP Corporativo & Gestão Integrada",
  description: "Plataforma central de governança, tarefas hierárquicas, agenda executiva e inteligência da ValTexa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-slate-950 text-slate-100">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}

