package com.algodon.audit.controller;

import com.algodon.audit.dto.AuditRequest;
import com.algodon.audit.dto.CTODetailDTO;
import com.algodon.audit.dto.CTOMapDTO;
import com.algodon.audit.entity.CTO;
import com.algodon.audit.repository.CTORepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ctos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CTOController {

    private final CTORepository ctoRepository;

    @GetMapping
    public ResponseEntity<List<CTOMapDTO>> getAllCTOs() {
        List<CTOMapDTO> dtos = ctoRepository.findAllWithClusters().stream()
                .filter(cto -> cto.getLatitud() != null && cto.getLongitud() != null)
                .map(cto -> {
                    Long clusterId = null;
                    String clusterNombre = null;
                    String tecnicoAsignado = null;
                    String zonaNombre = null;
                    if (cto.getCluster() != null) {
                        clusterId = cto.getCluster().getId();
                        clusterNombre = cto.getCluster().getNombre();
                        if (cto.getCluster().getTecnicoAsignado() != null) {
                            tecnicoAsignado = cto.getCluster().getTecnicoAsignado().getNombre();
                        }
                        if (cto.getCluster().getZona() != null) {
                            zonaNombre = cto.getCluster().getZona().getNombre();
                        }
                    }
                    return new CTOMapDTO(
                            cto.getId(),
                            cto.getCodigo(),
                            cto.getLatitud(),
                            cto.getLongitud(),
                            cto.getEstado(),
                            cto.getEstadoAuditoria(),
                            cto.getAuditada(),
                            clusterId,
                            clusterNombre,
                            tecnicoAsignado,
                            zonaNombre
                    );
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CTODetailDTO> getCTODetails(@PathVariable Long id) {
        return ctoRepository.findByIdWithClusters(id)
                .map(cto -> {
                    CTODetailDTO dto = new CTODetailDTO();
                    dto.setId(cto.getId());
                    dto.setCodigo(cto.getCodigo());
                    if (cto.getCluster() != null) {
                        dto.setClusterNombre(cto.getCluster().getNombre());
                        if (cto.getCluster().getZona() != null) {
                            dto.setZonaNombre(cto.getCluster().getZona().getNombre());
                        }
                        if (cto.getCluster().getTecnicoAsignado() != null) {
                            dto.setTecnicoAsignado(cto.getCluster().getTecnicoAsignado().getNombre());
                        }
                    }
                    dto.setUsersinc(cto.getUsersinc());
                    dto.setOlt(cto.getOlt());
                    dto.setEntidad(cto.getEntidad());
                    dto.setMunicipio(cto.getMunicipio());
                    dto.setProvincia(cto.getProvincia());
                    dto.setEmpresa(cto.getEmpresa());
                    dto.setEstado(cto.getEstado());
                    dto.setLatitud(cto.getLatitud());
                    dto.setLongitud(cto.getLongitud());
                    dto.setSincronizada(cto.getSincronizada());
                    dto.setEntregada(cto.getEntregada());
                    dto.setAceptada(cto.getAceptada());
                    dto.setMutualizada(cto.getMutualizada());
                    dto.setUuii(cto.getUuii());
                    dto.setTipoDespliegueInput(cto.getTipoDespliegueInput());
                    dto.setStream(cto.getStream());
                    dto.setEc(cto.getEc());
                    dto.setEstadoAuditoria(cto.getEstadoAuditoria());
                    dto.setAuditada(cto.getAuditada());
                    dto.setComentarios(cto.getComentarios());
                    return ResponseEntity.ok(dto);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/audit")
    public ResponseEntity<?> updateAudit(@PathVariable Long id, @RequestBody AuditRequest request) {
        return ctoRepository.findById(id)
                .map(cto -> {
                    if (request.getAuditada() != null) {
                        cto.setAuditada(request.getAuditada());
                    }
                    if (request.getEstadoAuditoria() != null) {
                        cto.setEstadoAuditoria(request.getEstadoAuditoria());
                    }
                    if (request.getComentarios() != null) {
                        cto.setComentarios(request.getComentarios());
                    }
                    ctoRepository.save(cto);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
