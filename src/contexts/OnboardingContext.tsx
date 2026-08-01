import React, { createContext, useContext, useState, useEffect } from 'react';

interface OnboardingContextType {
  firstName: string;
  setFirstName: (name: string) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firstName, setFirstNameState] = useState<string>(() => {
    return localStorage.getItem('villaoro_onboarding_firstname') || '';
  });

  const setFirstName = (name: string) => {
    setFirstNameState(name);
    localStorage.setItem('villaoro_onboarding_firstname', name);
  };

  return (
    <OnboardingContext.Provider value={{ firstName, setFirstName }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
