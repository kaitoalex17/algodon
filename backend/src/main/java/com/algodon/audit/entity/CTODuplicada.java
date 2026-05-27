package com.algodon.audit.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "ctos_duplicadas")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CTODuplicada {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo", nullable = false)
    private String codigo;

    private String cluster;
    private String zona;
    private Double latitud;
    private Double longitud;
    private String municipio;
    private String provincia;
    private String estado;
}
