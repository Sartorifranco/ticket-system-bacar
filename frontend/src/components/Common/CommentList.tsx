// frontend/src/components/Common/CommentList.tsx
import React from 'react';
import { Comment } from '../../types'; // Importar la interfaz Comment

interface CommentListProps {
    comments: Comment[];
}

const CommentList: React.FC<CommentListProps> = ({ comments }) => {
    return (
        <div className="h-64 overflow-y-auto mb-4 border rounded-md p-2 bg-gray-50">
            {comments.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">No hay comentarios aún.</p>
            ) : (
                comments.map((comment) => (
                    <div key={comment.id} className="mb-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                        <p className="text-sm font-semibold text-gray-900">{comment.user_username}</p>
                        <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                        <p className="text-xs text-gray-500 text-right mt-1">{new Date(comment.created_at).toLocaleString()}</p>
                    </div>
                ))
            )}
        </div>
    );
};

export default CommentList;
