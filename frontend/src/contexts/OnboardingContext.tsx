import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting element
  action?: () => void;
  completed: boolean;
}

interface OnboardingContextType {
  isOnboardingActive: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  completeStep: (stepId: string) => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY = 'betali_onboarding_completed';

const defaultSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenido a Betali',
    description: 'Te ayudaremos a configurar tu sistema de inventario en unos simples pasos.',
    completed: false,
  },
  {
    id: 'create-warehouse',
    title: 'Crea tu primer almacén',
    description: 'Los almacenes te permiten organizar tu inventario por ubicación física.',
    target: '#create-warehouse-button',
    completed: false,
  },
  {
    id: 'add-products',
    title: 'Agrega productos',
    description: 'Añade los productos que vendes o gestionas en tu negocio.',
    target: '#create-product-button',
    completed: false,
  },
  {
    id: 'add-client',
    title: 'Registra un cliente',
    description: 'Gestiona tus clientes para poder crear órdenes de venta.',
    target: '#create-client-button',
    completed: false,
  },
  {
    id: 'create-order',
    title: 'Crea tu primera venta',
    description: 'Ya estás listo para crear órdenes de venta y gestionar tu inventario.',
    target: '#create-order-button',
    completed: false,
  },
  {
    id: 'complete',
    title: '¡Completado!',
    description: 'Has configurado tu sistema exitosamente. Ahora puedes explorar todas las funcionalidades.',
    completed: false,
  },
];

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>(defaultSteps);

  // Only auto-start onboarding when:
  // 1. Auth is resolved and user is confirmed
  // 2. Organization context is resolved and the user has an active organization
  // 3. The onboarding hasn't been completed before
  useEffect(() => {
    // Wait until both auth and organization are resolved
    if (authLoading || orgLoading) return;

    // If no user (logged out), hide onboarding
    if (!user) {
      setIsOnboardingActive(false);
      return;
    }

    // If user has no organization yet, don't show onboarding —
    // they need to create/join one first
    if (!currentOrganization) {
      setIsOnboardingActive(false);
      return;
    }

    const hasCompleted = localStorage.getItem(STORAGE_KEY);
    if (!hasCompleted) {
      // Auto-start onboarding for new users after a short delay
      const timer = setTimeout(() => {
        setIsOnboardingActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, currentOrganization, orgLoading]);

  const startOnboarding = () => {
    setIsOnboardingActive(true);
    setCurrentStep(0);
    setSteps(defaultSteps.map(step => ({ ...step, completed: false })));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    setIsOnboardingActive(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const completeStep = (stepId: string) => {
    setSteps(prev =>
      prev.map(step => (step.id === stepId ? { ...step, completed: true } : step))
    );
  };

  const completeOnboarding = () => {
    setIsOnboardingActive(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSteps(defaultSteps.map(step => ({ ...step, completed: false })));
    setCurrentStep(0);
  };

  const value: OnboardingContextType = {
    isOnboardingActive,
    currentStep,
    steps,
    startOnboarding,
    nextStep,
    previousStep,
    skipOnboarding,
    completeStep,
    resetOnboarding,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
