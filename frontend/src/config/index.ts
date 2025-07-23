// C:\my-ticket-system\frontend\src\config\index.ts

// Define la URL base de tu API backend
// En desarrollo, apunta a donde esté corriendo tu backend (http://localhost:3000 en tu caso)
// En producción, debe ser la URL de tu API desplegada
export const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.tudominio.com' // <<-- ¡RECUERDA CAMBIAR ESTO PARA TU DESPLIEGUE EN PRODUCCIÓN!
  : 'http://localhost:3000'; // <<-- Confirmado: tu backend corre en el puerto 3000