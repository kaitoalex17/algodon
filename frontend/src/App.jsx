import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import confetti from 'canvas-confetti';
import { 
  Grid, 
  X, 
  Navigation, 
  Loader2, 
  Search,
  Check,
  Filter,
  Layers,
  Map as MapIcon,
  HardDrive,
  ExternalLink,
  Save,
  Info,
  Plus,
  Sun,
  Moon
} from 'lucide-react';
import { api } from './api';
import 'leaflet/dist/leaflet.css';

// Hook para persistencia local
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(error);
    }
  };
  return [storedValue, setValue];
}

// Controladores del Mapa
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

function MapBoundsListener({ onBoundsChange }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const handleMove = () => {
      onBoundsChange(map.getBounds());
      const center = map.getCenter();
      window.localStorage.setItem('algodon_map_center', JSON.stringify([center.lat, center.lng]));
      window.localStorage.setItem('algodon_map_zoom', JSON.stringify(map.getZoom()));
    };
    map.on('moveend', handleMove);
    map.on('zoomend', handleMove);
    handleMove();
    return () => {
      map.off('moveend', handleMove);
      map.off('zoomend', handleMove);
    };
  }, [map, onBoundsChange]);
  return null;
}

function ActiveLayerListener({ setActiveLayer }) {
  const map = useMap();
  useEffect(() => {
    const handleLayerChange = (e) => {
      window.localStorage.setItem('algodon_active_layer', e.name);
      setActiveLayer(e.name);
    };
    map.on('baselayerchange', handleLayerChange);
    return () => {
      map.off('baselayerchange', handleLayerChange);
    };
  }, [map, setActiveLayer]);
  return null;
}

function MapClickHandler({ onMapClick, active }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const handleMapClick = (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onMapClick, active]);
  return null;
}

