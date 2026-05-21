package com.algodon.audit.dto;

import lombok.Data;

@Data
public class CTODetailDTO {
    private Long id;
    private String codigo;
    private String clusterNombre;
    private String zonaNombre;
    private String usersinc;
    private String olt;
    private String entidad;
    private String municipio;
    private String provincia;
    private String empresa;
    private String estado;
    private Double latitud;
    private Double longitud;
    private Boolean sincronizada;
    private Boolean entregada;
    private Boolean aceptada;
    private Boolean mutualizada;
    private Integer uuii;
    private String tipoDespliegueInput;
    private String stream;
    private String ec;
    private String estadoAuditoria;
    private Boolean auditada;
    private String comentarios;
    private String tecnicoAsignado;
}
