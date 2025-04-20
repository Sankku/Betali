/**
 * Middleware de autenticación para Express
 * Verifica el token JWT de Supabase
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No autorizado. Se requiere token de autenticación.' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      // Verificar si es un error de token expirado
      if (error && error.message.includes('expired')) {
        return res.status(401).json({
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(401).json({ 
        error: 'Token inválido o expirado.' 
      });
    }
    
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error.message);
    return res.status(500).json({ error: 'Error en el servidor.' });
  }
};