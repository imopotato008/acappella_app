"use client";

import React from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Header } from "@/components/Header";
import { LoginForm } from "@/components/LoginForm";

function AuthContent({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <LoginForm />;
  }

  return (
    <>
      <Header />
      <main className="flex-1 pb-16 md:pb-12">{children}</main>
    </>
  );
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppProvider>
        <AuthContent>{children}</AuthContent>
      </AppProvider>
    </ThemeProvider>
  );
}
