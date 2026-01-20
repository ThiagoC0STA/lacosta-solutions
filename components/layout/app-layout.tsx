"use client";

import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <TopBar />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

