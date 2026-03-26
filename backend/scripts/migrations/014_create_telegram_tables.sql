-- Migration: Create Telegram bot tables
-- Date: 2026-03-24
-- Description: Tables for Telegram bot integration (account linking + session state)

-- ============================================================
-- telegram_connections: vincula chat_id de Telegram con usuario de Betali
-- ============================================================
CREATE TABLE IF NOT EXISTS telegram_connections (
  connection_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Telegram identity (NULL mientras el usuario no haya completado la vinculación)
  telegram_chat_id    BIGINT UNIQUE,
  telegram_username   VARCHAR(100),
  telegram_name       VARCHAR(200),

  -- Token de vinculación (one-time, 30 min)
  link_token          VARCHAR(100) UNIQUE,
  link_token_expires  TIMESTAMPTZ,

  -- Cuándo se completó la vinculación
  linked_at           TIMESTAMPTZ,

  -- Preferencias de notificaciones
  daily_digest_enabled  BOOLEAN NOT NULL DEFAULT true,
  daily_digest_time     TIME NOT NULL DEFAULT '08:00',
  alerts_enabled        BOOLEAN NOT NULL DEFAULT true,
  alert_min_severity    VARCHAR(20) NOT NULL DEFAULT 'warning'
                        CHECK (alert_min_severity IN ('info', 'warning', 'critical')),
  quiet_hours_start     TIME,
  quiet_hours_end       TIME,

  -- Estado
  is_active           BOOLEAN NOT NULL DEFAULT true,
  last_interaction    TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_connections_user_org ON telegram_connections(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_telegram_connections_user        ON telegram_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_connections_chat        ON telegram_connections(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_connections_org         ON telegram_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_telegram_connections_link_token  ON telegram_connections(link_token) WHERE link_token IS NOT NULL;

-- ============================================================
-- telegram_sessions: estado conversacional para flujos multi-paso
-- ============================================================
CREATE TABLE IF NOT EXISTS telegram_sessions (
  chat_id         BIGINT PRIMARY KEY,
  current_flow    VARCHAR(50),   -- 'create_order' | 'register_movement' | 'stock_count' | null
  flow_step       VARCHAR(50),   -- paso actual dentro del flujo
  flow_data       JSONB NOT NULL DEFAULT '{}',
  expires_at      TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_sessions_expires ON telegram_sessions(expires_at);

-- ============================================================
-- Trigger updated_at para telegram_connections
-- ============================================================
CREATE OR REPLACE FUNCTION update_telegram_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_telegram_connections_updated_at
  BEFORE UPDATE ON telegram_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_connections_updated_at();

COMMENT ON TABLE telegram_connections IS 'Vinculación entre cuentas de Telegram y usuarios de Betali';
COMMENT ON TABLE telegram_sessions    IS 'Estado conversacional temporal del bot por chat_id';
