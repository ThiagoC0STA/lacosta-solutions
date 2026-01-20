"use client";

import { Sidebar } from "./sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background w-full">
      <Sidebar />
      <div className="lg:pl-64 w-full">
        <main className="pt-16 px-4 pb-6 sm:pt-20 sm:px-6 lg:p-12 lg:pt-12 mx-auto max-w-full">{children}</main>
      </div>
    </div>
  );
}

