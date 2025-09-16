import React from 'react';
import type { PaginationProps } from '../types';

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    hasNextPage,
    hasPreviousPage
}) => {
    const getPageNumbers = (): (number | string)[] => {
        const delta = 2;
        const range: number[] = [];
        const rangeWithDots: (number | string)[] = [];

        for (let i = Math.max(2, currentPage - delta);
            i <= Math.min(totalPages - 1, currentPage + delta);
            i++) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, '...');
        } else {
            rangeWithDots.push(1);
        }

        rangeWithDots.push(...range);

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push('...', totalPages);
        } else {
            rangeWithDots.push(totalPages);
        }

        return rangeWithDots;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="d-flex justify-content-center align-items-center flex-wrap gap-2">
            {/* Información de páginas */}
            <div className="me-3 text-muted small d-none d-md-block">
                <i className="fas fa-info-circle me-1"></i>
                Página {currentPage} de {totalPages}
            </div>

            {/* Controles de paginación */}
            <nav aria-label="Paginación">
                <ul className="pagination mb-0">
                    {/* Botón Anterior */}
                    <li className={`page-item ${!hasPreviousPage ? 'disabled' : ''}`}>
                        <button
                            className="page-link d-flex align-items-center"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={!hasPreviousPage}
                            title="Página anterior"
                        >
                            <i className="fas fa-chevron-left me-1"></i>
                            <span className="d-none d-sm-inline">Anterior</span>
                        </button>
                    </li>

                    {/* Números de página */}
                    {getPageNumbers().map((page, index) => (
                        <li key={index} className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}>
                            {page === '...' ? (
                                <span className="page-link">
                                    <i className="fas fa-ellipsis-h"></i>
                                </span>
                            ) : (
                                <button
                                    className="page-link"
                                    onClick={() => onPageChange(page as number)}
                                >
                                    {page}
                                </button>
                            )}
                        </li>
                    ))}

                    {/* Botón Siguiente */}
                    <li className={`page-item ${!hasNextPage ? 'disabled' : ''}`}>
                        <button
                            className="page-link d-flex align-items-center"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={!hasNextPage}
                            title="Página siguiente"
                        >
                            <span className="d-none d-sm-inline">Siguiente</span>
                            <i className="fas fa-chevron-right ms-1"></i>
                        </button>
                    </li>
                </ul>
            </nav>

            {/* Salto rápido a página */}
            {totalPages > 10 && (
                <div className="ms-3 d-none d-lg-flex align-items-center">
                    <small className="text-muted me-2">Ir a:</small>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        style={{ width: '70px' }}
                        min="1"
                        max={totalPages}
                        defaultValue={currentPage}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                const page = parseInt((e.target as HTMLInputElement).value);
                                if (page >= 1 && page <= totalPages) {
                                    onPageChange(page);
                                }
                            }
                        }}
                        title="Presiona Enter para ir a la página"
                    />
                </div>
            )}
        </div>
    );
};

export default Pagination;