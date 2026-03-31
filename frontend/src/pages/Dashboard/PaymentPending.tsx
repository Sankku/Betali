import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '../../lib/toast';
import { Clock, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { DashboardLayout } from '../../components/layout/Dashboard';
import { useTranslation } from '../../contexts/LanguageContext';

export default function PaymentPending() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const paymentId = searchParams.get('payment_id');
  const subscriptionId = searchParams.get('subscription_id') || searchParams.get('external_reference');

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Pending Header */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-white rounded-full p-4">
                  <Clock className="h-16 w-16 text-yellow-500 animate-pulse" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {t('payments.pending.title')}
              </h1>
              <p className="text-yellow-100 text-lg">
                {t('payments.pending.subtitle')}
              </p>
            </div>

            {/* Details */}
            <div className="p-8">
              {paymentId && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {t('payments.pending.detailsTitle')}
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{t('payments.pending.paymentId')}</span>
                      <span className="font-mono text-sm text-gray-900">{paymentId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{t('payments.pending.statusLabel')}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {t('payments.pending.statusPending')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Information Card */}
              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  {t('payments.pending.whatMeansTitle')}
                </h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <p>
                    {t('payments.pending.whatMeansDesc')}
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span><strong>{t('payments.pending.cashTitle')}</strong> {t('payments.pending.cashDesc')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span><strong>{t('payments.pending.transferTitle')}</strong> {t('payments.pending.transferDesc')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span><strong>{t('payments.pending.verificationTitle')}</strong> {t('payments.pending.verificationDesc')}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">{t('payments.pending.nextStepsTitle')}</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">1.</span>
                    <span>{t('payments.pending.step1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">2.</span>
                    <span>{t('payments.pending.step2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">3.</span>
                    <span>{t('payments.pending.step3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">4.</span>
                    <span>{t('payments.pending.step4')}</span>
                  </li>
                </ul>
              </div>

              {/* Important Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-900">
                  <strong>{t('payments.pending.importantNote')}</strong> {t('payments.pending.importantDesc')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                >
                  {t('payments.pending.goToDashboard')}
                </Button>
                <Button
                  onClick={() => navigate('/pricing')}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('payments.pending.viewPlans')}
                </Button>
              </div>

              {/* Support Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  {t('payments.pending.needHelp')}{' '}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('betali.business@gmail.com');
                      toast.success('Email copiado al portapapeles');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('payments.pending.contactSupport')}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
