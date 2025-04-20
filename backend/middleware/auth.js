const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');

dotenv.config();

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
      if (error && error.message?.includes('expired')) {
        return res.status(401).json({
          error: 'Token expirado o inválido',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      console.error('Error de autenticación:', error?.message || 'Usuario no encontrado');
      
      return res.status(401).json({ 
        error: 'Error de autenticación.'
      });
    }
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (!userError && userData) {
        user.db_info = userData;
      }
    } catch (dbError) {
      console.error('Error al obtener información adicional del usuario:', dbError.message);
    }
    
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error.message);
    return res.status(500).json({ error: 'Error en el servidor.' });
  }
};

module.exports = { authenticateUser };