const supabase = require('../lib/supabaseClient');
const { Logger } = require('../utils/Logger');
const { v4: uuidv4 } = require('uuid');

const logger = new Logger('TelegramRepository');

/**
 * Genera un link_token único de un solo uso para vincular una cuenta de Telegram.
 * @param {string} userId
 * @param {string} organizationId
 * @returns {Promise<string>} El token generado
 */
async function generateLinkToken(userId, organizationId) {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

  // Upsert: si ya hay una conexión para este usuario/org, actualiza el token.
  // Si no, crea una nueva fila pendiente de vinculación.
  const { error } = await supabase
    .from('telegram_connections')
    .upsert(
      {
        user_id: userId,
        organization_id: organizationId,
        link_token: token,
        link_token_expires: expiresAt.toISOString(),
        linked_at: null,
        telegram_chat_id: null,  // se llena cuando el usuario completa la vinculación
        is_active: false,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,organization_id' }
    );

  if (error) {
    logger.error('Error generating link token', { userId, organizationId, error });
    throw error;
  }

  return token;
}

/**
 * Busca la fila pendiente asociada a un link_token válido (no expirado).
 * @param {string} token
 * @returns {Promise<Object|null>}
 */
async function findPendingByToken(token) {
  const { data, error } = await supabase
    .from('telegram_connections')
    .select('connection_id, user_id, organization_id, link_token_expires')
    .eq('link_token', token)
    .eq('is_active', false)
    .gt('link_token_expires', new Date().toISOString())
    .maybeSingle();

  if (error) {
    logger.error('Error finding pending connection by token', { error });
    throw error;
  }

  return data;
}

/**
 * Completa la vinculación: asocia el chat_id de Telegram a la fila y la activa.
 * @param {string} connectionId
 * @param {Object} telegramUser - { id, username, first_name, last_name }
 */
async function activateConnection(connectionId, telegramUser) {
  const fullName = [telegramUser.first_name, telegramUser.last_name]
    .filter(Boolean)
    .join(' ');

  const { error } = await supabase
    .from('telegram_connections')
    .update({
      telegram_chat_id: telegramUser.id,
      telegram_username: telegramUser.username || null,
      telegram_name: fullName || null,
      linked_at: new Date().toISOString(),
      link_token: null,
      link_token_expires: null,
      is_active: true,
      last_interaction: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('connection_id', connectionId);

  if (error) {
    logger.error('Error activating telegram connection', { connectionId, error });
    throw error;
  }
}

/**
 * Busca la conexión activa por chat_id.
 * @param {number} chatId
 * @returns {Promise<Object|null>} { connection_id, user_id, organization_id, ... }
 */
async function findActiveByChatId(chatId) {
  const { data, error } = await supabase
    .from('telegram_connections')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    logger.error('Error finding active connection by chat_id', { chatId, error });
    throw error;
  }

  return data;
}

/**
 * Retorna todas las conexiones activas con alertas habilitadas.
 * Usado por el job de alertas proactivas.
 * @returns {Promise<Array>} [{ connection_id, telegram_chat_id, organization_id, user_id, alerts_enabled }]
 */
async function findAllActiveWithAlerts() {
  const { data, error } = await supabase
    .from('telegram_connections')
    .select('connection_id, telegram_chat_id, organization_id, user_id, alerts_enabled, alert_min_severity')
    .eq('is_active', true)
    .eq('alerts_enabled', true);

  if (error) {
    logger.error('Error finding active connections with alerts', { error });
    throw error;
  }

  return data || [];
}

/**
 * Actualiza la última interacción del usuario.
 * @param {number} chatId
 */
async function touchLastInteraction(chatId) {
  await supabase
    .from('telegram_connections')
    .update({ last_interaction: new Date().toISOString() })
    .eq('telegram_chat_id', chatId);
}

/**
 * Obtiene o crea el estado de sesión para un chat.
 * @param {number} chatId
 * @returns {Promise<Object>}
 */
async function getSession(chatId) {
  const { data, error } = await supabase
    .from('telegram_sessions')
    .select('*')
    .eq('chat_id', chatId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    logger.error('Error getting telegram session', { chatId, error });
    throw error;
  }

  return data || { chat_id: chatId, current_flow: null, flow_step: null, flow_data: {} };
}

/**
 * Guarda el estado de sesión (upsert).
 * @param {number} chatId
 * @param {Object} sessionData - { current_flow, flow_step, flow_data }
 */
async function saveSession(chatId, sessionData) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos de inactividad

  const { error } = await supabase
    .from('telegram_sessions')
    .upsert({
      chat_id: chatId,
      current_flow: sessionData.current_flow || null,
      flow_step: sessionData.flow_step || null,
      flow_data: sessionData.flow_data || {},
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    });

  if (error) {
    logger.error('Error saving telegram session', { chatId, error });
    throw error;
  }
}

/**
 * Limpia la sesión activa de un chat (fin de flujo).
 * @param {number} chatId
 */
async function clearSession(chatId) {
  await supabase
    .from('telegram_sessions')
    .delete()
    .eq('chat_id', chatId);
}

module.exports = {
  generateLinkToken,
  findPendingByToken,
  activateConnection,
  findActiveByChatId,
  findAllActiveWithAlerts,
  touchLastInteraction,
  getSession,
  saveSession,
  clearSession
};
