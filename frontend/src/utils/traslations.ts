// frontend/src/utils/translations.ts

// Traducciones para estados de tickets
export const ticketStatusTranslations: Record<string, string> = {
  'open': 'Abierto',
  'in-progress': 'En Progreso',
  'resolved': 'Resuelto',
  'closed': 'Cerrado',
};

// Traducciones para prioridades de tickets
export const ticketPriorityTranslations: Record<string, string> = {
  'low': 'Baja',
  'medium': 'Media',
  'high': 'Alta',
};

// Traducciones para roles de usuario
export const userRoleTranslations: Record<string, string> = {
  'user': 'Usuario',
  'agent': 'Agente',
  'admin': 'Administrador',
};

// Traducciones para tipos de entidad (en logs)
export const targetTypeTranslations: Record<string, string> = {
  'ticket': 'Ticket',
  'user': 'Usuario',
  'department': 'Departamento',
  'system': 'Sistema',
};

// Función genérica para obtener traducción
export const translateTerm = (term: string, type: 'status' | 'priority' | 'role' | 'targetType'): string => {
  switch (type) {
    case 'status':
      return ticketStatusTranslations[term] || term;
    case 'priority':
      return ticketPriorityTranslations[term] || term;
    case 'role':
      return userRoleTranslations[term] || term;
    case 'targetType':
      return targetTypeTranslations[term] || term;
    default:
      return term;
  }
};
