import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from './api';
import { ArrowLeft, Map as MapIcon, ExternalLink, HardDrive } from 'lucide-react';

export default function CtoDetail() {
  const { id } = useParams();
  const [cto, setCto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await api.getCTODetail(id);
        setCto(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--text-main)' }}>Cargando detalles...</div>;
  }

  if (error || !cto) {
    return (
      <div style={{ padding: '20px', color: 'var(--danger)' }}>
        <p>Error: {error || 'CTO no encontrada'}</p>
        <Link to="/" style={{ color: 'var(--primary)' }}>Volver al mapa</Link>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ padding: '20px', overflowY: 'auto', minHeight: '100vh', display: 'block' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Link to="/" className="btn btn-secondary" style={{ padding: '8px' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 style={{ fontSize: '24px', margin: 0 }}>Detalle de CTO: {cto.codigo}</h1>
      </header>

      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="card">
          <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--primary)' }}>Información General</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Código:</span><br/><strong>{cto.codigo || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Zona:</span><br/><strong>{cto.zonaNombre || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Cluster:</span><br/><strong>{cto.clusterNombre || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Técnico:</span><br/><strong>{cto.tecnicoAsignado || 'Sin asignar'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Estado Base:</span><br/><strong>{cto.estado || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>UserSinc:</span><br/><strong>{cto.usersinc || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>OLT:</span><br/><strong>{cto.olt || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Empresa:</span><br/><strong>{cto.empresa || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Municipio:</span><br/><strong>{cto.municipio || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Provincia:</span><br/><strong>{cto.provincia || '-'}</strong></div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--success)' }}>Auditoría y Despliegue</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Estado Auditoría:</span><br/>
              <strong style={{
                color: cto.estadoAuditoria === 'CORRECTO' ? '#10b981' : cto.estadoAuditoria === 'FALLO' ? '#ef4444' : '#94a3b8'
              }}>
                {cto.estadoAuditoria || 'PENDIENTE'}
              </strong>
            </div>
            <div><span style={{ color: 'var(--text-muted)' }}>Tipo Despliegue:</span><br/><strong>{cto.tipoDespliegueInput || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>UUII:</span><br/><strong>{cto.uuii || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Stream:</span><br/><strong>{cto.stream || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>EC:</span><br/><strong>{cto.ec || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Entregada:</span><br/><strong>{cto.entregada ? 'Sí' : 'No'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Aceptada:</span><br/><strong>{cto.aceptada ? 'Sí' : 'No'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Mutualizada:</span><br/><strong>{cto.mutualizada ? 'Sí' : 'No'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Sincronizada:</span><br/><strong>{cto.sincronizada ? 'Sí' : 'No'}</strong></div>
          </div>
          
          <div style={{ marginTop: '16px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Comentarios:</span>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginTop: '4px', minHeight: '60px' }}>
              {cto.comentarios || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin comentarios</span>}
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#8b5cf6' }}>Acciones Externas</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${cto.latitud},${cto.longitud}`} 
              target="_blank" 
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px' }}
            >
              <MapIcon size={20} style={{ marginRight: '10px' }} />
              Ver en Google Maps
            </a>
            
            <a 
              href={`https://cto-tracker.olin.es/${cto.codigo}`} 
              target="_blank" 
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px' }}
            >
              <HardDrive size={20} style={{ marginRight: '10px', color: '#10b981' }} />
              Abrir en CTO Tracker (Olin)
              <ExternalLink size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
