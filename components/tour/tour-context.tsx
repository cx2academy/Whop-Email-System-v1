'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { markTourCompleted } from '@/lib/user/actions';

export interface TourStep {
  id: string; // The CSS ID of the element to highlight
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  actionType?: 'click' | 'navigate' | 'view' | 'async-click'; 
}

interface TourContextType {
  isActive: boolean;
  stepIndex: number;
  steps: TourStep[];
  startTour: (steps: TourStep[]) => void;
  nextStep: () => void;
  endTour: () => Promise<void>;
  skipTour: () => Promise<void>;
  setSteps: (steps: TourStep[]) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const router = useRouter();

  const startTour = (initialSteps: TourStep[]) => {
    setSteps(initialSteps);
    setStepIndex(0);
    setIsActive(true);
  };

  const nextStep = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      endTour();
    }
  };

  const endTour = async () => {
    setIsActive(false);
    setStepIndex(0);
    await markTourCompleted();
    
    // Clear the demo data from local DB
    try {
        await fetch('/api/tour/cleanup', { method: 'POST' });
    } catch (e) {
        // ignore
    }
    
    router.push('/dashboard');
  };

  const skipTour = async () => {
    setIsActive(false);
    await markTourCompleted();

    // Also cleanup if skipped, just in case they reached a step that created data
    try {
        await fetch('/api/tour/cleanup', { method: 'POST' });
    } catch (e) {
        // ignore
    }
  };

  return (
    <TourContext.Provider value={{ isActive, stepIndex, steps, startTour, nextStep, endTour, skipTour, setSteps }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
