const express = require('express');
const { db } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateUser);

/**
 * GET /api/products
 * Get all the products of auth users
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const products = await db.getAll('products', 'owner_id', userId);
    
    res.json(products);
  } catch (error) {
    console.error('Error al obtener productos:', error.message);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

/**
 * GET /api/products/:id
 * Get an specific product for the user
 */
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user.id;
    
    const product = await db.getById('products', 'product_id', productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    if (product.owner_id !== userId) {
      return res.status(403).json({ error: 'No tiene permiso para acceder a este producto' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error al obtener el producto:', error.message);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

/**
 * POST /api/products
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const productData = {
      ...req.body,
      owner_id: userId,
      created_at: new Date().toISOString()
    };
    
    const newProduct = await db.create('products', productData);
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error al crear producto:', error.message);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

/**
 * PUT /api/products/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user.id;
    
    const existingProduct = await db.getById('products', 'product_id', productId);
    
    if (!existingProduct) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    if (existingProduct.owner_id !== userId) {
      return res.status(403).json({ error: 'No tiene permiso para modificar este producto' });
    }
    
    const productData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };
    
    delete productData.owner_id;
    
    const updatedProduct = await db.update('products', 'product_id', productId, productData);
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error al actualizar producto:', error.message);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

/**
 * DELETE /api/products/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user.id;
    
    const existingProduct = await db.getById('products', 'product_id', productId);
    
    if (!existingProduct) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    if (existingProduct.owner_id !== userId) {
      return res.status(403).json({ error: 'No tiene permiso para eliminar este producto' });
    }
    
    await db.delete('products', 'product_id', productId);
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error.message);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

module.exports = router;