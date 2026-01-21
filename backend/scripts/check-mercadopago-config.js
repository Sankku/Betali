/**
 * Script para verificar configuración de Mercado Pago
 * Run with: node scripts/check-mercadopago-config.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('🔍 Verificando configuración de Mercado Pago...\n');

let allGood = true;

// 1. Verificar variables de entorno del backend
console.log('1️⃣  Backend Environment Variables:');
console.log('   ================================\n');

const backendVars = {
  'MERCADOPAGO_ACCESS_TOKEN': process.env.MERCADOPAGO_ACCESS_TOKEN,
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY,
  'PORT': process.env.PORT || '4000',
  'NODE_ENV': process.env.NODE_ENV || 'development'
};

for (const [key, value] of Object.entries(backendVars)) {
  if (!value) {
    console.log(`   ❌ ${key}: NO CONFIGURADO`);
    allGood = false;
  } else {
    // Ocultar valores sensibles
    const displayValue = ['MERCADOPAGO_ACCESS_TOKEN', 'SUPABASE_SERVICE_KEY'].includes(key)
      ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
      : value;
    console.log(`   ✅ ${key}: ${displayValue}`);
  }
}

// 2. Verificar que el SDK esté instalado
console.log('\n2️⃣  Mercado Pago SDK:');
console.log('   ===================\n');

try {
  require('mercadopago');
  console.log('   ✅ SDK instalado correctamente');
} catch (error) {
  console.log('   ❌ SDK no instalado. Run: npm install mercadopago');
  allGood = false;
}

// 3. Verificar frontend .env
console.log('\n3️⃣  Frontend Environment Variables:');
console.log('   =================================\n');

const fs = require('fs');
const frontendEnvPath = path.resolve(__dirname, '../../frontend/.env');

if (fs.existsSync(frontendEnvPath)) {
  const frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8');

  const hasMPKey = frontendEnv.includes('VITE_MERCADOPAGO_PUBLIC_KEY');

  if (hasMPKey) {
    const match = frontendEnv.match(/VITE_MERCADOPAGO_PUBLIC_KEY=(.+)/);
    if (match && match[1]) {
      console.log(`   ✅ VITE_MERCADOPAGO_PUBLIC_KEY: ${match[1].trim()}`);
    } else {
      console.log('   ⚠️  VITE_MERCADOPAGO_PUBLIC_KEY está definido pero vacío');
      allGood = false;
    }
  } else {
    console.log('   ❌ VITE_MERCADOPAGO_PUBLIC_KEY: NO CONFIGURADO');
    console.log('   💡 Agregá esto a frontend/.env:');
    console.log('      VITE_MERCADOPAGO_PUBLIC_KEY=TEST-bfcb63e5-4a9d-4015-8617-d5a334555e85');
    allGood = false;
  }
} else {
  console.log('   ❌ Archivo frontend/.env no existe');
  console.log('   💡 Creá frontend/.env con:');
  console.log('      VITE_MERCADOPAGO_PUBLIC_KEY=TEST-bfcb63e5-4a9d-4015-8617-d5a334555e85');
  allGood = false;
}

// 4. Test rápido de conexión con Mercado Pago
console.log('\n4️⃣  Test de Conexión con Mercado Pago:');
console.log('   ====================================\n');

if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
  try {
    const { MercadoPagoConfig } = require('mercadopago');
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
    });
    console.log('   ✅ SDK configurado con access token (v2)');
    console.log('   💡 Para probar la API, ejecutá el pago desde el frontend');
  } catch (error) {
    console.log('   ⚠️  Error configurando SDK:', error.message);
  }
} else {
  console.log('   ⚠️  No se puede probar conexión sin MERCADOPAGO_ACCESS_TOKEN');
}

// 5. Verificar archivos críticos
console.log('\n5️⃣  Archivos Críticos:');
console.log('   ===================\n');

const criticalFiles = [
  'backend/services/MercadoPagoService.js',
  'backend/controllers/MercadoPagoController.js',
  'backend/routes/mercadopago.js',
  'frontend/src/components/features/billing/MercadoPagoBricks.tsx',
  'frontend/src/components/features/billing/PaymentModal.tsx',
  'frontend/src/services/api/mercadoPagoService.ts'
];

criticalFiles.forEach(file => {
  const fullPath = path.resolve(__dirname, '../../', file);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - NO EXISTE`);
    allGood = false;
  }
});

// Resumen final
console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('✅ ¡TODO LISTO PARA PROBAR!');
  console.log('\n📋 Próximos pasos:');
  console.log('   1. Reiniciá el backend: node server.js');
  console.log('   2. Reiniciá el frontend: npm run dev');
  console.log('   3. Abrí http://localhost:3000/dashboard/pricing');
  console.log('   4. Probá seleccionar un plan');
  console.log('\n📚 Guía completa: MERCADOPAGO-TESTING-GUIDE.md');
} else {
  console.log('⚠️  CONFIGURACIÓN INCOMPLETA');
  console.log('\n📋 Completá los pasos marcados con ❌ arriba');
  console.log('📚 Ver: MERCADOPAGO-TESTING-GUIDE.md para más detalles');
}
console.log('='.repeat(50) + '\n');

process.exit(allGood ? 0 : 1);
