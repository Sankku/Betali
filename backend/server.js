const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { authenticateUser } = require('./middleware/auth');
const productsRoutes = require('./routes/products');

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
    const { count: productsCount, error: productsError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    if (productsError) throw productsError;
    
    const { count: warehousesCount, error: warehousesError } = await supabase
      .from('warehouse')
      .select('*', { count: 'exact', head: true });
    
    if (warehousesError) throw warehousesError;
    
    const { data: recentMovements, error: movementsError } = await supabase
      .from('stock_movements')
      .select(`
        movement_id,
        movement_date,
        movement_type,
        quantity,
        products(name),
        warehouse:warehouse_id(name)
      `)
      .order('movement_date', { ascending: false })
      .limit(5);
    
    if (movementsError) throw movementsError;
    
    res.json({
      stats: {
        productsCount: productsCount || 0,
        warehousesCount: warehousesCount || 0,
      },
      recentMovements: recentMovements || [],
    });
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error.message);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

app.use('/api/products', productsRoutes);

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});