// Colores Dinámicos
const getTechColor = (techName) => {
  if (!techName || techName === 'Sin Asignar') return '#64748b';
  let hash = 0;
  for (let i = 0; i < techName.length; i++) {
    hash = techName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#e11d48"];
  return colors[Math.abs(hash) % colors.length];
};

const createCtoIcon = (estadoAuditoria, techName) => {
  const fillColor = getTechColor(techName);
  let borderColor = '#ffffff'; 
  if (estadoAuditoria === 'CORRECTO') borderColor = '#10b981'; // Verde
  else if (estadoAuditoria === 'FALLO') borderColor = '#ef4444'; // Rojo

  return L.divIcon({
    html: `<div style="
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background-color: ${fillColor};
      border: 3px solid ${borderColor};
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
      cursor: pointer;
    " class="cto-marker-dot"></div>`,
    className: 'custom-cto-icon',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9]
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
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  // Estados del Mapa
  const [ctos, setCtos] = useState([]);
  const [filteredCtos, setFilteredCtos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCtoDetails, setSelectedCtoDetails] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const savedCenter = JSON.parse(window.localStorage.getItem('algodon_map_center')) || [36.429342, -5.140716];
  const savedZoom = JSON.parse(window.localStorage.getItem('algodon_map_zoom')) || 13;
  const [mapCenter, setMapCenter] = useState(savedCenter);
  const [mapZoom, setMapZoom] = useState(savedZoom);

  // Tema y Capa Activa
  const [theme, setTheme] = useState(() => window.localStorage.getItem('algodon_theme') || 'dark');
  const [activeLayer, setActiveLayer] = useState(() => window.localStorage.getItem('algodon_active_layer') || 'Carto Dark');

  useEffect(() => {
    window.localStorage.setItem('algodon_theme', theme);
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  useEffect(() => {
    if (theme === 'light') {
      if (activeLayer === 'Carto Dark') {
        setActiveLayer('Carto Light');
        window.localStorage.setItem('algodon_active_layer', 'Carto Light');
      }
    } else {
      if (activeLayer === 'Carto Light') {
        setActiveLayer('Carto Dark');
        window.localStorage.setItem('algodon_active_layer', 'Carto Dark');
      }
    }
  }, [theme]);
  const [mapBounds, setMapBounds] = useState(null);
  
  // Clusters
  const [selectedClusterNames, setSelectedClusterNames] = useState([]);
  const [visibleClusters, setVisibleClusters] = useState([]);
  const [expandedClusters, setExpandedClusters] = useState([]);
  const [viewMode, setViewMode] = useState('mapa');

  // Manual CTO creation states
  const [estados, setEstados] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);
  const [newCtoData, setNewCtoData] = useState({
    codigo: '',
    latitud: '',
    longitud: '',
    estado: '',
    zonaId: '',
    clusterId: ''
  });

  // Data de referencia
  const [usuarios, setUsuarios] = useState([]);
  const [zonas, setZonas] = useState([]);
  
  // Filtros Locales Persistentes
  const [selectedFilterTech, setSelectedFilterTech] = useLocalStorage('algodon_tech_filter', '');
  const [selectedFilterZona, setSelectedFilterZona] = useLocalStorage('algodon_zona_filter', '');
  const [selectedFilterEstado, setSelectedFilterEstado] = useLocalStorage('algodon_estado_filter', '');
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados de edición de popup
  const [editComentarios, setEditComentarios] = useState('');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const loadInitialData = async () => {
    try {
      const ctoData = await api.getCTOs();
      setCtos(ctoData);
      
      const usuariosData = await api.getUsuarios();
      setUsuarios(usuariosData);
      
      const zonasData = await api.getZonas();
      setZonas(zonasData);
      
      try {
        const estadosData = await api.getEstados();
        setEstados(estadosData);
      } catch (err) {
        console.warn('Error loading custom states:', err);
      }
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  useEffect(() => {
    loadInitialData();
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => console.warn(error.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Filtrado de CTOs para el mapa
  useEffect(() => {
    let result = ctos;

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c => 
        (c.codigo && c.codigo.toLowerCase().includes(lower)) ||
        (c.clusterNombre && c.clusterNombre.toLowerCase().includes(lower)) ||
        (c.zonaNombre && c.zonaNombre.toLowerCase().includes(lower)) ||
        (c.tecnicoAsignado && c.tecnicoAsignado.toLowerCase().includes(lower)) ||
        (c.municipio && c.municipio.toLowerCase().includes(lower)) ||
        (c.estado && c.estado.toLowerCase().includes(lower))
      );
    }
    
    if (selectedFilterTech) {
      result = result.filter(c => c.tecnicoAsignado === selectedFilterTech);
    }
    
    if (selectedFilterZona) {
      result = result.filter(c => c.zonaNombre === selectedFilterZona);
    }
    
    if (selectedFilterEstado) {
      if (selectedFilterEstado === 'REALIZADAS') {
        result = result.filter(c => c.estadoAuditoria === 'CORRECTO' || c.estadoAuditoria === 'FALLO');
      } else if (selectedFilterEstado === 'PENDIENTES') {
        result = result.filter(c => c.estadoAuditoria === 'PENDIENTE' || !c.estadoAuditoria);
      }
    }

    if (selectedClusterNames.length > 0) {
      result = result.filter(c => selectedClusterNames.includes(c.clusterNombre));
    }

    setFilteredCtos(result);
  }, [searchTerm, selectedFilterTech, selectedFilterZona, selectedFilterEstado, selectedClusterNames, ctos]);

  // Cálculo de Clusters Visibles
  useEffect(() => {
    if (!mapBounds) {
      setVisibleClusters([]);
      return;
    }
    const visible = ctos.filter(c => {
      if (c.latitud == null || c.longitud == null) return false;
      try { return mapBounds.contains([c.latitud, c.longitud]); } catch (err) { return false; }
    });

    const clustersMap = {};
    visible.forEach(c => {
      // Ignorar del listado de clusters los que no coinciden con el filtro de técnico si hay uno
      if (selectedFilterTech && c.tecnicoAsignado !== selectedFilterTech) return;
      
      const clusterName = c.clusterNombre || 'Sin Cluster';
      if (!clustersMap[clusterName]) {
        clustersMap[clusterName] = {
          id: c.clusterId || 0,
          nombre: clusterName,
          tecnicoAsignado: c.tecnicoAsignado || 'Sin Asignar',
          total: 0,
          auditadas: 0
        };
      }
      clustersMap[clusterName].total += 1;
      if (c.estadoAuditoria === 'CORRECTO' || c.estadoAuditoria === 'FALLO') {
        clustersMap[clusterName].auditadas += 1;
      }
    });

    setVisibleClusters(Object.values(clustersMap).sort((a, b) => a.nombre.localeCompare(b.nombre)));
  }, [mapBounds, ctos, selectedFilterTech]);

  const toggleClusterSelection = (clusterName, e) => {
    if (e) e.stopPropagation();
    const isNowSelected = !selectedClusterNames.includes(clusterName);
    setSelectedClusterNames(prev => 
      prev.includes(clusterName) ? prev.filter(name => name !== clusterName) : [...prev, clusterName]
    );

    if (isNowSelected) {
      const clusterCtos = ctos.filter(c => c.clusterNombre === clusterName && c.latitud != null && c.longitud != null);
      if (clusterCtos.length > 0) {
        const sumLat = clusterCtos.reduce((sum, c) => sum + c.latitud, 0);
        const sumLng = clusterCtos.reduce((sum, c) => sum + c.longitud, 0);
        setMapCenter([sumLat / clusterCtos.length, sumLng / clusterCtos.length]);
        setMapZoom(15);
      }
    }
  };

  const toggleClusterExpansion = (clusterName, e) => {
    if (e) e.stopPropagation();
    setExpandedClusters(prev => 
      prev.includes(clusterName) ? prev.filter(name => name !== clusterName) : [...prev, clusterName]
    );
  };

  const centerOnUser = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapZoom(16);
      showNotification('Mapa centrado en tu ubicación');
    } else {
      showNotification('Ubicación no disponible', 'error');
    }
  };

  const handleSelectCto = async (id) => {
    try {
      setShowAddForm(false);
      setIsSelectingOnMap(false);
      const details = await api.getCTODetail(id);
      setSelectedCtoDetails(details);
      setEditComentarios(details.comentarios || '');
      setEditLat(details.latitud || '');
      setEditLng(details.longitud || '');
      setIsEditingLocation(false);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const handleUpdateStatus = async (id, nuevoEstadoAuditoria) => {
    try {
      setLoading(true);
      const isAuditada = nuevoEstadoAuditoria === 'CORRECTO' || nuevoEstadoAuditoria === 'FALLO';
      await api.updateCTOAudit(id, isAuditada, editComentarios, nuevoEstadoAuditoria);
      
      setCtos(prev => prev.map(c => c.id === id ? { ...c, estadoAuditoria: nuevoEstadoAuditoria, auditada: isAuditada } : c));
      if (selectedCtoDetails && selectedCtoDetails.id === id) {
        setSelectedCtoDetails(prev => ({ ...prev, estadoAuditoria: nuevoEstadoAuditoria, auditada: isAuditada, comentarios: editComentarios }));
      }

      if (nuevoEstadoAuditoria === 'CORRECTO') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      showNotification(`Auditoría guardada como ${nuevoEstadoAuditoria}`);
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveComment = async () => {
    if (!selectedCtoDetails) return;
    try {
      setLoading(true);
      await api.updateCTOAudit(
        selectedCtoDetails.id, 
        selectedCtoDetails.auditada || false, 
        editComentarios, 
        selectedCtoDetails.estadoAuditoria || 'PENDIENTE'
      );
      setSelectedCtoDetails(prev => ({ ...prev, comentarios: editComentarios }));
      showNotification('Notas guardadas correctamente');
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedCtoDetails) return;
    try {
      setLoading(true);
      await api.updateCTOLocation(selectedCtoDetails.id, parseFloat(editLat), parseFloat(editLng));
      
      // Update local state
      setCtos(prev => prev.map(c => c.id === selectedCtoDetails.id ? { ...c, latitud: parseFloat(editLat), longitud: parseFloat(editLng) } : c));
      setSelectedCtoDetails(prev => ({ ...prev, latitud: parseFloat(editLat), longitud: parseFloat(editLng) }));
      setIsEditingLocation(false);
      showNotification('Ubicación actualizada correctamente');
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCTO = async (e) => {
    e.preventDefault();
    if (!newCtoData.codigo || !newCtoData.latitud || !newCtoData.longitud) {
      showNotification('Por favor, rellena todos los campos obligatorios', 'error');
      return;
    }
    
    try {
      setLoading(true);
      const payload = {
        codigo: newCtoData.codigo,
        latitud: parseFloat(newCtoData.latitud),
        longitud: parseFloat(newCtoData.longitud),
        estado: newCtoData.estado || 'PENDIENTE',
        cluster: null
      };

      await api.createCTO(payload);
      showNotification('CTO Creada Manualmente');
      
      // Reset form
      setNewCtoData({
        codigo: '',
        latitud: '',
        longitud: '',
        estado: '',
        zonaId: '',
        clusterId: ''
      });
      setShowAddForm(false);
      setIsSelectingOnMap(false);
      
      // Reload CTO list
      await loadInitialData();
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ paddingBottom: 0 }}>
      {notification && (
        <div className={`notification ${notification.type}`}>{notification.message}</div>
      )}

      <div className="mobile-map-layout" style={{ height: '100vh', paddingBottom: 0, position: 'relative' }}>
        
        {/* Header Controls */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(13, 15, 24, 0.85)',
              backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <Search size={18} className="text-muted" />
              <input 
                type="text" 
                placeholder="Buscar CTO..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none', marginLeft: '8px', fontSize: '16px' }}
              />
              {searchTerm && <X size={16} className="text-muted" onClick={() => setSearchTerm('')} />}
            </div>
            
            <button 
              className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ padding: '8px', borderRadius: '12px', minWidth: '42px', display: 'flex', justifyContent: 'center' }}
              onClick={() => { setShowFilters(!showFilters); setShowAddForm(false); }}
            >
              <Filter size={18} />
            </button>

            <button 
              className={`btn ${showAddForm ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ padding: '8px', borderRadius: '12px', minWidth: '42px', display: 'flex', justifyContent: 'center' }}
              onClick={() => { setShowAddForm(!showAddForm); setShowFilters(false); setSelectedCtoDetails(null); }}
              title="Añadir CTO Manual"
            >
              <Plus size={18} />
            </button>

            <button 
              className="btn btn-secondary" 
              style={{ padding: '8px', borderRadius: '12px', minWidth: '42px', display: 'flex', justifyContent: 'center' }}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>

          {/* Menú Central / Selector de Vista */}
          <div style={{
            display: 'flex', 
            background: 'rgba(13, 15, 24, 0.85)', 
            backdropFilter: 'blur(10px)', 
            borderRadius: '10px', 
            padding: '2px', 
            border: '1px solid rgba(255,255,255,0.08)',
            alignSelf: 'center',
            width: '180px'
          }}>
            <button 
              onClick={() => setViewMode('mapa')}
              style={{
                flex: 1, 
                padding: '5px 10px', 
                borderRadius: '8px', 
                border: 'none', 
                background: viewMode === 'mapa' ? 'var(--primary)' : 'transparent', 
                color: '#fff', 
                fontSize: '12px', 
                cursor: 'pointer',
                fontWeight: viewMode === 'mapa' ? '600' : 'normal',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <MapIcon size={14} />
              <span>Mapa</span>
            </button>
            <button 
              onClick={() => setViewMode('lista')}
              style={{
                flex: 1, 
                padding: '5px 10px', 
                borderRadius: '8px', 
                border: 'none', 
                background: viewMode === 'lista' ? 'var(--primary)' : 'transparent', 
                color: '#fff', 
                fontSize: '12px', 
                cursor: 'pointer',
                fontWeight: viewMode === 'lista' ? '600' : 'normal',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <Grid size={14} />
              <span>Lista</span>
            </button>
          </div>
        </div>

        {/* Menú Flotante de Filtros */}
        {showFilters && (
          <div style={{
            position: 'absolute', top: '105px', right: '12px', width: '220px', zIndex: 1000,
            background: 'var(--bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-lg)',
            display: 'flex', flexDirection: 'column', gap: '12px'
          }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Filtrar por Técnico</label>
              <select 
                className="form-input" 
                style={{ width: '100%', fontSize: '16px', padding: '8px' }}
                value={selectedFilterTech}
                onChange={(e) => setSelectedFilterTech(e.target.value)}
              >
                <option value="">Todos los técnicos</option>
                <option value="Sin Asignar">Sin Asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Filtrar por Zona</label>
              <select 
                className="form-input" 
                style={{ width: '100%', fontSize: '16px', padding: '8px' }}
                value={selectedFilterZona}
                onChange={(e) => setSelectedFilterZona(e.target.value)}
              >
                <option value="">Todas las zonas</option>
                {zonas.map(z => <option key={z.id} value={z.nombre}>{z.nombre}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Filtrar por Estado</label>
              <select 
                className="form-input" 
                style={{ width: '100%', fontSize: '16px', padding: '8px' }}
                value={selectedFilterEstado}
                onChange={(e) => setSelectedFilterEstado(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="PENDIENTES">Pendientes</option>
                <option value="REALIZADAS">Realizadas</option>
              </select>
            </div>
          </div>
        )}

        {viewMode === 'mapa' ? (
          <>
            <div className="mobile-map-container" style={{ flex: 1 }}>
              {/* Mapa */}
              <MapContainer center={mapCenter} zoom={mapZoom} className="map-container" zoomControl={false}>
                <LayersControl position="bottomleft">
                  <LayersControl.BaseLayer checked={activeLayer === 'Carto Dark'} name="Carto Dark">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer checked={activeLayer === 'Carto Light'} name="Carto Light">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer checked={activeLayer === 'OpenStreetMap'} name="OpenStreetMap">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer checked={activeLayer === 'Google Mapa Estándar'} name="Google Mapa Estándar">
                    <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer checked={activeLayer === 'Google Satélite'} name="Google Satélite">
                    <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer checked={activeLayer === 'Google Híbrido'} name="Google Híbrido">
                    <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
                  </LayersControl.BaseLayer>
                </LayersControl>

                <ActiveLayerListener setActiveLayer={setActiveLayer} />
                <MapController center={mapCenter} zoom={mapZoom} />
                <MapBoundsListener onBoundsChange={setMapBounds} />

                {userLocation && (
                  <Marker position={userLocation} icon={userIcon}>
                    <Popup><strong>Tu posición actual</strong></Popup>
                  </Marker>
                )}

                {filteredCtos.map(cto => (
                  <Marker 
                    key={cto.id} 
                    position={[cto.latitud, cto.longitud]} 
                    icon={createCtoIcon(cto.estadoAuditoria, cto.tecnicoAsignado)}
                    eventHandlers={{ click: () => handleSelectCto(cto.id) }}
                  />
                ))}

                {isSelectingOnMap && (
                  <MapClickHandler 
                    active={isSelectingOnMap} 
                    onMapClick={(lat, lng) => {
                      setNewCtoData(prev => ({ ...prev, latitud: lat.toFixed(6), longitud: lng.toFixed(6) }));
                      setIsSelectingOnMap(false);
                      showNotification('Coordenadas fijadas desde el mapa');
                    }} 
                  />
                )}
              </MapContainer>

              <button className="map-control-btn" onClick={centerOnUser} style={{ bottom: '24px', right: '12px', left: 'auto', padding: '8px', width: '38px', height: '38px', borderRadius: '50%' }}>
                <Navigation size={18} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>

            {/* Panel Inferior: Clusters Visibles */}
            <div className="mobile-map-panel" style={{ maxHeight: '35vh' }}>
              <div className="mobile-panel-header">
                <div>
                  <div className="mobile-panel-title">
                    <Grid size={16} style={{ color: 'var(--primary)' }} />
                    <span>Clusters ({visibleClusters.length})</span>
                  </div>
                </div>
                {selectedClusterNames.length > 0 && (
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', height: 'auto', borderRadius: '6px' }} onClick={() => setSelectedClusterNames([])}>Limpiar</button>
                )}
              </div>
              <div className="mobile-panel-list" style={{ paddingBottom: '10px' }}>
                {visibleClusters.map(vc => {
                  const isSelected = selectedClusterNames.includes(vc.nombre);
                  const isExpanded = expandedClusters.includes(vc.nombre);
                  const pct = vc.total > 0 ? Math.round((vc.auditadas / vc.total) * 100) : 0;
                  const clusterCtos = filteredCtos.filter(c => c.clusterNombre === vc.nombre);
                  
                  return (
                    <div key={vc.nombre} className="mobile-cluster-card-container">
                      <div className={`mobile-cluster-card ${isSelected ? 'active' : ''}`} onClick={(e) => toggleClusterSelection(vc.nombre, e)}>
                        <div className="mobile-cluster-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div 
                            onClick={(e) => toggleClusterExpansion(vc.nombre, e)}
                            style={{ padding: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                              <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                          </div>
                          <div className="mobile-cluster-info">
                            <div className="mobile-cluster-name">{vc.nombre}</div>
                            <div className="mobile-cluster-meta" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span>{vc.total} CTOs</span>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getTechColor(vc.tecnicoAsignado) }}></div>
                              <span>{vc.tecnicoAsignado}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mobile-cluster-right">
                          <div className="mobile-cluster-progress-container">
                            <div className="mobile-cluster-progress-text">{pct}%</div>
                            <div className="mobile-cluster-progress-bar"><div className="mobile-cluster-progress-fill" style={{ width: `${pct}%` }}></div></div>
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: '8px 12px 8px 36px', background: 'rgba(0,0,0,0.2)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                          {clusterCtos.map(c => (
                            <div 
                              key={c.id} 
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                              onClick={() => handleSelectCto(c.id)}
                            >
                              <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.estadoAuditoria === 'CORRECTO' ? '#10b981' : c.estadoAuditoria === 'FALLO' ? '#ef4444' : '#94a3b8' }}></div>
                                {c.codigo}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {c.estadoAuditoria || 'PENDIENTE'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Vista de Lista */
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '125px 16px 24px 16px',
            background: 'var(--bg-main)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Encontradas: <strong>{filteredCtos.length}</strong> CTOs
              </span>
            </div>
            
            {filteredCtos.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px', 
                color: 'var(--text-muted)',
                background: 'var(--bg-sidebar)',
                borderRadius: '12px',
                border: '1px solid var(--border-light)'
              }}>
                No se encontraron CTOs con los filtros actuales.
              </div>
            ) : (
              filteredCtos.map(cto => {
                let statusColor = '#94a3b8'; // PENDIENTE
                if (cto.estadoAuditoria === 'CORRECTO') statusColor = '#10b981';
                else if (cto.estadoAuditoria === 'FALLO') statusColor = '#ef4444';
                
                return (
                  <div 
                    key={cto.id}
                    onClick={() => handleSelectCto(cto.id)}
                    style={{
                      background: 'var(--bg-sidebar)',
                      border: '1px solid var(--border-light)',
                      borderLeft: `5px solid ${statusColor}`,
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.2s'
                    }}
                    className="cto-list-card"
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {cto.codigo}
                        </span>
                        <span style={{
                          fontSize: '9px',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: `${statusColor}22`,
                          color: statusColor,
                          fontWeight: 'bold',
                          letterSpacing: '0.5px'
                        }}>
                          {cto.estadoAuditoria || 'PENDIENTE'}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span style={{ marginRight: '8px' }}>
                          <strong style={{ color: 'var(--text-muted)' }}>Zona:</strong> {cto.zonaNombre || 'N/A'}
                        </span>
                        <span>
                          <strong style={{ color: 'var(--text-muted)' }}>Cluster:</strong> {cto.clusterNombre || 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Iconos de acción */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      <a 
                        href={`https://cto-tracker.olin.es/cto/${cto.codigo}`} 
                        target="_blank" 
                        rel="noreferrer"
                        title="Abrir en CTO Tracker"
                        style={{ 
                          color: '#10b981', 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '8px', 
                          background: 'rgba(16,185,129,0.08)', 
                          borderRadius: '8px',
                          border: '1px solid rgba(16,185,129,0.1)'
                        }}
                      >
                        <HardDrive size={16} />
                      </a>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${cto.latitud},${cto.longitud}`} 
                        target="_blank" 
                        rel="noreferrer"
                        title="Ver en Google Maps"
                        style={{ 
                          color: '#8b5cf6', 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '8px', 
                          background: 'rgba(139,92,246,0.08)', 
                          borderRadius: '8px',
                          border: '1px solid rgba(139,92,246,0.1)'
                        }}
                      >
                        <MapIcon size={16} />
                      </a>
                      <button
                        onClick={() => handleSelectCto(cto.id)}
                        style={{ 
                          background: 'rgba(255,255,255,0.05)', 
                          border: '1px solid var(--border-light)', 
                          color: 'var(--primary)', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '8px', 
                          borderRadius: '8px' 
                        }}
                        title="Detalles"
                      >
                        <Info size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Detalles Popup (Full Screen Drawer) */}
        {selectedCtoDetails && (
          <div className="info-sidebar" style={{ 
            position: 'fixed', 
            top: 'auto', 
            bottom: 0, 
            right: 0, 
            left: 0, 
            height: 'auto', 
            borderTopLeftRadius: '24px', 
            borderTopRightRadius: '24px', 
            zIndex: 2000, 
            border: 'none', 
            borderTop: '2px solid var(--border-drawer)',
            background: 'var(--bg-drawer)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 -10px 25px rgba(0, 0, 0, 0.15)'
          }}>
            {/* iOS Pill Handle */}
            <div style={{ width: '36px', height: '4px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '2px', margin: '10px auto 0 auto' }}></div>

            <div className="info-header" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-drawer-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '2px' }}>Detalles de CTO</span>
                <div className="info-title" style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{selectedCtoDetails.codigo}</span>
                  {selectedCtoDetails.estado && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: 'rgba(139, 92, 246, 0.12)',
                      color: 'var(--primary)',
                      fontWeight: '600',
                      border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}>
                      {selectedCtoDetails.estado}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <a 
                  href={`/#/cto/${selectedCtoDetails.id}`} 
                  target="_blank" 
                  rel="noreferrer"
                  title="Ficha técnica"
                  style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', padding: '6px', background: 'rgba(139,92,246,0.08)', borderRadius: '8px' }}
                >
                  <Info size={18} />
                </a>
                <a 
                  href={`https://cto-tracker.olin.es/cto/${selectedCtoDetails.codigo}`} 
                  target="_blank" 
                  rel="noreferrer"
                  title="Abrir en CTO Tracker"
                  style={{ color: '#10b981', display: 'flex', alignItems: 'center', padding: '6px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px' }}
                >
                  <HardDrive size={18} />
                </a>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedCtoDetails.latitud},${selectedCtoDetails.longitud}`} 
                  target="_blank" 
                  rel="noreferrer"
                  title="Ver en Google Maps"
                  style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', padding: '6px', background: 'rgba(59,130,246,0.08)', borderRadius: '8px' }}
                >
                  <MapIcon size={18} />
                </a>
                <button 
                  onClick={() => setSelectedCtoDetails(null)} 
                  style={{ background: 'var(--bg-drawer-card)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '8px', marginLeft: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="info-content" style={{ padding: '16px 20px 20px 20px' }}>
              
              {/* Grid de Zona, Cluster y Técnico */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--bg-drawer-card)', border: '1px solid var(--border-drawer-card)', padding: '8px 10px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Zona</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '500', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedCtoDetails.zonaNombre || 'Sin Zona'}
                  </span>
                </div>
                <div style={{ background: 'var(--bg-drawer-card)', border: '1px solid var(--border-drawer-card)', padding: '8px 10px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Cluster</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '500', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedCtoDetails.clusterNombre || 'Sin Cluster'}
                  </span>
                </div>
                <div style={{ background: 'var(--bg-drawer-card)', border: '1px solid var(--border-drawer-card)', padding: '8px 10px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Técnico</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: getTechColor(selectedCtoDetails.tecnicoAsignado) }}></span>
                    {selectedCtoDetails.tecnicoAsignado || 'Sin Asignar'}
                  </span>
                </div>
              </div>

              {/* Caja de Estado y Coordenadas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--bg-drawer-card)', border: '1px solid var(--border-drawer-card)', padding: '12px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Estado Auditoría</span>
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: '700', 
                      color: selectedCtoDetails.estadoAuditoria === 'CORRECTO' ? '#10b981' : selectedCtoDetails.estadoAuditoria === 'FALLO' ? '#ef4444' : 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {selectedCtoDetails.estadoAuditoria || 'PENDIENTE'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Coordenadas GPS</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-main)', fontFamily: 'monospace' }}>
                      {selectedCtoDetails.latitud?.toFixed(5)}, {selectedCtoDetails.longitud?.toFixed(5)}
                    </span>
                  </div>
                </div>

                {/* Edición de Ubicación */}
                {isEditingLocation ? (
                  <div style={{ background: 'var(--bg-drawer-card)', border: '1px solid var(--border-drawer-card)', padding: '12px', borderRadius: '12px', display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Modificar Coordenadas:</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" step="any" className="form-input" style={{ flex: 1, padding: '8px', fontSize: '16px' }} placeholder="Latitud" value={editLat} onChange={e => setEditLat(e.target.value)} />
                      <input type="number" step="any" className="form-input" style={{ flex: 1, padding: '8px', fontSize: '16px' }} placeholder="Longitud" value={editLng} onChange={e => setEditLng(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={() => {
                        if (userLocation) {
                          setEditLat(userLocation[0]);
                          setEditLng(userLocation[1]);
                        } else {
                          showNotification('Ubicación no disponible', 'error');
                        }
                      }}>
                        Usar GPS Móvil
                      </button>
                      <button type="button" className="btn btn-success" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={handleUpdateLocation} disabled={loading}>
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '8px' }}
                    onClick={() => setIsEditingLocation(true)}
                  >
                    <Navigation size={14} />
                    <span>Editar Ubicación de CTO</span>
                  </button>
                )}
              </div>

              {/* Sección de Notas / Comentarios */}
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Notas / Comentarios:</label>
                <textarea 
                  className="form-input"
                  style={{ height: '70px', resize: 'none', fontSize: '16px', width: '100%', paddingRight: '42px', paddingLeft: '12px', paddingTop: '8px', borderRadius: '10px' }}
                  value={editComentarios}
                  onChange={(e) => setEditComentarios(e.target.value)}
                  placeholder="Añade notas del estado de la CTO..."
                />
                <button 
                  onClick={handleSaveComment}
                  disabled={loading || editComentarios === (selectedCtoDetails.comentarios || '')}
                  style={{ 
                    position: 'absolute', right: '10px', bottom: '10px', 
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', 
                    color: editComentarios !== (selectedCtoDetails.comentarios || '') ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: editComentarios !== (selectedCtoDetails.comentarios || '') ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%'
                  }}
                  title="Guardar notas"
                >
                  <Save size={16} />
                </button>
              </div>

              {/* Botones de Acción de Auditoría */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '8px' }}>
                <button 
                  className="btn"
                  style={{ 
                    background: selectedCtoDetails.estadoAuditoria === 'PENDIENTE' ? '#475569' : 'rgba(255,255,255,0.04)', 
                    border: selectedCtoDetails.estadoAuditoria === 'PENDIENTE' ? '1px solid #64748b' : '1px solid rgba(255,255,255,0.08)',
                    color: '#fff',
                    padding: '10px 0',
                    fontSize: '13px',
                    fontWeight: '600',
                    borderRadius: '10px'
                  }}
                  onClick={() => handleUpdateStatus(selectedCtoDetails.id, 'PENDIENTE')}
                  disabled={loading}
                >
                  Pendiente
                </button>
                <button 
                  className="btn"
                  style={{ 
                    background: selectedCtoDetails.estadoAuditoria === 'FALLO' ? '#ef4444' : 'rgba(255,255,255,0.04)', 
                    border: selectedCtoDetails.estadoAuditoria === 'FALLO' ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.08)',
                    color: '#fff',
                    padding: '10px 0',
                    fontSize: '13px',
                    fontWeight: '600',
                    borderRadius: '10px'
                  }}
                  onClick={() => handleUpdateStatus(selectedCtoDetails.id, 'FALLO')}
                  disabled={loading}
                >
                  Fallo
                </button>
                <button 
                  className="btn"
                  style={{ 
                    background: selectedCtoDetails.estadoAuditoria === 'CORRECTO' ? '#10b981' : 'rgba(255,255,255,0.04)', 
                    border: selectedCtoDetails.estadoAuditoria === 'CORRECTO' ? '1px solid #34d399' : '1px solid rgba(255,255,255,0.08)',
                    color: '#fff',
                    padding: '10px 0',
                    fontSize: '13px',
                    fontWeight: '600',
                    borderRadius: '10px'
                  }}
                  onClick={() => handleUpdateStatus(selectedCtoDetails.id, 'CORRECTO')}
                  disabled={loading}
                >
                  Correcto
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Drawer: Añadir CTO Manual */}
        {showAddForm && (
          <div className="info-sidebar" style={{ position: 'fixed', top: 'auto', bottom: 0, right: 0, left: 0, height: 'auto', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', zIndex: 2000, border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="info-header" style={{ padding: '16px 20px' }}>
              <div className="info-title">Añadir CTO Manual</div>
              <X size={24} className="text-muted" onClick={() => { setShowAddForm(false); setIsSelectingOnMap(false); }} style={{ cursor: 'pointer' }} />
            </div>
            
            <form onSubmit={handleCreateCTO} className="info-content" style={{ padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Número CTO *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: CTO-12345" 
                  required 
                  value={newCtoData.codigo} 
                  onChange={e => setNewCtoData({...newCtoData, codigo: e.target.value})}
                  style={{ width: '100%', fontSize: '16px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Latitud *</label>
                  <input 
                    type="number" 
                    step="any" 
                    className="form-input" 
                    placeholder="Ej: 40.4167" 
                    required 
                    value={newCtoData.latitud} 
                    onChange={e => setNewCtoData({...newCtoData, latitud: e.target.value})}
                    style={{ width: '100%', fontSize: '16px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Longitud *</label>
                  <input 
                    type="number" 
                    step="any" 
                    className="form-input" 
                    placeholder="Ej: -3.7037" 
                    required 
                    value={newCtoData.longitud} 
                    onChange={e => setNewCtoData({...newCtoData, longitud: e.target.value})}
                    style={{ width: '100%', fontSize: '16px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  style={{ padding: '8px', fontSize: '12px', width: '100%' }}
                  onClick={() => {
                    if (userLocation) {
                      setNewCtoData({
                        ...newCtoData,
                        latitud: userLocation[0].toFixed(6),
                        longitud: userLocation[1].toFixed(6)
                      });
                      showNotification('Coordenadas GPS fijadas');
                    } else {
                      showNotification('Ubicación GPS no disponible', 'error');
                    }
                  }}
                >
                  Usar mi ubicación
                </button>
                <button 
                  type="button"
                  className={`btn ${isSelectingOnMap ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px', fontSize: '12px', width: '100%' }}
                  onClick={() => {
                    setIsSelectingOnMap(true);
                    setViewMode('mapa');
                    showNotification('Toca cualquier parte del mapa para marcar las coordenadas');
                  }}
                >
                  {isSelectingOnMap ? 'Toca el mapa...' : 'Marcar en mapa'}
                </button>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Estado Inicial</label>
                <select 
                  className="form-input" 
                  value={newCtoData.estado} 
                  onChange={e => setNewCtoData({...newCtoData, estado: e.target.value})}
                  style={{ width: '100%', fontSize: '16px' }}
                >
                  <option value="">Seleccionar Estado</option>
                  {estados.map(est => (
                    <option key={est.id} value={est.nombre}>{est.nombre}</option>
                  ))}
                  {estados.length === 0 && (
                    <>
                      <option value="PENDIENTE">PENDIENTE</option>
                      <option value="CORRECTO">CORRECTO</option>
                      <option value="FALLO">FALLO</option>
                    </>
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setShowAddForm(false); setIsSelectingOnMap(false); }}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-success" 
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Crear CTO'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
