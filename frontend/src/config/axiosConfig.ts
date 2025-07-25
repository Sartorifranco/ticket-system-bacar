import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Define la URL base de tu backend
// ¡IMPORTANTE! Asegúrate de que termine con una barra para evitar problemas de concatenación
// Usa la dirección IP específica para el entorno local
const API_BASE_URL = 'http://192.168.0.236:5000'; 

const api = axios.create({
  // Asegura que la baseURL siempre termina con una barra
  baseURL: API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir el token de autenticación a cada petición
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas de error (opcional, pero útil)
api.interceptors.response.use(
  (response: AxiosResponse) => response,
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
