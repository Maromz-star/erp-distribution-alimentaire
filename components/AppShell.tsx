"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export function AppShell({
  nomUtilisateur,
  role,
  alertesStock,
  children,
}: {
  nomUtilisateur: string;
  role: Role;
  alertesStock: number;
  children: React.ReactNode;
}) {
  const [sidebarOuverte, setSidebarOuverte] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} ouverte={sidebarOuverte} onFermer={() => setSidebarOuverte(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar
          nomUtilisateur={nomUtilisateur}
          role={role}
          alertesStock={alertesStock}
          onOuvrirMenu={() => setSidebarOuverte(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
