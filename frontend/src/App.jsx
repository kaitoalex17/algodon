import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import confetti from 'canvas-confetti';
import { 
  MapPin, 
  UploadCloud, 
  Users, 
  Grid, 
  CheckCircle, 
  X, 
  Navigation, 
  Send, 
  Loader2, 
  Search,
  Check,
  AlertCircle
} from 'lucide-react';
import { api } from './api';

import 'leaflet/dist/leaflet.css';

// Componente para controlar la vista del mapa react-leaflet
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

// Iconos Leaflet personalizados creados dinámicamente para evitar problemas de Vite con imágenes PNG
const createCtoIcon = (auditada) => {
  return L.divIcon({
    html: `<div style="
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background-color: ${auditada ? '#10b981' : '#f43f5e'};
      border: 2px solid #ffffff;
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
      cursor: pointer;
      transition: transform 0.2s ease;
    " class="cto-marker-dot"></div>`,
    className: 'custom-cto-icon',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7]
  });
};

const userIcon = L.divIcon({
  html: `
    <div class="gps-marker">
      <div class="gps-dot"></div>
      <div class="gps-pulse"></div>
    </div>
  `,
  className: 'custom-user-icon',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  // Estados del Mapa y CTOs
  const [ctos, setCtos] = useState([]);
  const [filteredCtos, setFilteredCtos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCtoId, setSelectedCtoId] = useState(null);
  const [selectedCtoDetails, setSelectedCtoDetails] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([40.416775, -3.703790]); // Coordenadas de España por defecto
  const [mapZoom, setMapZoom] = useState(6);

  // Estados de Asignaciones y Usuarios
  const [zonas, setZonas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [selectedZonaId, setSelectedZonaId] = useState('');
  const [selectedTecnicoIds, setSelectedTecnicoIds] = useState([]);

  // Estados de carga de técnicos
  const [newUsername, setNewUsername] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Estado temporal de edición de auditoría en Popup
  const [editAuditada, setEditAuditada] = useState(false);
  const [editComentarios, setEditComentarios] = useState('');

  const fileInputRef = useRef(null);

  // Mostrar notificaciones temporales
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Cargar datos iniciales
  const loadInitialData = async () => {
    try {
      const ctoData = await api.getCTOs();
      setCtos(ctoData);
      setFilteredCtos(ctoData);

      // Si hay CTOs, centrar el mapa en la primera que tenga coordenadas válidas
      if (ctoData.length > 0) {
        setMapCenter([ctoData[0].latitud, ctoData[0].longitud]);
        setMapZoom(13);
      }

      const zonasData = await api.getZonas();
      setZonas(zonasData);

      const usuariosData = await api.getUsuarios();
      setUsuarios(usuariosData);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  useEffect(() => {
    loadInitialData();

    // Activar geolocalización en tiempo real
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.warn('Geolocalización denegada o inaccesible:', error.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Filtrar CTOs por buscador (código)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCtos(ctos);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredCtos(ctos.filter(c => c.codigo && c.codigo.toLowerCase().includes(lower)));
    }
  }, [searchTerm, ctos]);

  // Centrar mapa en la ubicación del usuario
  const centerOnUser = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapZoom(16);
      showNotification('Mapa centrado en tu ubicación');
    } else {
      showNotification('Ubicación en tiempo real no disponible', 'error');
    }
  };

  // Cargar detalles de una CTO al seleccionarla
  const handleSelectCto = async (id) => {
    try {
      const details = await api.getCTODetail(id);
      setSelectedCtoDetails(details);
      setEditAuditada(details.auditada);
      setEditComentarios(details.comentarios || '');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  // Guardar la auditoría desde el popup o el panel lateral
  const handleSaveAudit = async (id) => {
    try {
      setLoading(true);
      await api.updateCTOAudit(id, editAuditada, editComentarios);
      
      // Actualizar listados locales
      setCtos(prev => prev.map(c => c.id === id ? { ...c, auditada: editAuditada } : c));
      if (selectedCtoDetails && selectedCtoDetails.id === id) {
        setSelectedCtoDetails(prev => ({ ...prev, auditada: editAuditada, comentarios: editComentarios }));
      }

      // Celebración si se marca como auditada
      if (editAuditada) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      showNotification('Auditoría guardada correctamente');
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Subir archivo Excel
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const res = await api.importExcel(file);
      showNotification(`Importación completada: ${res.imported} CTOs importadas, ${res.updated} actualizadas`);
      loadInitialData(); // Recargar mapa y zonas
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Crear nuevo técnico
  const handleCreateTechnician = async (e) => {
    e.preventDefault();
    if (!newUsername || !newNombre || !newEmail) {
      showNotification('Todos los campos son obligatorios', 'error');
      return;
    }
    try {
      setLoading(true);
      await api.createUsuario(newUsername, newNombre, newEmail);
      showNotification('Técnico registrado correctamente');
      setNewUsername('');
      setNewNombre('');
      setNewEmail('');
      const usuariosData = await api.getUsuarios();
      setUsuarios(usuariosData);
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Alternar selección de técnicos para el reparto
  const toggleTecnicoSelection = (id) => {
    setSelectedTecnicoIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  // Ejecutar reparto equitativo
  const handleDistribute = async () => {
    if (!selectedZonaId) {
      showNotification('Debes elegir una zona', 'error');
      return;
    }
    if (selectedTecnicoIds.length === 0) {
      showNotification('Debes seleccionar al menos un técnico', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.distributeClusters(Number(selectedZonaId), selectedTecnicoIds);
      showNotification(res.message || 'Reparto realizado correctamente');
      setSelectedZonaId('');
      setSelectedTecnicoIds([]);
      loadInitialData(); // Recargar CTOs con técnicos asignados
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Alerta de notificación flotante */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Barra Lateral Izquierda */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-badge">A</div>
          <h1>Algodón Auditor</h1>
        </div>

        <ul className="nav-menu">
          <li 
            className={`nav-item ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            <MapPin size={20} />
            <span>Mapa de CTOs</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('import');
              setSelectedCtoDetails(null);
            }}
          >
            <UploadCloud size={20} />
            <span>Cargar Excel</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('assignments');
              setSelectedCtoDetails(null);
            }}
          >
            <Grid size={20} />
            <span>Reparto de Tareas</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'technicians' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('technicians');
              setSelectedCtoDetails(null);
            }}
          >
            <Users size={20} />
            <span>Técnicos</span>
          </li>
        </ul>

        <div className="sidebar-footer">
          <span>Servidor: algodon.instala.net</span>
          <span>v1.0.0</span>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="main-content">
        
        {/* PESTAÑA: MAPA */}
        {activeTab === 'map' && (
          <div className="map-wrapper">
            {/* Buscador flotante sobre el mapa */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              zIndex: 1000,
              display: 'flex',
              gap: '10px',
              width: '320px',
              background: 'rgba(13, 15, 24, 0.85)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '6px 12px',
              border: '1px solid rgba(255,255,255,0.08)',
              alignItems: 'center',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <Search size={18} className="text-muted" style={{ minWidth: '18px' }} />
              <input 
                type="text" 
                placeholder="Buscar CTO por código..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  width: '100%',
                  outline: 'none',
                  fontSize: '14px',
                  fontFamily: 'inherit'
                }}
              />
              {searchTerm && (
                <X 
                  size={16} 
                  className="text-muted" 
                  style={{ cursor: 'pointer' }} 
                  onClick={() => setSearchTerm('')} 
                />
              )}
            </div>

            {/* Contenedor del Mapa Leaflet */}
            <MapContainer 
              center={mapCenter} 
              zoom={mapZoom} 
              className="map-container"
              zoomControl={false} // Desactivamos el control por defecto para ponerlo a la derecha si quisiéramos
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Servidor de mapas oscuros premium
              />
              
              <MapController center={mapCenter} zoom={mapZoom} />

              {/* Marcador de Ubicación del Usuario */}
              {userLocation && (
                <Marker position={userLocation} icon={userIcon}>
                  <Popup>
                    <strong>Tu posición actual</strong>
                  </Popup>
                </Marker>
              )}

              {/* Marcadores de CTOs */}
              {filteredCtos.map(cto => (
                <Marker 
                  key={cto.id} 
                  position={[cto.latitud, cto.longitud]} 
                  icon={createCtoIcon(cto.auditada)}
                  eventHandlers={{
                    click: () => handleSelectCto(cto.id)
                  }}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="popup-cto-title">CTO: {cto.codigo}</div>
                    <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                      <strong>Estado:</strong> <span style={{ color: cto.estado === 'INACTIVO' ? '#f43f5e' : '#10b981' }}>{cto.estado || 'Activo'}</span>
                    </div>
                    
                    {/* Formulario rápido de auditoría */}
                    <div style={{ 
                      background: 'rgba(255,255,255,0.03)', 
                      padding: '8px', 
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      marginBottom: '10px'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                        <input 
                          type="checkbox" 
                          checked={editAuditada} 
                          onChange={(e) => setEditAuditada(e.target.checked)} 
                        />
                        Auditada
                      </label>
                      
                      <textarea
                        placeholder="Comentarios de campo..."
                        value={editComentarios}
                        onChange={(e) => setEditComentarios(e.target.value)}
                        style={{
                          width: '100%',
                          height: '45px',
                          marginTop: '8px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '6px',
                          color: '#fff',
                          padding: '6px',
                          fontSize: '11px',
                          resize: 'none',
                          fontFamily: 'inherit',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div className="popup-buttons">
                      <button 
                        className="btn btn-success" 
                        style={{ padding: '6px 12px', fontSize: '11px', flex: 1 }}
                        onClick={() => handleSaveAudit(cto.id)}
                        disabled={loading}
                      >
                        {loading ? <Loader2 size={12} className="animate-spin" /> : 'Guardar'}
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '11px', flex: 1 }}
                        onClick={() => {
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${cto.latitud},${cto.longitud}`, '_blank');
                        }}
                      >
                        <Navigation size={12} /> Ir aquí
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Botón flotante para centrar en mi ubicación */}
            <button className="map-control-btn" onClick={centerOnUser} title="Centrar en mi ubicación">
              <Navigation size={22} style={{ transform: 'rotate(45deg)' }} />
            </button>

            {/* Panel lateral derecho con detalles completos de la CTO seleccionada */}
            {selectedCtoDetails && (
              <div className="info-sidebar">
                <div className="info-header">
                  <div className="info-title">Detalles de la CTO</div>
                  <X 
                    size={20} 
                    className="text-muted" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => setSelectedCtoDetails(null)} 
                  />
                </div>
                <div className="info-content">
                  <div className="info-meta-grid">
                    <div className="meta-item">
                      <span className="meta-label">Código</span>
                      <span className="meta-value" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                        {selectedCtoDetails.codigo}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Auditoría</span>
                      <span className={`meta-value ${selectedCtoDetails.auditada ? 'status-audited' : 'status-pending'}`}>
                        {selectedCtoDetails.auditada ? 'AUDITADA' : 'PENDIENTE'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Zona</span>
                      <span className="meta-value">{selectedCtoDetails.zonaNombre || 'Sin Zona'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Cluster</span>
                      <span className="meta-value">{selectedCtoDetails.clusterNombre || 'Sin Cluster'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Técnico Asignado</span>
                      <span className="meta-value" style={{ color: '#fbbf24' }}>
                        {selectedCtoDetails.tecnicoAsignado || 'No Asignado'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Estado</span>
                      <span className="meta-value">{selectedCtoDetails.estado || 'N/A'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Municipio</span>
                      <span className="meta-value">{selectedCtoDetails.municipio || 'N/A'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Provincia</span>
                      <span className="meta-value">{selectedCtoDetails.provincia || 'N/A'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">OLT</span>
                      <span className="meta-value">{selectedCtoDetails.olt || 'N/A'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Empresa</span>
                      <span className="meta-value">{selectedCtoDetails.empresa || 'N/A'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">UUII</span>
                      <span className="meta-value">{selectedCtoDetails.uuii ?? 'N/A'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Stream</span>
                      <span className="meta-value">{selectedCtoDetails.stream || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '20px' }}>
                    <span className="meta-label">Editar Comentarios</span>
                    <textarea 
                      className="form-input"
                      style={{ height: '80px', resize: 'none' }}
                      value={editComentarios}
                      onChange={(e) => setEditComentarios(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '20px 0' }}>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={editAuditada}
                        onChange={(e) => setEditAuditada(e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>Marcar como caja auditada</span>
                  </div>

                  <button 
                    className="btn btn-success" 
                    style={{ width: '100%', padding: '14px' }}
                    onClick={() => handleSaveAudit(selectedCtoDetails.id)}
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Guardar Auditoría'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: CARGAR EXCEL */}
        {activeTab === 'import' && (
          <div className="panel-container">
            <div className="panel-header">
              <h2>Cargar Archivo Excel</h2>
              <p>Sube la plantilla XLS/XLSX con los datos georreferenciados de las cajas (CTOs).</p>
            </div>

            <div className="card">
              <input 
                type="file" 
                accept=".xlsx,.xls" 
                style={{ display: 'none' }} 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              
              <div 
                className="upload-zone"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <div className="upload-icon">
                  {loading ? <Loader2 size={48} className="animate-spin" /> : <UploadCloud size={48} />}
                </div>
                <h3>{loading ? 'Procesando archivo...' : 'Arrastra o haz clic para subir tu Excel'}</h3>
                <p style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  El archivo debe contener columnas obligatorias como: <strong>zona, cluster, código, latitud, longitud</strong>.
                </p>
              </div>
            </div>

            <div className="card" style={{ background: 'rgba(16, 185, 129, 0.03)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                <div>
                  <h4 style={{ color: 'var(--success)', marginBottom: '4px' }}>Funcionamiento del Importador</h4>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Al cargar un nuevo Excel, el backend lee las filas y crea automáticamente las Zonas y Clusters ausentes. 
                    Si una CTO ya existía por su código, actualizará sus datos en lugar de duplicarla.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: REPARTO DE TAREAS */}
        {activeTab === 'assignments' && (
          <div className="panel-container">
            <div className="panel-header">
              <h2>Reparto de Tareas Equitativo</h2>
              <p>Selecciona una zona, marca los técnicos asignados a la campaña y divide los clusters equitativamente.</p>
            </div>

            <div className="card">
              <div className="form-group" style={{ maxWidth: '400px', marginBottom: '24px' }}>
                <label className="form-label">1. Elige la Zona</label>
                <select 
                  className="form-input" 
                  value={selectedZonaId}
                  onChange={(e) => setSelectedZonaId(e.target.value)}
                >
                  <option value="">Selecciona una zona...</option>
                  {zonas.map(z => (
                    <option key={z.id} value={z.id}>{z.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '32px' }}>
                <label className="form-label">2. Elige a los Técnicos (Toca para seleccionar)</label>
                {usuarios.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                    No hay técnicos registrados. Ve a la pestaña "Técnicos" para dar de alta algunos.
                  </p>
                ) : (
                  <div className="grid-container" style={{ marginTop: '8px' }}>
                    {usuarios.map(u => {
                      const isSelected = selectedTecnicoIds.includes(u.id);
                      return (
                        <div 
                          key={u.id}
                          className={`tecnico-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleTecnicoSelection(u.id)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: isSelected ? '#fff' : 'inherit' }}>{u.nombre}</strong>
                            {isSelected && <Check size={16} style={{ color: '#fff' }} />}
                          </div>
                          <div style={{ fontSize: '13px', color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginTop: '4px' }}>
                            @{u.username}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button 
                className="btn btn-success" 
                onClick={handleDistribute}
                disabled={loading || !selectedZonaId || selectedTecnicoIds.length === 0}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Ejecutar Reparto Aleatorio Equitativo
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑA: TÉCNICOS */}
        {activeTab === 'technicians' && (
          <div className="panel-container">
            <div className="panel-header">
              <h2>Gestión de Técnicos de Campo</h2>
              <p>Crea o visualiza los técnicos que realizarán las auditorías en campo.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
              
              {/* Formulario de creación */}
              <div className="card">
                <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Registrar Técnico</h3>
                <form onSubmit={handleCreateTechnician}>
                  <div className="form-group">
                    <label className="form-label">Nombre de Usuario</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="ej. jgomez"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombre Completo</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="ej. Juan Gómez"
                      value={newNombre}
                      onChange={(e) => setNewNombre(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Correo Electrónico</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      placeholder="ej. juan@instala.net"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn" 
                    style={{ width: '100%', marginTop: '10px' }}
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Guardar Técnico'}
                  </button>
                </form>
              </div>

              {/* Listado de Técnicos */}
              <div className="card">
                <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Listado de Técnicos Activos</h3>
                {usuarios.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                    No hay ningún técnico registrado todavía.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {usuarios.map(u => (
                      <div 
                        key={u.id}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '16px' }}>{u.nombre}</strong>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            @{u.username} • {u.email}
                          </div>
                        </div>
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          color: 'var(--success)',
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontWeight: '600'
                        }}>
                          ACTIVO
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
