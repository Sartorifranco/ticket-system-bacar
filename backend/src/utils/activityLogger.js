// backend/src/utils/activityLogger.js
const pool = require('../config/db'); // Ajusta la ruta si tu db.js está en otro lugar

/**
 * Registra una acción en la tabla activity_logs.
 * @param {number} userId - ID del usuario que realiza la acción.
 * @param {string} username - Nombre de usuario que realiza la acción.
 * @param {'user' | 'agent' | 'admin'} userRole - Rol del usuario.
 * @param {string} actionType - Tipo de acción (ej. 'ticket_created', 'user_updated').
 * @param {string} description - Descripción legible de la acción.
 * @param {'ticket' | 'user' | 'department' | 'system'} targetType - Tipo de entidad afectada.
 * @param {number | null} targetId - ID de la entidad afectada (null si no aplica).
 * @param {any | null} oldValue - Valor anterior (puede ser un objeto, se stringificará a JSON).
 * @param {any | null} newValue - Nuevo valor (puede ser un objeto, se stringificará a JSON).
 */
async function logActivity(
    userId,
    username,
    userRole,
    actionType,
    description,
    targetType,
    targetId = null,
    oldValue = null,
    newValue = null
) {
    let connection;
    try {
        console.log('[ACTIVITY LOGGER] Intentando obtener conexión del pool...');
        connection = await pool.getConnection();
        console.log('[ACTIVITY LOGGER] Conexión obtenida exitosamente.');

        if (!connection) { // Doble chequeo, aunque pool.getConnection() debería lanzar error si falla
            console.error('[ACTIVITY LOGGER ERROR] No se pudo obtener una conexión a la base de datos.');
            return; // Salir si no hay conexión
        }

        const query = `
            INSERT INTO activity_logs
            (user_id, user_username, user_role, action_type, description, target_type, target_id, old_value, new_value)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Stringify los valores si son objetos/arrays para guardarlos como JSON en TEXT
        const oldValString = oldValue !== null ? JSON.stringify(oldValue) : null;
        const newValString = newValue !== null ? JSON.stringify(newValue) : null;

        console.log('[ACTIVITY LOGGER] Ejecutando INSERT en activity_logs...');
        await connection.execute(query, [
            userId,
            username,
            userRole,
            actionType,
            description,
            targetType,
            targetId,
            oldValString,
            newValString
        ]);
        console.log(`[ACTIVITY LOGGER] Actividad registrada: ${description}`);
    } catch (error) {
        console.error('[ACTIVITY LOGGER ERROR] Error al registrar actividad:', error);
        // Aquí podrías querer enviar una notificación de error a un sistema de monitoreo
        // No re-lanzamos el error para no bloquear la operación principal (ej. actualizar ticket)
    } finally {
        if (connection) {
            console.log('[ACTIVITY LOGGER] Liberando conexión del pool.');
            connection.release(); // Libera la conexión de vuelta al pool
        }
    }
}

module.exports = {
    logActivity
};

