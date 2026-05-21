package com.algodon.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CTOMapDTO {
    private Long id;
    private String codigo;
    private Double latitud;
    private Double longitud;
    private String estado;
    private Boolean auditada;
    private Long clusterId;
    private String clusterNombre;
    private String tecnicoAsignado;
}
