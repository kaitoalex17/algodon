const getBaseUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;

  // Si estamos en desarrollo local
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:18080';
  }

  // Si accedemos a través del proxy inverso en el puerto por defecto (80 o 443) sin especificar puerto
  if (!port || port === '80' || port === '443') {
    return `${protocol}//${hostname}`;
  }

  // Si accedemos por IP local con el puerto del frontend (ej: 18081)
  return `${protocol}//${hostname}:18080`;
};

const BASE_URL = getBaseUrl();

export const api = {
  getBaseUrl,
  // Importación
  importExcel: async (file, mapping) => {
    const formData = new FormData();
    formData.append('file', file);
    if (mapping) {
      formData.append('mapping', JSON.stringify(mapping));
    }

    const response = await fetch(`${BASE_URL}/api/import`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Error al importar el archivo Excel');
    }
    return response.json();
  },

  getExcelHeaders: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/api/import/headers`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Error al extraer las cabeceras');
    }
    return response.json();
  },

  // CTOs
  getCTOs: async () => {
    const response = await fetch(`${BASE_URL}/api/ctos`);
    if (!response.ok) throw new Error('Error al obtener el listado de CTOs');
    return response.json();
  },

  getCTODetail: async (id) => {
    const response = await fetch(`${BASE_URL}/api/ctos/${id}`);
    if (!response.ok) throw new Error('Error al obtener el detalle de la CTO');
    return response.json();
  },

  updateCTOAudit: async (id, auditada, comentarios, estadoAuditoria) => {
    const body = { auditada, comentarios };
    if (estadoAuditoria) {
      body.estadoAuditoria = estadoAuditoria;
    }
    const response = await fetch(`${BASE_URL}/api/ctos/${id}/audit`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Error al actualizar la auditoría');
    return true;
  },

  updateCTOLocation: async (id, latitud, longitud) => {
    const response = await fetch(`${BASE_URL}/api/ctos/${id}/location`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ latitud, longitud }),
    });
    if (!response.ok) throw new Error('Error al actualizar la ubicación');
    return true;
  },

  deleteCTO: async (id) => {
    const response = await fetch(`${BASE_URL}/api/ctos/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Error al eliminar la CTO');
    return true;
  },

  createCTO: async (data) => {
    const response = await fetch(`${BASE_URL}/api/ctos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const txt = await response.text();
      throw new Error(txt || 'Error al crear la CTO');
    }
    return await response.json();
  },

  // Estados CTO
  getEstados: async () => {
    const response = await fetch(`${BASE_URL}/api/estados-cto`);
    if (!response.ok) throw new Error('Error al obtener estados');
    return await response.json();
  },

  createEstado: async (nombre, color) => {
    const response = await fetch(`${BASE_URL}/api/estados-cto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, color })
    });
    if (!response.ok) throw new Error('Error al crear estado');
    return await response.json();
  },

  deleteEstado: async (id) => {
    const response = await fetch(`${BASE_URL}/api/estados-cto/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Error al eliminar estado');
    return true;
  },

  // Duplicadas
  getDuplicadas: async () => {
    const response = await fetch(`${BASE_URL}/api/import/duplicadas`);
    if (!response.ok) throw new Error('Error al obtener duplicadas');
    return await response.json();
  },

  deleteDuplicada: async (id) => {
    const response = await fetch(`${BASE_URL}/api/import/duplicadas/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Error al eliminar duplicada');
    return true;
  },

  deleteAllDuplicadas: async () => {
    const response = await fetch(`${BASE_URL}/api/import/duplicadas`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Error al eliminar duplicadas');
    return true;
  },

  purgeDatabase: async () => {
    const response = await fetch(`${BASE_URL}/api/system/purge`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Error al purgar la base de datos');
    return true;
  },

  // Zonas
  getZonas: async () => {
    const response = await fetch(`${BASE_URL}/api/zonas`);
    if (!response.ok) throw new Error('Error al obtener las zonas');
    return response.json();
  },

  // Usuarios (Técnicos)
  getUsuarios: async () => {
    const response = await fetch(`${BASE_URL}/api/usuarios`);
    if (!response.ok) throw new Error('Error al obtener los usuarios');
    return response.json();
  },

  createUsuario: async (username, nombre, email) => {
    const response = await fetch(`${BASE_URL}/api/usuarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, nombre, email }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Error al crear el usuario');
    }
    return response.json();
  },

  // Asignaciones
  distributeClusters: async (zonaId, tecnicoIds) => {
    const response = await fetch(`${BASE_URL}/api/assignment/distribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ zonaId, tecnicoIds }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Error al distribuir los clusters');
    }
    return response.json();
  },

  assignClusters: async (clusterIds, tecnicoId) => {
    const response = await fetch(`${BASE_URL}/api/assignment/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clusterIds, tecnicoId }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Error al asignar los clusters');
    }
    return response.json();
  }
};
