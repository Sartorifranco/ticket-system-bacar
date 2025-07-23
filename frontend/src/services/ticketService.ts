// frontend/src/services/ticketService.ts
import api from '../config/axiosConfig';

export interface Ticket {
  id: number;
  user_id: number;
  agent_id: number | null;
  department_id: number;
  user_username: string;
  department_name: string;
  agent_username: string | null;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'assigned';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  ticket_id: number;
  user_id: number;
  user_username: string;
  comment_text: string;
  created_at: string;
}

export interface Attachment {
  id: number;
  ticket_id: number;
  user_id: number;
  file_name: string;
  file_type: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

const ticketService = {
  getAllTickets: async (): Promise<Ticket[]> => {
    const response = await api.get<{ tickets: Ticket[] }>('/api/tickets'); // <-- CAMBIO: /api/tickets
    return response.data.tickets;
  },

  getTicketById: async (ticketId: number): Promise<{ ticket: Ticket; comments: Comment[] }> => {
    const response = await api.get<{ success: boolean; ticket: Ticket; comments: Comment[] }>(
      `/api/tickets/${ticketId}` // <-- CAMBIO: /api/tickets/:id
    );
    return { ticket: response.data.ticket, comments: response.data.comments };
  },

  createTicket: async (ticketData: { subject: string; description: string; department_id: number; priority?: 'low' | 'medium' | 'high' | 'urgent' }): Promise<Ticket> => {
    const response = await api.post<{ success: boolean; ticket: Ticket }>(
      '/api/tickets', // <-- CAMBIO: /api/tickets
      ticketData
    );
    return response.data.ticket;
  },

  updateTicket: async (ticketId: number, ticketData: Partial<Ticket>): Promise<Ticket> => {
    const response = await api.put<{ success: boolean; ticket: Ticket }>(
      `/api/tickets/${ticketId}`, // <-- CAMBIO: /api/tickets/:id
      ticketData
    );
    return response.data.ticket;
  },

  deleteTicket: async (ticketId: number): Promise<void> => {
    await api.delete(`/api/tickets/${ticketId}`); // <-- CAMBIO: /api/tickets/:id
  },

  addCommentToTicket: async (ticketId: number, commentText: string): Promise<Comment> => {
    const response = await api.post<{ success: boolean; comment: Comment }>(
      `/api/tickets/${ticketId}/comments`, // <-- CAMBIO: /api/tickets/:id/comments
      { comment_text: commentText }
    );
    return response.data.comment;
  },

  getCommentsForTicket: async (ticketId: number): Promise<Comment[]> => {
    const response = await api.get<{ success: boolean; comments: Comment[] }>(
      `/api/tickets/${ticketId}/comments` // <-- CAMBIO: /api/tickets/:id/comments
    );
    return response.data.comments;
  },

  assignTicketToAgent: async (ticketId: number, agentId: number | null): Promise<void> => {
    await api.put(
      `/api/tickets/${ticketId}/assign`, // <-- CAMBIO: /api/tickets/:id/assign
      { agent_id: agentId }
    );
  },

  changeTicketStatus: async (ticketId: number, status: Ticket['status']): Promise<void> => {
    await api.put(
      `/api/tickets/${ticketId}/status`, // <-- CAMBIO: /api/tickets/:id/status
      { status: status }
    );
  },

  uploadAttachment: async (ticketId: number, file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);

    const headers = {
      'Content-Type': 'multipart/form-data',
    } as Record<string, string>;

    const response = await api.post<{ success: boolean; attachment: Attachment }>(
      `/api/tickets/${ticketId}/upload`, // <-- CAMBIO: /api/tickets/:id/upload
      formData,
      { headers }
    );
    return response.data.attachment;
  },
};

export default ticketService;