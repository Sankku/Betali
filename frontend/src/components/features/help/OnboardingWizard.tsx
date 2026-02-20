import React, { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOnboarding } from '@/contexts/OnboardingContext';

export function OnboardingWizard() {
  const { isOnboardingActive, currentStep, steps, nextStep, previousStep, skipOnboarding } =
    useOnboarding();
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);

  const currentStepData = steps[currentStep];

  // Highlight target element
  useEffect(() => {
    if (currentStepData?.target && isOnboardingActive) {
      const element = document.querySelector(currentStepData.target) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setHighlightedElement(null);
    }
  }, [currentStep, currentStepData, isOnboardingActive]);

  if (!isOnboardingActive) return null;

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={skipOnboarding} />

      {/* Wizard Card */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm px-4">
        <Card className="shadow-2xl relative">
          {/* Close Button */}
          <button
            onClick={skipOnboarding}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </button>

          <CardContent className="p-6 pt-5">
            {/* Progress Bar */}
            <div className="mb-6 pr-6">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Paso {currentStep + 1} de {steps.length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                {currentStepData.completed ? (
                  <div className="w-10 h-10 shrink-0 rounded-full bg-green-600 flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <div className="w-10 h-10 shrink-0 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{currentStep + 1}</span>
                  </div>
                )}
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{currentStepData.title}</h2>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{currentStepData.description}</p>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={previousStep}
                disabled={currentStep === 0}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button onClick={nextStep} className="flex-1">
                {currentStep === steps.length - 1 ? (
                  <>
                    Finalizar
                    <Check className="h-4 w-4 ml-1 text-white" />
                  </>
                ) : (
                  <>
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1 text-white" />
                  </>
                )}
              </Button>
            </div>

            {/* Skip Button */}
            <button
              onClick={skipOnboarding}
              className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Omitir tour guiado
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Highlight Target Element */}
      {highlightedElement && (
        <div
          className="fixed z-40 pointer-events-none"
          style={{
            top: highlightedElement.getBoundingClientRect().top - 8,
            left: highlightedElement.getBoundingClientRect().left - 8,
            width: highlightedElement.getBoundingClientRect().width + 16,
            height: highlightedElement.getBoundingClientRect().height + 16,
            border: '3px solid #10b981',
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          }}
        />
      )}
    </>
  );
}
