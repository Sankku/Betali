const dotenv = require('dotenv');
const { db } = require('./config/supabase');

dotenv.config();

async function testConnection() {
  console.log('Iniciando prueba de conexión a Supabase...');
  
  try {
    console.log('Consultando tabla de productos...');
    const products = await db.getAll('products');
    console.log(`✅ Conexión exitosa - Se encontraron ${products.length} productos`);
    
    if (products.length > 0) {
      console.log('Muestra de productos:');
      console.log(JSON.stringify(products.slice(0, 2), null, 2));
    }
    
    console.log('\nConsultando tabla de usuarios...');
    const users = await db.getAll('users');
    console.log(`✅ Conexión exitosa - Se encontraron ${users.length} usuarios`);
    
    if (users.length > 0) {
      const sanitizedUsers = users.map(user => ({
        ...user,
        password_hash: '[REDACTED]'
      }));
      console.log('Muestra de usuarios:');
      console.log(JSON.stringify(sanitizedUsers.slice(0, 2), null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    console.error('Detalles:', error.message);
    process.exit(1);
  }
}

testConnection();