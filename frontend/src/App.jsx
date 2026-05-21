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

// Componente para escuchar los cambios en los límites del mapa (bounds)
function MapBoundsListener({ onBoundsChange }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const handleMove = () => {
      onBoundsChange(map.getBounds());
    };
    map.on('moveend', handleMove);
    map.on('zoomend', handleMove);
    // Disparar inicialmente
    handleMove();
    return () => {
      map.off('moveend', handleMove);
      map.off('zoomend', handleMove);
    };
  }, [map, onBoundsChange]);
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

  // Nuevos estados móviles
  const [mapBounds, setMapBounds] = useState(null);
  const [selectedClusterNames, setSelectedClusterNames] = useState([]);
  const [visibleClusters, setVisibleClusters] = useState([]);
  const [quickAssignTecnicoId, setQuickAssignTecnicoId] = useState('');

  // Estados de Importación Interactiva
  const [importStep, setImportStep] = useState(1);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});

  const requiredFields = [
    { key: 'codigo', label: 'Código CTO' },
    { key: 'zona', label: 'Zona/Provincia' },
    { key: 'cluster', label: 'Cluster' },
    { key: 'latitud', label: 'Latitud' },
    { key: 'longitud', label: 'Longitud' }
  ];
  
  const optionalFields = [
    { key: 'usersinc', label: 'UserSinc' },
    { key: 'olt', label: 'OLT' },
    { key: 'entidad', label: 'Entidad' },
    { key: 'municipio', label: 'Municipio' },
    { key: 'provincia', label: 'Provincia' },
    { key: 'empresa', label: 'Empresa' },
    { key: 'estado', label: 'Estado' },
    { key: 'sincronizada', label: 'Sincronizada' },
    { key: 'entregada', label: 'Entregada' },
    { key: 'aceptada', label: 'Aceptada' },
    { key: 'mutualizada', label: 'Mutualizada' },
    { key: 'uuii', label: 'UUII' },
    { key: 'tipoDespliegueInput', label: 'Tipo Despliegue' },
    { key: 'stream', label: 'Stream' },
    { key: 'ec', label: 'EC' },
    { key: 'auditada', label: 'Auditada' },
    { key: 'comentarios', label: 'Comentarios' }
  ];

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

  // Filtrar CTOs por buscador (código) y clusters seleccionados
  useEffect(() => {
    let result = ctos;

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c => c.codigo && c.codigo.toLowerCase().includes(lower));
    }

    if (selectedClusterNames.length > 0) {
      result = result.filter(c => selectedClusterNames.includes(c.clusterNombre));
    }

    setFilteredCtos(result);
  }, [searchTerm, selectedClusterNames, ctos]);

  // Calcular clusters visibles basados en los límites del mapa y contar auditoría
  useEffect(() => {
    if (!mapBounds) {
      setVisibleClusters([]);
      return;
    }

    const visible = ctos.filter(c => {
      if (c.latitud == null || c.longitud == null) return false;
      try {
        return mapBounds.contains([c.latitud, c.longitud]);
      } catch (err) {
        return false;
      }
    });

    const clustersMap = {};
    visible.forEach(c => {
      const clusterName = c.clusterNombre || 'Sin Cluster';
      const clusterId = c.clusterId || 0;
      const tecnico = c.tecnicoAsignado || 'Sin Asignar';

      if (!clustersMap[clusterName]) {
        clustersMap[clusterName] = {
          id: clusterId,
          nombre: clusterName,
          tecnicoAsignado: tecnico,
          total: 0,
          auditadas: 0
        };
      }
      clustersMap[clusterName].total += 1;
      if (c.auditada) {
        clustersMap[clusterName].auditadas += 1;
      }
    });

    const sortedClusters = Object.values(clustersMap).sort((a, b) => a.nombre.localeCompare(b.nombre));
    setVisibleClusters(sortedClusters);
  }, [mapBounds, ctos]);

  const toggleClusterSelection = (clusterName) => {
    const isNowSelected = !selectedClusterNames.includes(clusterName);
    
    setSelectedClusterNames(prev => 
      prev.includes(clusterName)
        ? prev.filter(name => name !== clusterName)
        : [...prev, clusterName]
    );

    if (isNowSelected) {
      // Filtrar CTOs de este cluster que tengan coordenadas válidas para centrar el mapa
      const clusterCtos = ctos.filter(c => c.clusterNombre === clusterName && c.latitud != null && c.longitud != null);
      if (clusterCtos.length > 0) {
        const sumLat = clusterCtos.reduce((sum, c) => sum + c.latitud, 0);
        const sumLng = clusterCtos.reduce((sum, c) => sum + c.longitud, 0);
        const avgLat = sumLat / clusterCtos.length;
        const avgLng = sumLng / clusterCtos.length;
        setMapCenter([avgLat, avgLng]);
        setMapZoom(15);
      }
    }
  };

  const handleQuickAssign = async () => {
    if (!quickAssignTecnicoId) {
      showNotification('Selecciona un técnico para asignar', 'error');
      return;
    }

    // Obtener los IDs de los clusters seleccionados
    const selectedIds = visibleClusters
      .filter(vc => selectedClusterNames.includes(vc.nombre) && vc.id > 0)
      .map(vc => vc.id);

    if (selectedIds.length === 0) {
      showNotification('Selecciona al menos un cluster visible', 'error');
      return;
    }

    try {
      setLoading(true);
      await api.assignClusters(selectedIds, Number(quickAssignTecnicoId));
      showNotification('Asignación rápida completada con éxito');
      setSelectedClusterNames([]);
      setQuickAssignTecnicoId('');
      loadInitialData(); // Recargar datos para ver los cambios reflejados
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

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
  const handleSaveAudit = async (id, overrideAuditada = null, overrideComentarios = null) => {
    const isAuditadaVal = overrideAuditada !== null ? overrideAuditada : editAuditada;
    const comentariosVal = overrideComentarios !== null ? overrideComentarios : editComentarios;

    try {
      setLoading(true);
      await api.updateCTOAudit(id, isAuditadaVal, comentariosVal);
      
      // Actualizar listados locales
      setCtos(prev => prev.map(c => c.id === id ? { ...c, auditada: isAuditadaVal } : c));
      if (selectedCtoDetails && selectedCtoDetails.id === id) {
        setSelectedCtoDetails(prev => ({ ...prev, auditada: isAuditadaVal, comentarios: comentariosVal }));
      }

      // Celebración si se marca como auditada
      if (isAuditadaVal) {
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

  // Seleccionar archivo Excel y extraer cabeceras
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const headers = await api.getExcelHeaders(file);
      setExcelHeaders(headers);
      setSelectedFile(file);
      
      // Auto-map logic
      const newMapping = {};
      const lowerHeaders = headers.map(h => h.toLowerCase());
      
      [...requiredFields, ...optionalFields].forEach(f => {
        let matchIdx = lowerHeaders.findIndex(h => h === f.key.toLowerCase() || h === f.label.toLowerCase());
        if (matchIdx === -1) {
           if (f.key === 'codigo') matchIdx = lowerHeaders.findIndex(h => h.includes('cod') || h.includes('cód'));
           else if (f.key === 'latitud') matchIdx = lowerHeaders.findIndex(h => h.includes('lat'));
           else if (f.key === 'longitud') matchIdx = lowerHeaders.findIndex(h => h.includes('lon') || h.includes('lng'));
        }
        if (matchIdx !== -1) {
          newMapping[f.key] = headers[matchIdx];
        }
      });
      setColumnMapping(newMapping);
      setImportStep(2);
      showNotification('Cabeceras extraídas. Vincula las columnas.');
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirmar importación con el mapeo seleccionado
  const confirmImport = async () => {
    if (!selectedFile) return;

    const missing = requiredFields.filter(f => !columnMapping[f.key]);
    if (missing.length > 0) {
      showNotification(`Faltan vincular campos obligatorios: ${missing.map(m => m.label).join(', ')}`, 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.importExcel(selectedFile, columnMapping);
      showNotification(`Importación completada: ${res.imported} CTOs importadas, ${res.updated} actualizadas`);
      setImportStep(1);
      setSelectedFile(null);
      loadInitialData(); // Recargar mapa y zonas
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
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



      {/* Contenido Principal */}
      <main className="main-content">
        
        {/* PESTAÑA: MAPA (Layout 100% Móvil) */}
        {activeTab === 'map' && (
          <div className="mobile-map-layout">
            <div className="mobile-map-container">
              {/* Buscador flotante sobre el mapa */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                right: '12px',
                zIndex: 1000,
                display: 'flex',
                gap: '10px',
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
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                
                <MapController center={mapCenter} zoom={mapZoom} />
                <MapBoundsListener onBoundsChange={setMapBounds} />

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
              <button className="map-control-btn" onClick={centerOnUser} title="Centrar en mi ubicación" style={{ bottom: '12px', left: '12px' }}>
                <Navigation size={22} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>

            {/* Panel Inferior: Clusters Visibles */}
            <div className="mobile-map-panel">
              <div className="mobile-panel-header">
                <div>
                  <div className="mobile-panel-title">
                    <Grid size={16} style={{ color: 'var(--primary)' }} />
                    <span>Clusters en Vista ({visibleClusters.length})</span>
                  </div>
                  <div className="mobile-panel-subtitle">
                    {selectedClusterNames.length > 0 
                      ? `${selectedClusterNames.length} seleccionados` 
                      : 'Mueve el mapa para actualizar la lista'}
                  </div>
                </div>
                {selectedClusterNames.length > 0 && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 10px', fontSize: '12px', height: 'auto', borderRadius: '6px' }}
                    onClick={() => setSelectedClusterNames([])}
                  >
                    Limpiar Filtro
                  </button>
                )}
              </div>

              <div className="mobile-panel-list">
                {visibleClusters.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No hay clusters visibles en esta zona del mapa.
                  </div>
                ) : (
                  visibleClusters.map(vc => {
                    const isSelected = selectedClusterNames.includes(vc.nombre);
                    const pct = vc.total > 0 ? Math.round((vc.auditadas / vc.total) * 100) : 0;
                    return (
                      <div 
                        key={vc.nombre} 
                        className={`mobile-cluster-card ${isSelected ? 'active' : ''}`}
                        onClick={() => toggleClusterSelection(vc.nombre)}
                      >
                        <div className="mobile-cluster-left">
                          <div className={`mobile-cluster-checkbox ${isSelected ? 'checked' : ''}`}>
                            <Check size={12} strokeWidth={3} />
                          </div>
                          <div className="mobile-cluster-info">
                            <div className="mobile-cluster-name">{vc.nombre}</div>
                            <div className="mobile-cluster-meta">
                              {vc.total} CTOs • {vc.auditadas} auditadas
                            </div>
                          </div>
                        </div>

                        <div className="mobile-cluster-right">
                          <div className="mobile-cluster-progress-container">
                            <div className="mobile-cluster-progress-text">{pct}%</div>
                            <div className="mobile-cluster-progress-bar">
                              <div className="mobile-cluster-progress-fill" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                          <span className={`mobile-cluster-tech-badge ${vc.tecnicoAsignado === 'Sin Asignar' ? 'unassigned' : ''}`}>
                            {vc.tecnicoAsignado}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Barra de acción rápida de asignación si hay clusters seleccionados */}
              {selectedClusterNames.length > 0 && (
                <div className="quick-action-bar">
                  <select 
                    className="quick-action-select"
                    value={quickAssignTecnicoId}
                    onChange={(e) => setQuickAssignTecnicoId(e.target.value)}
                  >
                    <option value="">Asignar a técnico...</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-success quick-action-btn"
                    onClick={handleQuickAssign}
                    disabled={loading || !quickAssignTecnicoId}
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Asignar'}
                  </button>
                </div>
              )}
            </div>

            {/* Panel flotante de detalles si se selecciona una CTO desde el marcador */}
            {selectedCtoDetails && (
              <div className="info-sidebar" style={{ top: '60px', right: '12px', left: '12px', width: 'auto', maxHeight: 'calc(100% - 130px)' }}>
                <div className="info-header">
                  <div className="info-title">CTO {selectedCtoDetails.codigo}</div>
                  <X 
                    size={20} 
                    className="text-muted" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => setSelectedCtoDetails(null)} 
                  />
                </div>
                <div className="info-content" style={{ padding: '16px' }}>
                  <div className="info-meta-grid" style={{ gap: '10px', marginBottom: '12px' }}>
                    <div className="meta-item">
                      <span className="meta-label">Estado</span>
                      <span className={`meta-value ${selectedCtoDetails.auditada ? 'status-audited' : 'status-pending'}`}>
                        {selectedCtoDetails.auditada ? 'AUDITADA' : 'PENDIENTE'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Cluster</span>
                      <span className="meta-value">{selectedCtoDetails.clusterNombre || 'Sin Cluster'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Asignado</span>
                      <span className="meta-value" style={{ color: '#fbbf24' }}>
                        {selectedCtoDetails.tecnicoAsignado || 'No Asignado'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Estado CTO</span>
                      <span className="meta-value">{selectedCtoDetails.estado || 'Activo'}</span>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <span className="meta-label">Comentarios de Campo</span>
                    <textarea 
                      className="form-input"
                      style={{ height: '50px', resize: 'none', fontSize: '13px' }}
                      value={editComentarios}
                      onChange={(e) => setEditComentarios(e.target.value)}
                      placeholder="Escribe comentarios aquí..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ flex: 1, padding: '8px', fontSize: '13px', borderRadius: '8px', height: '36px' }}
                      onClick={() => handleSaveAudit(selectedCtoDetails.id, editAuditada, editComentarios)}
                      disabled={loading}
                    >
                      Guardar Comentario
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '14px' }}>
                    {selectedCtoDetails.auditada ? (
                      <button 
                        className="btn btn-danger" 
                        style={{ flex: 1, padding: '10px', fontSize: '14px', borderRadius: '10px', height: '42px', fontWeight: 'bold' }}
                        onClick={() => {
                          setEditAuditada(false);
                          handleSaveAudit(selectedCtoDetails.id, false, editComentarios);
                        }}
                        disabled={loading}
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Revertir a Pendiente'}
                      </button>
                    ) : (
                      <button 
                        className="btn btn-success" 
                        style={{ flex: 1, padding: '10px', fontSize: '14px', borderRadius: '10px', height: '42px', fontWeight: 'bold' }}
                        onClick={() => {
                          setEditAuditada(true);
                          handleSaveAudit(selectedCtoDetails.id, true, editComentarios);
                        }}
                        disabled={loading}
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : '✓ Completar Auditoría'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: CARGAR EXCEL */}
        {activeTab === 'import' && (
          <div className="panel-container">
            <div className="panel-header">
              <h2>{importStep === 1 ? 'Cargar Archivo Excel' : 'Vincular Columnas'}</h2>
              <p>{importStep === 1 ? 'Sube la plantilla XLS/XLSX con los datos georreferenciados de las cajas (CTOs).' : 'Relaciona las columnas de tu Excel con los campos del sistema.'}</p>
            </div>

            {importStep === 1 && (
              <>
                <div className="card">
                  <input 
                    type="file" 
                    accept=".xlsx,.xls" 
                    style={{ display: 'none' }} 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
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
              </>
            )}

            {importStep === 2 && (
              <div className="card" style={{ padding: '0' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Mapeo de Columnas</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    Hemos detectado {excelHeaders.length} columnas en tu archivo. Por favor, verifica que los campos obligatorios estén asignados correctamente.
                  </p>
                </div>
                
                <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '20px' }}>
                  <h4 style={{ marginBottom: '12px', color: 'var(--primary)', fontSize: '14px' }}>Campos Obligatorios</h4>
                  <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                    {requiredFields.map(f => (
                      <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', width: '120px' }}>{f.label} *</div>
                        <select 
                          className="form-input" 
                          style={{ flex: 1, padding: '8px', fontSize: '13px', border: !columnMapping[f.key] ? '1px solid var(--danger)' : '' }}
                          value={columnMapping[f.key] || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, [f.key]: e.target.value })}
                        >
                          <option value="">-- Ignorar / No Mapear --</option>
                          {excelHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <h4 style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '14px' }}>Campos Opcionales</h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {optionalFields.map(f => (
                      <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', width: '120px' }}>{f.label}</div>
                        <select 
                          className="form-input" 
                          style={{ flex: 1, padding: '8px', fontSize: '13px' }}
                          value={columnMapping[f.key] || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, [f.key]: e.target.value })}
                        >
                          <option value="">-- Ignorar / No Mapear --</option>
                          {excelHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '12px' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => {
                      setImportStep(1);
                      setSelectedFile(null);
                    }}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="btn btn-success" 
                    style={{ flex: 2 }}
                    onClick={confirmImport}
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar e Importar'}
                  </button>
                </div>
              </div>
            )}
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

      {/* Navegación Inferior para Dispositivos Móviles */}
      <nav className="bottom-nav">
        <button 
          className={`bottom-nav-item ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('map');
            setSelectedCtoDetails(null);
          }}
        >
          <MapPin size={20} />
          <span>Mapa</span>
        </button>
        <button 
          className={`bottom-nav-item ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('import');
            setSelectedCtoDetails(null);
          }}
        >
          <UploadCloud size={20} />
          <span>Excel</span>
        </button>
        <button 
          className={`bottom-nav-item ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('assignments');
            setSelectedCtoDetails(null);
          }}
        >
          <Grid size={20} />
          <span>Reparto</span>
        </button>
        <button 
          className={`bottom-nav-item ${activeTab === 'technicians' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('technicians');
            setSelectedCtoDetails(null);
          }}
        >
          <Users size={20} />
          <span>Técnicos</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
