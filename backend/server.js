const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { authenticateUser } = require('./middleware/auth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API funcionando correctamente' });
});

app.get('/api/user/profile', authenticateUser, (req, res) => {
  res.json({ 
    message: 'Datos de perfil obtenidos correctamente',
    user: req.user 
  });
});

app.get('/api/dashboard/data', authenticateUser, async (req, res) => {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
    res.json({
      stats: {
        totalClients: clients.length,
      },
      clients,
    });
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error.message);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});