import React from 'react';

const LoadingSpinner: React.FC = () => {
    return (
        <div className="loading-spinner">
            <div className="d-flex flex-column align-items-center">
                <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Cargando...</span>
                </div>
                <div className="text-center">
                    <h5 className="text-muted mb-2">
                        <i className="fas fa-sync-alt fa-spin me-2"></i>
                        Cargando datos
                    </h5>
                    <p className="text-muted small mb-0">
                        Por favor espera un momento...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoadingSpinner;