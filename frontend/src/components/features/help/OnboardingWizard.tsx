import React, { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { cn } from '@/lib/utils';

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
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg px-4">
        <Card className="shadow-2xl">
          <CardContent className="p-6">
            {/* Close Button */}
            <button
              onClick={skipOnboarding}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>
                  Paso {currentStep + 1} de {steps.length}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                {currentStepData.completed ? (
                  <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold">{currentStep + 1}</span>
                  </div>
                )}
                <h2 className="text-2xl font-bold text-gray-900">{currentStepData.title}</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">{currentStepData.description}</p>
            </div>

            {/* Step Indicators */}
            <div className="flex gap-2 mb-6">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all',
                    index <= currentStep ? 'bg-green-600' : 'bg-gray-200'
                  )}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={previousStep}
                disabled={currentStep === 0}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              <Button onClick={nextStep} className="flex-1">
                {currentStep === steps.length - 1 ? (
                  <>
                    Finalizar
                    <Check className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Skip Button */}
            <button
              onClick={skipOnboarding}
              className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
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
