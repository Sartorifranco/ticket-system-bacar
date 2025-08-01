// frontend/src/components/Common/CommentForm.tsx
import React, { useState } from 'react';
import { useNotification } from '../../context/NotificationContext'; // Asumo que lo usas aquí

interface CommentFormProps {
    onAddComment: (commentText: string) => Promise<void>;
}

const CommentForm: React.FC<CommentFormProps> = ({ onAddComment }) => {
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(false);
    const { addNotification } = useNotification();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) {
            addNotification('El comentario no puede estar vacío.', 'warning');
            return;
        }
        setLoading(true);
        try {
            await onAddComment(commentText);
            setCommentText(''); // Limpiar el campo después de enviar
        } catch (error) {
            // El error ya es manejado por onAddComment en el componente padre
            console.error('Error al enviar comentario desde CommentForm:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col space-y-3 mt-4">
            <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Añadir un comentario..."
                rows={3}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                disabled={loading}
            ></textarea>
            <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
                disabled={loading}
            >
                {loading ? 'Enviando...' : 'Añadir Comentario'}
            </button>
        </form>
    );
};

export default CommentForm;
