package com.algodon.audit.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.locationtech.jts.geom.Point;

@Entity
@Table(name = "ctos", indexes = {
    @Index(name = "idx_cto_codigo", columnList = "codigo", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CTO {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo", nullable = false, unique = true)
    private String codigo; // código

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cluster_id", nullable = false)
    private Cluster cluster;

    @Column(name = "usersinc")
    private String usersinc;

    @Column(name = "olt")
    private String olt;

    @Column(name = "entidad")
    private String entidad;

    @Column(name = "municipio")
    private String municipio;

    @Column(name = "provincia")
    private String provincia;

    @Column(name = "empresa")
    private String empresa;

    @Column(name = "estado")
    private String estado;

    @Column(name = "latitud")
    private Double latitud;

    @Column(name = "longitud")
    private Double longitud;

    // PostGIS Point geometry (using SRID 4326 for WGS84)
    @Column(columnDefinition = "geometry(Point, 4326)")
    private Point geom;

    @Column(name = "sincronizada")
    private Boolean sincronizada;

    @Column(name = "entregada")
    private Boolean entregada;

    @Column(name = "aceptada")
    private Boolean aceptada;

    @Column(name = "mutualizada")
    private Boolean mutualizada;

    @Column(name = "uuii")
    private Integer uuii;

    @Column(name = "tipo_despliegue_input")
    private String tipoDespliegueInput;

    @Column(name = "stream")
    private String stream;

    @Column(name = "ec")
    private String ec;

    @Column(name = "auditada", nullable = false)
    private Boolean auditada = false;

    @Column(name = "comentarios", columnDefinition = "TEXT")
    private String comentarios;
}
