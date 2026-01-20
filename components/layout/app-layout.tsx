"use client";

import { Sidebar } from "./sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background w-full">
      <Sidebar />
      <div className="lg:pl-64 w-full">
        <main className="pt-16 px-4 pb-6 lg:p-4 lg:pt-10 mx-auto max-w-full">{children}</main>
      </div>
    </div>
  );
}

