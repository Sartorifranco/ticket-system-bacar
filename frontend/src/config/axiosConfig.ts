// frontend/src/config/axiosConfig.ts
<<<<<<< HEAD
import axios from 'axios';

// Define la URL base de tu backend
// ¡IMPORTANTE! Asegúrate de que termine con una barra para evitar problemas de concatenación
// CORREGIDO: Nueva dirección IP
const API_BASE_URL = 'http://192.168.0.236:5000'; 

const api = axios.create({
  // Asegura que la baseURL siempre termina con una barra
  baseURL: API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`,
=======
import axios, { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL, // <--- CAMBIO CLAVE: SOLO LA BASE URL, SIN "/api"
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
  headers: {
    'Content-Type': 'application/json',
  },
});

<<<<<<< HEAD
// Interceptor para añadir el token de autenticación a cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Recupera el token del localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Si no hay token, asegúrate de que no se envíe una cabecera Authorization vacía o nula
      delete config.headers.Authorization;
    }
    
    // ¡DEBUGGING CRÍTICO! Muestra la URL completa que Axios intentará enviar y si hay token
    // Ajusta la URL para el log para asegurar que la barra sea mostrada correctamente
    let requestUrl = config.url || ''; // Asigna una cadena vacía si config.url es undefined
    const finalUrl = `${config.baseURL}${requestUrl.startsWith('/') ? requestUrl.substring(1) : requestUrl}`;
    console.log(`[Axios Interceptor] ENVIANDO PETICIÓN FINAL A: ${finalUrl} | Token Presente: ${!!token}`);
=======
// Interceptor para añadir el token JWT a las cabeceras de cada petición
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

<<<<<<< HEAD
// Interceptor para manejar respuestas de error (opcional, pero útil)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        console.error('Petición no autorizada. El token podría ser inválido o haber expirado.');
      } else if (error.response.status === 404) {
        // Muestra la URL que dio 404
        console.error(`ERROR 404: Ruta no encontrada para ${error.config.url}. Verifica tu backend y la ruta exacta.`);
      } else if (error.response.status === 500) {
        // Log detallado para errores 500
        console.error(`ERROR 500: Error interno del servidor para ${error.config.url}. Mensaje: ${error.response.data?.message || 'Desconocido'}. Detalles:`, error.response.data);
      }
    } else {
      console.error('Error de red o respuesta no recibida:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
=======
export default api;
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
