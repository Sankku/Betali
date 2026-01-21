import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../../ui/button';

interface UpgradePromptProps {
  /** Feature name being requested */
  feature: string;

  /** Custom message to display */
  message?: string;

  /** Required plan name */
  requiredPlan?: string;

  /** Variant of the prompt */
  variant?: 'card' | 'banner' | 'modal' | 'inline';

  /** Size of the prompt */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * UpgradePrompt - Displays an upgrade prompt when a feature is locked
 *
 * @example
 * <UpgradePrompt
 *   feature="API Access"
 *   requiredPlan="Professional"
 *   message="Unlock API access to integrate Betali with your existing tools"
 * />
 */
export function UpgradePrompt({
  feature,
  message,
  requiredPlan,
  variant = 'card',
  size = 'md'
}: UpgradePromptProps) {
  const navigate = useNavigate();

  const defaultMessage = message || `Upgrade your plan to unlock ${feature}`;

  if (variant === 'banner') {
    return (
      <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Lock className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900">
              {requiredPlan ? `${requiredPlan} Plan Required` : 'Upgrade Required'}
            </h4>
            <p className="mt-1 text-sm text-gray-600">{defaultMessage}</p>
          </div>
          <div className="flex-shrink-0">
            <Button
              onClick={() => navigate('/pricing')}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Upgrade Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Lock className="h-4 w-4 text-gray-400" />
        <span className="text-gray-600">{defaultMessage}</span>
        <button
          onClick={() => navigate('/pricing')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Upgrade
        </button>
      </div>
    );
  }

  // Card variant (default)
  const sizeClasses = {
    sm: 'p-6',
    md: 'p-8',
    lg: 'p-12'
  };

  return (
    <div className={`rounded-2xl bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-dashed border-gray-300 ${sizeClasses[size]}`}>
      <div className="text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mb-4">
          <Lock className="h-8 w-8 text-blue-600" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {requiredPlan ? `${requiredPlan} Plan Required` : 'Unlock This Feature'}
        </h3>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          {defaultMessage}
        </p>

        {/* Features List (if required plan is specified) */}
        {requiredPlan && (
          <div className="bg-white rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-medium text-gray-900 mb-2">
              With {requiredPlan} plan you get:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Access to {feature}</span>
              </li>
              {requiredPlan === 'Professional' && (
                <>
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>Advanced analytics and reports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>Priority customer support</span>
                  </li>
                </>
              )}
              {requiredPlan === 'Enterprise' && (
                <>
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>Unlimited users and resources</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>Dedicated account manager</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>24/7 premium support</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate('/pricing')}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            View Plans
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            onClick={() => navigate('/contact')}
            variant="outline"
            className="flex-1"
          >
            Contact Sales
          </Button>
        </div>

        {/* Fine print */}
        <p className="mt-4 text-xs text-gray-500">
          Cancel anytime. No long-term contracts.
        </p>
      </div>
    </div>
  );
}
