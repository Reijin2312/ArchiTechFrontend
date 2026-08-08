import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
export function DragDropZone({ onFile, accept, maxSize = 2 * 1024 * 1024, children, className = '' }) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState(null);
    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);
    const handleDragIn = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    }, []);
    const handleDragOut = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        setError(null);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (accept) {
                const acceptedTypes = accept.split(',').map((t) => t.trim());
                const fileType = file.type;
                const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
                const isAccepted = acceptedTypes.some((type) => type === fileType ||
                    type === fileExt ||
                    (type.endsWith('/*') && fileType.startsWith(type.replace('/*', ''))));
                if (!isAccepted) {
                    setError(`Разрешены только: ${accept}`);
                    return;
                }
            }
            if (file.size > maxSize) {
                setError(`Файл слишком большой (макс. ${(maxSize / 1024 / 1024).toFixed(1)} МБ)`);
                return;
            }
            onFile(file);
        }
    }, [onFile, accept, maxSize]);
    return (_jsxs("div", { onDragEnter: handleDragIn, onDragLeave: handleDragOut, onDragOver: handleDrag, onDrop: handleDrop, className: `relative transition-all ${className}`, children: [isDragging && (_jsx("div", { className: "pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-sky-500 bg-sky-500/10 backdrop-blur-sm", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-2xl mb-2", children: "\uD83D\uDCC1" }), _jsx("div", { className: "text-sm font-medium text-sky-300", children: "\u041E\u0442\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0444\u0430\u0439\u043B" })] }) })), children, error && (_jsx("div", { className: "mt-2 text-xs text-red-400", children: error }))] }));
}
