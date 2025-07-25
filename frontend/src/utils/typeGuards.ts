import { AxiosError } from 'axios';

/**
 * Type guard para verificar si un error es una instancia de AxiosError.
 * @param error El objeto de error a verificar.
 * @returns true si el error es un AxiosError, false en caso contrario.
 */
export function isAxiosErrorTypeGuard<T = unknown>(error: unknown): error is AxiosError<T> {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error && (error as AxiosError).isAxiosError === true;
}

// Interfaz para la estructura esperada de los mensajes de error de la API
// Asegúrate de que esta interfaz se exporte para que pueda ser importada en otros archivos.
export interface ApiResponseError {
  message?: string; // Hacemos 'message' opcional por si acaso no siempre viene
}
