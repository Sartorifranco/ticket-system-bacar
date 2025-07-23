<<<<<<< HEAD

=======
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
import { AxiosError } from 'axios';

/**
 * Type guard para verificar si un error es una instancia de AxiosError.
<<<<<<< HEAD
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
=======
 * Utiliza una comprobación manual de propiedades para determinar el tipo.
 *
 * @param error El valor a comprobar, de tipo 'unknown'.
 * @returns true si el error es un AxiosError, false en caso contrario.
 */
export function isAxiosErrorTypeGuard(error: unknown): error is AxiosError {
  // Esta implementación verifica las propiedades comunes de un AxiosError.
  return typeof error === 'object' && error !== null && 'isAxiosError' in error && (error as AxiosError).isAxiosError === true;
}
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
