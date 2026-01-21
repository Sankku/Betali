import { ReactNode } from 'react';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import { UpgradePrompt } from './UpgradePrompt';
import { Loader2 } from 'lucide-react';

interface FeatureGateProps {
  /** Feature key to check access for */
  feature: string;

  /** Content to show if user has access */
  children: ReactNode;

  /** Optional custom fallback to show if no access */
  fallback?: ReactNode;

  /** Whether to show upgrade prompt when no access (default: true) */
  showUpgradePrompt?: boolean;

  /** Custom message for upgrade prompt */
  upgradeMessage?: string;

  /** Required plan name for the feature */
  requiredPlan?: string;

  /** If true, hides content instead of showing upgrade prompt */
  hideWhenLocked?: boolean;
}

/**
 * FeatureGate - Conditionally renders content based on feature access
 *
 * @example
 * // Basic usage
 * <FeatureGate feature="api_access">
 *   <APISettings />
 * </FeatureGate>
 *
 * @example
 * // With custom upgrade message
 * <FeatureGate
 *   feature="advanced_analytics"
 *   requiredPlan="Professional"
 *   upgradeMessage="Unlock advanced analytics and custom reports"
 * >
 *   <AnalyticsDashboard />
 * </FeatureGate>
 *
 * @example
 * // Hide when locked instead of showing upgrade prompt
 * <FeatureGate feature="custom_reports" hideWhenLocked>
 *   <CustomReportsSection />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  upgradeMessage,
  requiredPlan,
  hideWhenLocked = false
}: FeatureGateProps) {
  const { hasAccess, loading } = useFeatureAccess(feature);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access
  if (hideWhenLocked) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return (
      <UpgradePrompt
        feature={feature}
        message={upgradeMessage}
        requiredPlan={requiredPlan}
      />
    );
  }

  return null;
}

/**
 * FeatureButton - Renders a button that's disabled when feature is locked
 *
 * @example
 * <FeatureButton
 *   feature="api_access"
 *   onClick={generateAPIKey}
 *   className="btn-primary"
 * >
 *   Generate API Key
 * </FeatureButton>
 */
interface FeatureButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  feature: string;
  children: ReactNode;
  showTooltip?: boolean;
}

export function FeatureButton({
  feature,
  children,
  showTooltip = true,
  className = '',
  ...props
}: FeatureButtonProps) {
  const { hasAccess, loading } = useFeatureAccess(feature);

  return (
    <button
      {...props}
      disabled={!hasAccess || loading || props.disabled}
      className={`${className} ${!hasAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={!hasAccess && showTooltip ? 'Upgrade your plan to use this feature' : undefined}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}

/**
 * FeatureBadge - Shows a badge indicating feature availability
 *
 * @example
 * <div className="flex items-center gap-2">
 *   <h3>API Access</h3>
 *   <FeatureBadge feature="api_access" />
 * </div>
 */
interface FeatureBadgeProps {
  feature: string;
  showWhenUnlocked?: boolean;
}

export function FeatureBadge({ feature, showWhenUnlocked = false }: FeatureBadgeProps) {
  const { hasAccess, loading } = useFeatureAccess(feature);

  if (loading) return null;

  if (hasAccess && !showWhenUnlocked) return null;

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${hasAccess
          ? 'bg-green-100 text-green-800'
          : 'bg-gray-100 text-gray-600'
        }
      `}
    >
      {hasAccess ? 'Available' : 'Locked'}
    </span>
  );
}
