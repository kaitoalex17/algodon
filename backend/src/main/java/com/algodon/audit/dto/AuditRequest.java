package com.algodon.audit.dto;

import lombok.Data;

@Data
public class AuditRequest {
    private String estadoAuditoria;
    private Boolean auditada;
    private String comentarios;
}
