import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Users, Grid, CheckCircle, Send, Loader2, Check, AlertTriangle, Database } from 'lucide-react';
import { api } from './api';

function AdminApp() {
  const [activeTab, setActiveTab] = useState('import');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  // Data states
  const [zonas, setZonas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [selectedZonaId, setSelectedZonaId] = useState('');
  const [selectedTecnicoIds, setSelectedTecnicoIds] = useState([]);

  // Import states
  const [importStep, setImportStep] = useState(1);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});

  // Technicians states
  const [newUsername, setNewUsername] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');

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

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const loadData = async () => {
    try {
      const zonasData = await api.getZonas();
      setZonas(zonasData);

      const usuariosData = await api.getUsuarios();
      setUsuarios(usuariosData);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Import logic
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const headers = await api.getExcelHeaders(file);
      setExcelHeaders(headers);
      setSelectedFile(file);
      
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
      loadData();
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Technicians logic
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
      loadData();
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Distribution logic
  const toggleTecnicoSelection = (id) => {
    setSelectedTecnicoIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

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
      loadData();
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Purge logic
  const handlePurge = async () => {
    if (window.confirm("¿ESTÁS COMPLETAMENTE SEGURO? Esto eliminará TODAS las cajas (CTOs), Zonas y Clusters de la base de datos. Los técnicos se mantendrán. Esta acción NO se puede deshacer.")) {
      try {
        setLoading(true);
        await api.purgeDatabase();
        showNotification('Base de datos purgada con éxito. Lista para nueva importación.');
        loadData();
      } catch (error) {
        showNotification(error.message, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="app-container" style={{ display: 'block', height: 'auto', minHeight: '100vh', overflowY: 'auto' }}>
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <header style={{ padding: '20px', background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="logo-badge" style={{ margin: 0 }}>
          Algodón<span>AuditAdmin</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={`btn ${activeTab === 'import' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('import')}>
            <UploadCloud size={16} style={{marginRight: '6px'}} /> Importar Excel
          </button>
          <button className={`btn ${activeTab === 'assignments' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('assignments')}>
            <Grid size={16} style={{marginRight: '6px'}} /> Reparto
          </button>
          <button className={`btn ${activeTab === 'technicians' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('technicians')}>
            <Users size={16} style={{marginRight: '6px'}} /> Técnicos
          </button>
          <button className={`btn ${activeTab === 'system' ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setActiveTab('system')}>
            <Database size={16} style={{marginRight: '6px'}} /> Sistema
          </button>
        </div>
      </header>

      <main style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
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
                <label className="form-label">2. Elige a los Técnicos</label>
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

        {activeTab === 'technicians' && (
          <div className="panel-container">
            <div className="panel-header">
              <h2>Gestión de Técnicos de Campo</h2>
              <p>Crea o visualiza los técnicos que realizarán las auditorías en campo.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
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

        {activeTab === 'system' && (
          <div className="panel-container">
            <div className="panel-header">
              <h2>Sistema y Mantenimiento</h2>
              <p>Opciones avanzadas y purga de base de datos.</p>
            </div>
            
            <div className="card" style={{ border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.02)' }}>
              <h3 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle /> Zona de Peligro
              </h3>
              <p style={{ marginTop: '10px', fontSize: '14px', color: 'var(--text-muted)' }}>
                Si deseas limpiar el mapa y realizar una importación desde cero, utiliza el siguiente botón. 
                Se eliminarán permanentemente todas las CTOs, Clusters y Zonas. Los usuarios (Técnicos) permanecerán en el sistema.
              </p>
              
              <button 
                className="btn btn-danger" 
                style={{ marginTop: '20px' }}
                onClick={handlePurge}
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Borrar Todos Los Datos (CTOs y Clusters)'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminApp;
