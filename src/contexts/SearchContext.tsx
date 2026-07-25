import React, { createContext, useContext, useState } from "react";

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedColor: string | null;
  setSelectedColor: (color: string | null) => void;
  selectedDesigner: string | null;
  setSelectedDesigner: (designer: string | null) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedDesigner, setSelectedDesigner] = useState<string | null>(null);

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery, selectedColor, setSelectedColor, selectedDesigner, setSelectedDesigner }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) throw new Error("useSearch must be used within SearchProvider");
  return context;
};
