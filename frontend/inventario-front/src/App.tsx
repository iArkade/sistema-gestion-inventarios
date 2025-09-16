import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import ProductsPage from './pages/ProductsPage';
import TransactionsPage from './pages/TransactionsPage';
import FiltersPage from './pages/FiltersPage';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

const Navigation: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { path: '/products', icon: 'fa-boxes', label: 'Productos', description: 'Gestión de inventario' },
    { path: '/transactions', icon: 'fa-exchange-alt', label: 'Transacciones', description: 'Compras y ventas' },
    { path: '/filters', icon: 'fa-chart-bar', label: 'Reportes', description: 'Análisis y filtros' }
  ];

  return (
    <nav className="navbar navbar-expand-lg navbar-dark">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <div className="me-3">
            <i className="fas fa-cube fa-lg"></i>
          </div>
          <div>
            <div className="fw-bold">Gestion de Inventario</div>
          </div>
        </Link>

        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <div className="navbar-nav ms-auto">
            {navItems.map(item => (
              <Link
                key={item.path}
                className={`nav-link d-flex align-items-center ${isActive(item.path) ? 'active' : ''}`}
                to={item.path}
                title={item.description}
              >
                <i className={`fas ${item.icon} me-2`}></i>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

// Componente de página no encontrada mejorado
const NotFoundPage: React.FC = () => (
  <div className="container py-5">
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <div className="card text-center">
          <div className="card-body py-5">
            <div className="empty-state">
              <div className="mb-4">
                <i className="fas fa-map-marked-alt fa-4x text-primary mb-3"></i>
              </div>
              <h2 className="text-dark mb-3">¡Ups! Página no encontrada</h2>
              <p className="text-muted mb-4 lead">
                La página que buscas no existe o ha sido movida a otra ubicación.
              </p>
              <div className="d-flex gap-3 justify-content-center flex-wrap">
                <Link to="/" className="btn btn-primary btn-lg">
                  <i className="fas fa-home me-2"></i>
                  Ir al Inicio
                </Link>
                <button
                  className="btn btn-outline-secondary btn-lg"
                  onClick={() => window.history.back()}
                >
                  <i className="fas fa-arrow-left me-2"></i>
                  Volver Atrás
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Componente de carga inicial
const LoadingPage: React.FC = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
    <div className="text-center">
      <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
        <span className="visually-hidden">Cargando...</span>
      </div>
      <h5 className="text-muted">Cargando aplicación...</h5>
    </div>
  </div>
);

const Footer: React.FC = () => (
  <footer className="mt-5 py-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderTop: '1px solid #e2e8f0' }}>
    <div className="container">
      <div className="row align-items-center">
        <div className="col-md-6">
          <div className="d-flex align-items-center">
            <i className="fas fa-cube text-primary me-2"></i>
            <small className="text-muted">
              <strong>Inventario</strong> - Sistema de Gestión de Inventarios
            </small>
          </div>
        </div>
        <div className="col-md-6 text-md-end mt-2 mt-md-0">
          <small className="text-muted">
            <i className="fas fa-code me-1"></i>
            Desarrollado con React & .NET
            <span className="mx-2">•</span>
            <i className="fas fa-calendar-alt me-1"></i>
            2025
          </small>
        </div>
      </div>
    </div>
  </footer>
);

// Componente principal de la aplicación
const App: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simular carga inicial
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="App">
        <LoadingPage />
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Navigation />

        <main className="container-fluid py-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <Routes>
            <Route path="/" element={<ProductsPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/filters" element={<FiltersPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;