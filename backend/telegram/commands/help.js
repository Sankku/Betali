/**
 * Handler para /ayuda — muestra todos los comandos disponibles.
 */
async function handleHelp(ctx) {
  await ctx.reply(
    `🤖 *Betali Bot — Comandos disponibles*\n\n` +

    `📦 *Inventario*\n` +
    `• /stock — Ver stock filtrado (críticos, todos, agotados)\n` +
    `• /resumen — Resumen rápido del estado del inventario\n` +
    `• /conteo — Conteo físico completo (todos los productos en orden)\n` +
    `• /ajuste — Ajustar stock buscando productos específicos por nombre\n\n` +

    `🛒 *Compras y movimientos*\n` +
    `• /comprar — Crear una orden de compra (OC en borrador)\n` +
    `• /movimiento — Registrar una entrada o salida de stock\n\n` +

    `⚙️ *Configuración*\n` +
    `• /ayuda — Ver este mensaje\n\n` +

    `_Configurá las alertas y el horario del resumen diario desde la app web: Configuración → Telegram._`,
    { parse_mode: 'Markdown' }
  );
}

module.exports = { handleHelp };
