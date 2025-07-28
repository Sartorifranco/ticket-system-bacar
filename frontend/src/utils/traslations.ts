// frontend/src/utils/traslations.ts

import { TicketStatus, TicketPriority, UserRole } from '../types';

// Mapeo de traducciones para estados de tickets
export const ticketStatusTranslations: Record<TicketStatus, string> = {
    'open': 'Abierto',
    'in-progress': 'En Progreso',
    'closed': 'Cerrado',
    'reopened': 'Reabierto',
    'resolved': 'Resuelto' // Añadido para consistencia si se usa en el frontend
};

// Mapeo de traducciones para prioridades de tickets
export const ticketPriorityTranslations: Record<TicketPriority, string> = {
    'low': 'Baja',
    'medium': 'Media',
    'high': 'Alta',
    'urgent': 'Urgente'
};

// Mapeo de traducciones para roles de usuario
export const userRoleTranslations: Record<UserRole, string> = {
    'admin': 'Administrador',
    'agent': 'Agente',
    'client': 'Cliente'
};

// Mapeo de traducciones para tipos de objetivo en logs de actividad
export const targetTypeTranslations: Record<string, string> = {
    'ticket': 'Ticket',
    'user': 'Usuario',
    'department': 'Departamento',
    'bacar_key': 'Clave Bacar',
    'system': 'Sistema'
    // Añade más tipos de objetivo si los tienes
};

// Mapeo de traducciones para tipos de acción en logs de actividad (action_type)
export const activityActionTypeTranslations: Record<string, string> = {
    'ticket_created': 'Ticket Creado',
    'ticket_updated': 'Ticket Actualizado',
    'ticket_deleted': 'Ticket Eliminado',
    'ticket_status_changed': 'Estado de Ticket Cambiado',
    'ticket_priority_changed': 'Prioridad de Ticket Cambiada',
    'ticket_department_changed': 'Departamento de Ticket Cambiado',
    'ticket_agent_changed': 'Agente de Ticket Cambiado',
    'ticket_assigned': 'Ticket Asignado',
    'comment_added': 'Comentario Añadido',
    'user_created': 'Usuario Creado',
    'user_updated': 'Usuario Actualizado',
    'user_deleted': 'Usuario Eliminado',
    'user_role_updated': 'Rol de Usuario Actualizado',
    'user_department_updated': 'Departamento de Usuario Actualizado',
    'department_created': 'Departamento Creado',
    'department_updated': 'Departamento Actualizado',
    'department_deleted': 'Departamento Eliminado',
    'notification_read': 'Notificación Leída',
    'notification_deleted': 'Notificación Eliminada',
    'new_ticket': 'Nuevo Ticket',
    'new_ticket_department': 'Nuevo Ticket (Departamento)',
    'status_changed': 'Estado Cambiado',
    'priority_changed': 'Prioridad Cambiada',
    'new_comment': 'Nuevo Comentario',
    'new_comment_admin': 'Nuevo Comentario (Admin)',
    'bacar_key_created': 'Clave Bacar Creada',
    'bacar_key_updated': 'Clave Bacar Actualizada',
    'bacar_key_deleted': 'Clave Bacar Eliminada',
    'login': 'Inicio de Sesión',
    'logout': 'Cierre de Sesión',
    // Añade más tipos de acción si los tienes
};


/**
 * Traduce un término dado su tipo.
 * @param term El término a traducir (ej. 'open', 'low', 'admin', 'ticket_created').
 * @param termType El tipo de término (ej. 'status', 'priority', 'role', 'targetType', 'actionType').
 * @returns El término traducido o el término original si no se encuentra traducción.
 */
export const translateTerm = (term: string, termType: 'status' | 'priority' | 'role' | 'targetType' | 'actionType'): string => {
    switch (termType) {
        case 'status':
            return ticketStatusTranslations[term as TicketStatus] || term;
        case 'priority':
            return ticketPriorityTranslations[term as TicketPriority] || term;
        case 'role':
            return userRoleTranslations[term as UserRole] || term;
        case 'targetType':
            return targetTypeTranslations[term] || term;
        case 'actionType': // Corregido: Usar 'actionType' para el parámetro
            return activityActionTypeTranslations[term] || term;
        default:
            return term;
    }
};
