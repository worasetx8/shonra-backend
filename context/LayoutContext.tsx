import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LayoutContextType {
  headerContent: ReactNode | null;
  setHeaderContent: (content: ReactNode | null) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [headerContent, setHeaderContent] = useState<ReactNode | null>(null);

  return (
    <LayoutContext.Provider value={{ headerContent, setHeaderContent }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

