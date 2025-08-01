// frontend/src/pages/ClientCreateTicketPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { TicketData, Department, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import Layout from '../components/Layout/Layout';
import TicketFormModal from '../components/Tickets/TicketFormModal';

const ClientCreateTicketPage: React.FC = () => {
    const { user, token } = useAuth();
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(true);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [loadingDepartments, setLoadingDepartments] = useState(true);
    const [errorDepartments, setErrorDepartments] = useState<string | null>(null);

    const fetchAllDepartments = useCallback(async () => {
        if (!token) return;
        setLoadingDepartments(true);
        setErrorDepartments(null);
        try {
            const response = await api.get<{ departments: Department[] }>('/api/departments', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAllDepartments(Array.isArray(response.data.departments) ? response.data.departments : []);
        } catch (err: unknown) {
            console.error('Error fetching all departments:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setErrorDepartments(apiError?.message || 'Error al cargar los departamentos.');
                addNotification(`Error al cargar departamentos: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setErrorDepartments('Ocurrió un error inesperado al cargar los departamentos.'); // CORREGIDO: Un solo argumento
                addNotification('Ocurrió un error inesperado al cargar los departamentos.', 'error');
            }
            setAllDepartments([]);
        } finally {
            setLoadingDepartments(false);
        }
    }, [token, addNotification]);

    useEffect(() => {
        if (user && token && user.role === 'client') {
            fetchAllDepartments();
        }
    }, [user, token, fetchAllDepartments]);

    const handleSaveTicket = async (ticketData: Omit<TicketData, 'id' | 'created_at' | 'updated_at' | 'closed_at' | 'user_username' | 'agent_username' | 'department_name' | 'user_id'> | Partial<TicketData>) => {
        try {
            await api.post('/api/tickets', { ...ticketData, user_id: user?.id }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Ticket creado exitosamente.', 'success');
            setIsModalOpen(false);
            navigate('/client/my-tickets');
        } catch (err: unknown) {
            console.error('Error creating ticket:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al crear ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al crear el ticket.', 'error');
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        navigate('/client/dashboard');
    };

    if (!user || user.role !== 'client') {
        return <Layout><div className="text-center p-4 text-red-500">Acceso denegado. Solo clientes pueden crear tickets.</div></Layout>;
    }

    if (loadingDepartments) {
        return <Layout><div className="flex justify-center items-center h-full"><span className="text-lg">Cargando departamentos...</span></div></Layout>;
    }

    if (errorDepartments) {
        return <Layout><div className="text-red-500 text-center p-4">Error: {errorDepartments}</div></Layout>;
    }

    return (
        <Layout>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Crear Nuevo Ticket</h1>
                {isModalOpen && (
                    <TicketFormModal
                        isOpen={isModalOpen}
                        onClose={handleCloseModal}
                        onSave={handleSaveTicket}
                        initialData={null}
                        departments={allDepartments}
                        users={[]}
                    />
                )}
            </div>
        </Layout>
    );
};

export default ClientCreateTicketPage;
