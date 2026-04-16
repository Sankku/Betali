import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Link, Unlink, ExternalLink, CheckCircle, Loader2, Copy, Bell, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { useToast } from '../../../hooks/useToast';
import { httpClient } from '../../../services/http/httpClient';
import { Switch } from '../../ui/switch';
import { useTranslation } from '../../../contexts/LanguageContext';

interface TelegramPreferences {
  alerts_enabled: boolean;
  daily_digest_enabled: boolean;
  daily_digest_time_utc: string;
}

interface TelegramConnection {
  telegram_username: string | null;
  telegram_name: string | null;
  linked_at: string;
  alerts_enabled: boolean;
  daily_digest_enabled: boolean;
  daily_digest_time: string | null;
  alert_min_severity: string;
}

interface TelegramStatus {
  linked: boolean;
  connection: TelegramConnection | null;
}

interface TeamConnection {
  telegram_name: string | null;
  telegram_username: string | null;
  linked_at: string;
}

interface LinkTokenResponse {
  token: string;
  deepLink: string;
  expiresInMinutes: number;
}

// ── Timezone helpers ─────────────────────────────────────────────────────────

function utcTimeToLocal(utcTime: string): string {
  if (!utcTime) return '08:00';
  const [h, m] = utcTime.split(':').map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function localTimeToUtc(localTime: string): string {
  if (!localTime) return '08:00';
  const [h, m] = localTime.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TelegramSettings() {
  const [deepLink, setDeepLink]         = useState<string | null>(null);
  const [linkCopied, setLinkCopied]     = useState(false);
  const [alertsEnabled, setAlertsEnabled]   = useState(true);
  const [digestEnabled, setDigestEnabled]   = useState(true);
  const [digestTimeLocal, setDigestTimeLocal] = useState('08:00');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: status, isLoading } = useQuery<TelegramStatus>({
    queryKey: ['telegram-status'],
    queryFn: () => httpClient.get<TelegramStatus>('/api/telegram/status'),
  });

  const { data: teamData } = useQuery<{ connections: TeamConnection[] }>({
    queryKey: ['telegram-team-connections'],
    queryFn: () => httpClient.get('/api/telegram/team-connections'),
  });

  const conn = status?.connection;

  // Sync local state from server data
  useEffect(() => {
    if (!conn) return;
    setAlertsEnabled(conn.alerts_enabled ?? true);
    setDigestEnabled(conn.daily_digest_enabled ?? true);
    setDigestTimeLocal(conn.daily_digest_time ? utcTimeToLocal(conn.daily_digest_time) : '08:00');
  }, [conn]);

  const { mutate: generateLink, isPending: isGenerating } = useMutation({
    mutationFn: () => httpClient.post<LinkTokenResponse>('/api/telegram/link-token', {}),
    onSuccess: (data) => setDeepLink(data.deepLink),
    onError: () => toast({ title: 'Error al generar el link', variant: 'destructive' }),
  });

  const { mutate: unlink, isPending: isUnlinking } = useMutation({
    mutationFn: () => httpClient.delete('/api/telegram/unlink'),
    onSuccess: () => {
      setDeepLink(null);
      queryClient.invalidateQueries({ queryKey: ['telegram-status'] });
      toast({ title: 'Telegram desvinculado correctamente' });
    },
    onError: () => toast({ title: 'Error al desvincular', variant: 'destructive' }),
  });

  const { mutate: savePreferences, isPending: isSaving } = useMutation({
    mutationFn: (prefs: TelegramPreferences) =>
      httpClient.patch('/api/telegram/preferences', prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-status'] });
      toast({ title: '✅ Preferencias guardadas' });
    },
    onError: () => toast({ title: 'Error al guardar preferencias', variant: 'destructive' }),
  });

  const handleSavePreferences = () => {
    savePreferences({
      alerts_enabled: alertsEnabled,
      daily_digest_enabled: digestEnabled,
      daily_digest_time_utc: localTimeToUtc(digestTimeLocal),
    });
  };

  const handleCopyLink = async () => {
    if (!deepLink) return;
    await navigator.clipboard.writeText(deepLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const prefsChanged = conn
    ? alertsEnabled !== conn.alerts_enabled ||
      digestEnabled !== conn.daily_digest_enabled ||
      (conn.daily_digest_time ? utcTimeToLocal(conn.daily_digest_time) : '08:00') !== digestTimeLocal
    : false;

  if (isLoading) {
    return (
      <Card id="telegram-settings-section" className="bg-white dark:bg-neutral-800/90 shadow-sm border border-neutral-200 dark:border-neutral-700/50 backdrop-blur-md">
        <CardHeader className="border-b border-neutral-100 dark:border-neutral-700/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            Telegram
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-neutral-500 justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span>{t('settings.telegram.loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="telegram-settings-section" className="bg-white dark:bg-neutral-800/90 shadow-sm border border-neutral-200 dark:border-neutral-700/50 backdrop-blur-md overflow-hidden transition-all duration-300">
      <CardHeader className="border-b border-neutral-100 dark:border-neutral-700/50 bg-neutral-50/50 dark:bg-neutral-900/20">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-500/20 rounded-md">
            <MessageCircle className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          </div>
          {t('settings.telegram.cardTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">

        {status?.linked ? (
          <div className="space-y-6">

            {/* Cuenta vinculada */}
            <div className="flex items-start gap-4 p-4 bg-success-50 dark:bg-success-500/10 border border-success-200 dark:border-success-500/20 rounded-xl transition-colors">
              <CheckCircle className="h-5 w-5 text-success-600 dark:text-success-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-success-900 dark:text-success-400">{t('settings.telegram.linkedStatus')}</p>
                {conn?.telegram_name && (
                  <p className="text-sm font-medium text-success-800 dark:text-success-300 mt-0.5">
                    {conn.telegram_name}
                    {conn.telegram_username && <span className="text-success-600 dark:text-success-500/80 font-normal ml-1">(@{conn.telegram_username})</span>}
                  </p>
                )}
                {conn?.linked_at && (
                  <p className="text-xs text-success-700/80 dark:text-success-500/60 mt-1">
                    {t('settings.telegram.linkedAt', { date: new Date(conn.linked_at).toLocaleDateString() })}
                  </p>
                )}
              </div>
            </div>

            {/* Preferencias de notificaciones */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-200 flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-700 pb-2">
                <Bell className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                {t('settings.telegram.preferencesTitle')}
              </h4>

              {/* Toggle: alertas habilitadas */}
              <div className="flex items-center justify-between gap-4 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg transition-colors cursor-pointer" onClick={() => setAlertsEnabled(!alertsEnabled)}>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{t('settings.telegram.alertsTitle')}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {t('settings.telegram.alertsDesc')}
                  </p>
                </div>
                <Switch
                  checked={alertsEnabled}
                  onCheckedChange={setAlertsEnabled}
                />
              </div>

              {alertsEnabled && (
                <div className="ml-4 pl-4 border-l-2 border-neutral-100 dark:border-neutral-700 space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                  {/* Toggle: resumen diario */}
                  <div className="flex items-center justify-between gap-4 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg transition-colors cursor-pointer" onClick={() => setDigestEnabled(!digestEnabled)}>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{t('settings.telegram.digestTitle')}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {t('settings.telegram.digestDesc')}
                      </p>
                    </div>
                    <Switch
                      checked={digestEnabled}
                      onCheckedChange={setDigestEnabled}
                    />
                  </div>

                  {/* Time picker */}
                  {digestEnabled && (
                    <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/30 rounded-lg border border-neutral-100 dark:border-neutral-700 animate-in fade-in slide-in-from-top-1 duration-300">
                      <div className="p-1.5 bg-white dark:bg-neutral-800 rounded shadow-sm border border-neutral-200 dark:border-neutral-700">
                        <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 block">{t('settings.telegram.timeLabel')}</label>
                        <span className="text-xs text-neutral-400 block mt-0.5">{t('settings.telegram.timeDesc')}</span>
                      </div>
                      <input
                        type="time"
                        value={digestTimeLocal}
                        onChange={e => setDigestTimeLocal(e.target.value)}
                        className="text-sm font-medium border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-1.5 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Conexiones del equipo */}
            {teamData && teamData.connections.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-200 flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-700 pb-2">
                  <Users className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  Equipo conectado ({teamData.connections.length})
                </h4>
                <div className="space-y-1.5">
                  {teamData.connections.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 px-2 py-1 rounded-md bg-neutral-50 dark:bg-neutral-800/40">
                      <CheckCircle className="h-3.5 w-3.5 text-success-500 shrink-0" />
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">
                        {c.telegram_name || 'Sin nombre'}
                      </span>
                      {c.telegram_username && (
                        <span className="text-neutral-400 dark:text-neutral-500">@{c.telegram_username}</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  Cada empleado vincula su propia cuenta desde esta misma sección.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-neutral-100 dark:border-neutral-700">
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://t.me/Betali_bot', '_blank')}
                  className="w-full sm:w-auto bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('settings.telegram.btnChat')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unlink()}
                  disabled={isUnlinking}
                  className="w-full sm:w-auto text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-500/10 hover:text-danger-700 dark:hover:text-danger-300 border-danger-200 hover:border-danger-300 dark:border-danger-500/30 transition-colors"
                >
                  {isUnlinking
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Unlink className="h-4 w-4 mr-2" />
                  }
                  {t('settings.telegram.btnUnlink')}
                </Button>
              </div>

              {prefsChanged && (
                <Button
                  onClick={handleSavePreferences}
                  disabled={isSaving}
                  className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover-lift"
                >
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('settings.telegram.btnSave')}
                </Button>
              )}
            </div>

          </div>
        ) : (
          /* ── Estado: no vinculado ── */
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl border border-blue-100 dark:border-blue-500/20">
              <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                {t('settings.telegram.unlinkedDesc1')}<strong className="font-semibold">{t('settings.telegram.unlinkedDescBold')}</strong>{t('settings.telegram.unlinkedDesc2')}
                <span className="font-semibold text-blue-600 dark:text-blue-400 px-1 py-0.5 bg-blue-100 dark:bg-blue-500/20 rounded">@Betali_bot</span>.
              </p>
            </div>

            {/* Equipo ya conectado */}
            {teamData && teamData.connections.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 px-3 py-2 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <Users className="h-4 w-4 shrink-0 text-success-500" />
                <span>
                  {teamData.connections.length === 1
                    ? `1 miembro del equipo ya está conectado.`
                    : `${teamData.connections.length} miembros del equipo ya están conectados.`
                  }
                  {' '}Cada empleado vincula su propia cuenta de Telegram de forma independiente.
                </span>
              </div>
            )}

            {!deepLink ? (
              <div className="flex justify-center sm:justify-start">
                <Button
                  onClick={() => generateLink()}
                  disabled={isGenerating}
                  className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all"
                >
                  {isGenerating
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Link className="h-4 w-4 mr-2" />
                  }
                  {t('settings.telegram.btnGenerate')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 p-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  {t('settings.telegram.linkValidDesc1')}<strong className="text-neutral-900 dark:text-white">{t('settings.telegram.linkValidDescBold')}</strong>{t('settings.telegram.linkValidDesc2')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={() => window.open(deepLink, '_blank')} className="gap-2 bg-blue-500 hover:bg-blue-600 text-white shadow-sm flex-1 sm:flex-none">
                    <ExternalLink className="h-4 w-4" />
                    {t('settings.telegram.btnOpen')}
                  </Button>
                  <Button variant="outline" onClick={handleCopyLink} className="gap-2 flex-1 sm:flex-none border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                    {linkCopied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    {linkCopied ? t('settings.telegram.btnCopied') : t('settings.telegram.btnCopy')}
                  </Button>
                </div>
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {t('settings.telegram.verifyDesc1')}
                    <button
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['telegram-status'] })}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline underline-offset-2 transition-colors"
                    >
                      {t('settings.telegram.verifyDescBtn')}
                    </button>
                    {t('settings.telegram.verifyDesc2')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
