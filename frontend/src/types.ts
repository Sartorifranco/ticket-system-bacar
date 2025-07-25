// frontend/src/types.ts

// Definiciones de tipos para la aplicación

// Tipos para roles de usuario y estados de ticket
export type UserRole = 'admin' | 'agent' | 'client';
// Incluye 'resolved' para el frontend, aunque el backend pueda usar 'closed' como estado final.
export type TicketStatus = 'open' | 'in-progress' | 'closed' | 'reopened' | 'resolved'; 
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

// Interfaz para el usuario
export interface User {
    id: number;
    username: string;
    email: string;
    role: UserRole;
    department_id: number | null; 
    created_at: string;
    updated_at: string;
}

// Interfaz para el departamento
export interface Department {
    id: number;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}

// Interfaz para un comentario/respuesta de ticket
export interface Comment {
    id: number;
    ticket_id: number;
    user_id: number;
    user_username: string;
    // Usar 'message' para que coincida con TicketDetail.tsx y TicketDetailModal.tsx
    message: string; 
    created_at: string;
}

// Interfaz para los logs de actividad
export interface ActivityLog {
    id: number;
    user_id: number;
    user_username: string;
    user_role: UserRole;
    ticket_id: number | null; 
    activity_type: string; 
    description: string;
    created_at: string;
    target_type?: string; 
    target_id?: number; 
    old_value?: any; 
    new_value?: any; 
}

// Interfaz para los datos de un ticket
export interface TicketData {
    id: number;
    // Usar 'title' para que coincida con TicketDetail.tsx y TicketDetailModal.tsx
    title: string; 
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    user_id: number;
    user_username: string;
    user_email: string;
    // CORREGIDO: Ahora puede ser 'number | null'
    assigned_to_user_id: number | null; 
    agent_username: string | null;
    agent_email: string | null;
    // CORREGIDO: Ahora puede ser 'number | null'
    department_id: number | null; 
    department_name: string; // department_name puede ser string o null si department_id es null
    created_at: string;
    updated_at: string;
    // Usar 'closed_at' para que coincida con TicketDetail.tsx y TicketDetailModal.tsx
    closed_at: string | null; 
    comments?: Comment[]; 
    activity_logs?: ActivityLog[]; 
}

// Interfaz para notificaciones
export interface Notification {
    id: number;
    user_id: number;
    type: string; 
    message: string;
    related_id: number | null;
    related_type: string | null;
    is_read: boolean;
    created_at: string;
}

// Interfaz para las métricas del dashboard
export interface ReportMetrics {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number; 
    closedTickets: number; 
    reopenedTickets: number; 
    totalUsers: number;
    totalDepartments: number;
    ticketsByStatus: { name: TicketStatus; value: number }[];
    ticketsByPriority: { name: TicketPriority; value: number }[];
    ticketsCreatedOverTime: { date: string; count: number }[]; 
    ticketsByStatusOverTime: { date: string; open: number; inProgress: number; closed: number; reopened: number; }[]; 
    ticketsByPriorityOverTime: { date: string; low: number; medium: number; high: number; urgent: number; }[];
    agentPerformance: { agentName: string; resolvedTickets: number; avgResolutionTimeHours: number | null }[];
    departmentPerformance: { departmentName: string; totalTickets: number; avgResolutionTimeHours: number | null }[];
}

// Interfaz para BacarKey
export interface BacarKey {
    id: number;
    key_value: string; 
    device_user: string; 
    username: string; 
    password: string; 
    notes: string | null; 
    created_by_user_id: number; 
    created_by_username: string; 
    created_at: string;
    updated_at: string;
}

// Interfaz para errores de API
export interface ApiResponseError {
    message: string;
    stack?: string; 
}
