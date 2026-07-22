"use client";

import { createContext, useContext, useState } from "react";

type AppContextType = {
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentProjectId, setCurrentProjectId] =
    useState<string | null>("project-001");

  return (
    <AppContext.Provider
      value={{
        currentProjectId,
        setCurrentProjectId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error(
      "useApp deve ser utilizado dentro de AppProvider."
    );
  }

  return context;
}