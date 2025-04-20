const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { authenticateUser } = require('./middleware/auth');
const productsRoutes = require('./routes/products');
const { db } = require('./config/supabase');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Error: Se requieren las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_KEY');
  process.exit(1);
}

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API funcionando correctamente' });
});

app.get('/api/test-connection', async (req, res) => {
  try {
    console.log('Probando conexión a Supabase...');
    const data = await db.getAll('products');
    res.json({ 
      success: true, 
      message: 'Conexión establecida correctamente',
      count: data.length,
      sample: data.slice(0, 2) 
    });
  } catch (error) {
    console.error('Error al conectar con Supabase:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Error al conectar con Supabase',
      details: error.message
    });
  }
});

app.get('/api/user/profile', authenticateUser, (req, res) => {
  res.json({ 
    message: 'Datos de perfil obtenidos correctamente',
    user: req.user 
  });
});

app.get('/api/dashboard/data', authenticateUser, async (req, res) => {
  try {
    let products = [];
    try {
      products = await db.getAll('products');
    } catch (error) {
      console.error('Error al obtener productos:', error.message);
    }
    
    let warehouses = [];
    try {
      warehouses = await db.getAll('warehouse');
    } catch (error) {
      console.error('Error al obtener depósitos:', error.message);
    }
    
    let movements = [];
    try {
      movements = await db.getAll('stock_movements');
    } catch (error) {
      console.error('Error al obtener movimientos:', error.message);
    }
    
    const recentMovements = movements
      .sort((a, b) => new Date(b.movement_date || 0) - new Date(a.movement_date || 0))
      .slice(0, 5);
    
    const enhancedMovements = await Promise.all(recentMovements.map(async (movement) => {
      let productName = 'Desconocido';
      let warehouseName = 'Desconocido';
      
      if (movement.product_id) {
        try {
          const product = await db.getById('products', 'product_id', movement.product_id);
          if (product) {
            productName = product.name;
          }
        } catch (error) {
          console.error(`Error al obtener producto ${movement.product_id}:`, error.message);
        }
      }
      
      if (movement.warehouse_id) {
        try {
          const warehouse = await db.getById('warehouse', 'warehouse_id', movement.warehouse_id);
          if (warehouse) {
            warehouseName = warehouse.name;
          }
        } catch (error) {
          console.error(`Error al obtener depósito ${movement.warehouse_id}:`, error.message);
        }
      }
      
      return {
        ...movement,
        product_name: productName,
        warehouse_name: warehouseName
      };
    }));
    
    res.json({
      stats: {
        productsCount: products.length,
        warehousesCount: warehouses.length,
      },
      recentMovements: enhancedMovements,
    });
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error.message);
    res.status(500).json({ error: 'Error al obtener datos del dashboard' });
  }
});

app.use('/api/products', productsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Error no controlado:', err.message);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

(async () => {
  try {
    console.log('Verificando conexión a Supabase...');
    await db.getAll('products');
    console.log('Conexión a Supabase establecida correctamente');
    
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al conectar con Supabase. No se puede iniciar el servidor:', error.message);
    process.exit(1);
  }
})();