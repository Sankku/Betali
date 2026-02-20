import React, { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOnboarding } from '@/contexts/OnboardingContext';

export function OnboardingWizard() {
  const { isOnboardingActive, currentStep, steps, nextStep, previousStep, skipOnboarding } =
    useOnboarding();
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});

  const currentStepData = steps[currentStep];

  // Highlight target element
  useEffect(() => {
    const targetSelector = currentStepData?.target;
    if (targetSelector && isOnboardingActive) {
      // Small timeout to allow the DOM to render newly opened tabs/pages
      setTimeout(() => {
        const element = document.querySelector(targetSelector) as HTMLElement;
        if (element) {
          setHighlightedElement(element);
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          setHighlightedElement(null);
        }
      }, 100);
    } else {
      setHighlightedElement(null);
    }
  }, [currentStep, currentStepData, isOnboardingActive]);

  // Position the tooltip and arrow
  useEffect(() => {
    const updatePosition = () => {
      if (!isOnboardingActive) return;

      if (highlightedElement) {
        const rect = highlightedElement.getBoundingClientRect();
        const popupWidth = 384; // max-w-sm = 24rem = 384px width approximately
        const estimatedHeight = 320; // assumed height
        const padding = 20;

        const spaceRight = window.innerWidth - rect.right;
        const spaceLeft = rect.left;
        const spaceBottom = window.innerHeight - rect.bottom;

        let style: React.CSSProperties = { position: 'fixed', zIndex: 50, width: '100%', maxWidth: '24rem' };
        let arrow: React.CSSProperties = { position: 'absolute', width: 0, height: 0, zIndex: 51 };

        if (spaceRight > popupWidth + padding) {
          // Show on the right
          style.left = rect.right + padding;
          let topPos = rect.top + rect.height / 2 - estimatedHeight / 2;
          topPos = Math.max(padding, Math.min(topPos, window.innerHeight - estimatedHeight - padding));
          style.top = topPos;

          arrow.left = -8;
          arrow.top = rect.top + rect.height / 2 - topPos - 8;
          arrow.top = Math.max(16, Math.min(Number(arrow.top), estimatedHeight - 32));
          arrow.borderTop = '8px solid transparent';
          arrow.borderBottom = '8px solid transparent';
          arrow.borderRight = '8px solid white';
        } else if (spaceLeft > popupWidth + padding) {
          // Show on the left
          style.left = rect.left - popupWidth - padding;
          let topPos = rect.top + rect.height / 2 - estimatedHeight / 2;
          topPos = Math.max(padding, Math.min(topPos, window.innerHeight - estimatedHeight - padding));
          style.top = topPos;

          arrow.right = -8;
          arrow.top = rect.top + rect.height / 2 - topPos - 8;
          arrow.top = Math.max(16, Math.min(Number(arrow.top), estimatedHeight - 32));
          arrow.borderTop = '8px solid transparent';
          arrow.borderBottom = '8px solid transparent';
          arrow.borderLeft = '8px solid white';
        } else if (spaceBottom > estimatedHeight + padding) {
          // Show at the bottom
          style.top = rect.bottom + padding;
          let leftPos = rect.left + rect.width / 2 - popupWidth / 2;
          leftPos = Math.max(padding, Math.min(leftPos, window.innerWidth - popupWidth - padding));
          style.left = leftPos;

          arrow.top = -8;
          arrow.left = rect.left + rect.width / 2 - leftPos - 8;
          arrow.left = Math.max(16, Math.min(Number(arrow.left), popupWidth - 32));
          arrow.borderLeft = '8px solid transparent';
          arrow.borderRight = '8px solid transparent';
          arrow.borderBottom = '8px solid white';
        } else {
          // Fallback to center
          style.top = '50%';
          style.left = '50%';
          style.transform = 'translate(-50%, -50%)';
          arrow.display = 'none';
        }

        setTooltipStyle(style);
        setArrowStyle(arrow);
      } else {
        // Fallback to center if element not found
        setTooltipStyle({
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          width: '100%',
          maxWidth: '24rem',
        });
        setArrowStyle({ display: 'none' });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [highlightedElement, isOnboardingActive, currentStep]);

  if (!isOnboardingActive || !currentStepData) return null;

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${highlightedElement ? 'bg-black/40' : 'bg-black/50'}`} 
        onClick={skipOnboarding} 
      />

      {/* Dynamic Highlight Cutout using Box Shadow */}
      {highlightedElement && (
        <div
          className="fixed z-40 pointer-events-none transition-all duration-300 ease-in-out"
          style={{
            top: highlightedElement.getBoundingClientRect().top - 8,
            left: highlightedElement.getBoundingClientRect().left - 8,
            width: highlightedElement.getBoundingClientRect().width + 16,
            height: highlightedElement.getBoundingClientRect().height + 16,
            border: '2px solid #10b981',
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0)', // Replaced overlay dimming here as we handle it cleanly with the overlay div backdrop
          }}
        />
      )}

      {/* Wizard Card Popup */}
      <div style={tooltipStyle} className="px-4 transition-all duration-300 ease-in-out">
        <Card className="shadow-2xl relative w-full border-0">
          {/* Arrow Pointer */}
          <div style={arrowStyle} />

          {/* Close Button */}
          <button
            onClick={skipOnboarding}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </button>

          <CardContent className="p-6 pt-5 bg-white rounded-xl relative z-10">
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
    </>
  );
}

