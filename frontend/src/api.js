const getBaseUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Si estamos en desarrollo local
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:18080';
  }

  // En producción, asumimos que el backend está corriendo en el puerto 18080 del mismo host
  // o que se accede mediante el subdominio con puerto expuesto.
  return `${protocol}//${hostname}:18080`;
};

const BASE_URL = getBaseUrl();

export const api = {
  // Importación
  importExcel: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

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

  updateCTOAudit: async (id, auditada, comentarios) => {
    const response = await fetch(`${BASE_URL}/api/ctos/${id}/audit`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ auditada, comentarios }),
    });
    if (!response.ok) throw new Error('Error al actualizar la auditoría');
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
  }
};
