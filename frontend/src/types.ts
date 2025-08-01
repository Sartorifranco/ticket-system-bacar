// src/types.ts

import { ReactNode } from "react";

// ====================================================================
// TIPOS DE USUARIO
// ====================================================================
export type UserRole = 'admin' | 'agent' | 'client';

export interface User {
    id: number;
    username: string;
    email: string;
    role: UserRole;
    department_id: number | null;
    created_at: string;
    updated_at: string;
    // No incluir password_hash aquí por seguridad en el frontend
}

export interface NewUser {
    username: string;
    email: string;
    password?: string;
    role: UserRole;
    department_id: number | null;
}

export interface UpdateUser {
    username?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    department_id?: number | null;
}

// ====================================================================
// TIPOS DE DEPARTAMENTO
// ====================================================================
export interface Department {
    id: number;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}

// ====================================================================
// TIPOS DE TICKET
// ====================================================================
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed' | 'reopened';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketData {
    id: number;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    user_id: number; // ID del usuario que creó el ticket (cliente) - AHORA ES REQUERIDO
    department_id: number | null; // Departamento al que pertenece el ticket
    assigned_to_user_id: number | null; // ID del agente asignado
    created_at: string;
    updated_at: string;
    user_username: string; // Nombre de usuario del creador del ticket (asumimos que el backend lo envía)
    department_name: string; // Nombre del departamento (asumimos que el backend lo envía)
    agent_username: string | null; // Nombre de usuario del agente asignado (asumimos que el backend lo envía)
    closed_at: string | null; // Fecha de cierre del ticket, puede ser nulo
    feedback?: Feedback | null; // <-- NUEVO: Propiedad opcional para el feedback del ticket
}

// Interfaz para la creación de un nuevo ticket desde el cliente
export interface NewTicketClientData {
    title: string;
    description: string;
    priority: TicketPriority;
    department_id: number; // El cliente debe seleccionar un departamento
}

// Interfaz para la actualización parcial de un ticket (desde Admin/Agent)
export interface UpdateTicketData {
    title?: string;
    description?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    department_id?: number | null;
    assigned_to_user_id?: number | null;
}

// ====================================================================
// TIPOS DE COMENTARIOS DE TICKET (CONSOLIDADO - ELIMINADA DUPLICIDAD)
// ====================================================================
export interface Comment {
    comment_text: ReactNode; // Renombrado de TicketComment a Comment para consistencia
    id: number;
    ticket_id: number;
    user_id: number;
    user_username: string; // Nombre de usuario del que hizo el comentario
    content: string; // Contenido del comentario
    created_at: string;
    updated_at: string;
}

// ====================================================================
// TIPOS DE CLAVES BACAR
// ====================================================================
export interface BacarKey {
    id: number;
    device_user: string;
    username: string;
    password: string; // Si tu backend no devuelve esto, puede ser problemático. Considera omitirlo si no es necesario.
    notes: string | null;
    created_at: string;
    updated_at: string;
    created_by_user_id?: number | null; // Añadido null para flexibilidad
    created_by_username?: string | null; // Añadido null para flexibilidad
}

export type BacarKeyFormData = Omit<BacarKey, 'id' | 'created_at' | 'updated_at' | 'created_by_user_id' | 'created_by_username'>;


// ====================================================================
// TIPOS DE REPORTES / DASHBOARD
// ====================================================================
export interface ReportMetrics {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    reopenedTickets: number;
    totalUsers: number;
    totalDepartments: number;
    ticketsByStatus: { status: TicketStatus; count: number }[];
    ticketsByPriority: { priority: TicketPriority; count: number }[];
    ticketsByDepartment: { departmentName: string; count: number }[];
}

// ====================================================================
// TIPOS DE LOGS DE ACTIVIDAD (AJUSTADO PARA COINCIDIR CON LA BASE DE DATOS Y EL CONTROLADOR)
// ====================================================================
export interface ActivityLog {
    action_type: ReactNode;
    description: ReactNode;
    user_username: ReactNode;
    id: number;
    user_id: number | null; // Puede ser null si el usuario es eliminado
    username: string | null; // Mapeado de 'user_username' de la DB
    user_role: UserRole | null; // Rol del usuario que realizó la acción
    action: string; // Mapeado de 'action_type' de la DB
    details: string; // Mapeado de 'description' de la DB (ahora siempre string)
    target_type: string | null;
    target_id: number | null;
    old_value: any; // JSON object or null (ya parseado por el backend)
    new_value: any; // JSON object or null (ya parseado por el backend)
    created_at: string;
}

// ====================================================================
// TIPOS DE NOTIFICACIONES (del backend)
// ====================================================================
export type BackendNotificationType = 'new_ticket' | 'ticket_updated' | 'ticket_assigned' | 'comment_added' | 'system_alert' | 'activity_log';

export interface Notification {
    id: number; // ID numérico del backend
    user_id: number; // A quién va dirigida la notificación
    message: string;
    type: BackendNotificationType; // Tipo de notificación del backend
    is_read: boolean;
    target_id: number | null; // ID del ticket, usuario, etc. relacionado
    created_at: string;
    related_id?: number | null;
    related_type?: string | null;
}

// ====================================================================
// TIPOS DE TOASTS (mensajes temporales del frontend)
// ====================================================================
export type ToastNotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: number | string; // ID único para el toast (puede ser numérico o string)
    message: string;
    type: ToastNotificationType; // Tipo específico para el estilo del toast
    timeoutId?: NodeJS.Timeout; // Para manejar el temporizador de auto-cierre
    user_id?: number;
    created_at?: string;
    target_id?: number | null;
    related_id?: number | null;
    related_type?: string | null;
}

// ====================================================================
// TIPOS DE RESPUESTAS DE API
// ====================================================================
export interface ApiResponseError {
    message: string;
    details?: string;
    statusCode?: number;
}

export interface Feedback {
    id: number;
    ticket_id: number;
    user_id: number; // ID del cliente que dejó el feedback
    rating: number; // Calificación (ej. 1-5 estrellas)
    comment: string | null; // Comentario opcional
    created_at: string;
}