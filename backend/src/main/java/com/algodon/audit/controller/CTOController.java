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

    @PutMapping("/{id}/location")
    public ResponseEntity<?> updateLocation(@PathVariable Long id, @RequestBody com.algodon.audit.dto.LocationRequest request) {
        return ctoRepository.findById(id)
                .map(cto -> {
                    if (request.getLatitud() != null && request.getLongitud() != null) {
                        cto.setLatitud(request.getLatitud());
                        cto.setLongitud(request.getLongitud());
                        org.locationtech.jts.geom.GeometryFactory geometryFactory = new org.locationtech.jts.geom.GeometryFactory(new org.locationtech.jts.geom.PrecisionModel(), 4326);
                        cto.setGeom(geometryFactory.createPoint(new org.locationtech.jts.geom.Coordinate(request.getLongitud(), request.getLatitud())));
                        ctoRepository.save(cto);
                        return ResponseEntity.ok().build();
                    }
                    return ResponseEntity.badRequest().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCTOs() {
        List<CTO> ctos = ctoRepository.findAll();

        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("CTOs");

            // Header
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            String[] columns = {"ID", "Código", "Latitud", "Longitud", "Zona", "Cluster", "Estado Auditoría", "Auditada", "Comentarios", "Técnico Asignado"};
            for (int i = 0; i < columns.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
            }

            // Data
            int rowIdx = 1;
            for (CTO cto : ctos) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(cto.getId() != null ? cto.getId().toString() : "");
                row.createCell(1).setCellValue(cto.getCodigo() != null ? cto.getCodigo() : "");
                if (cto.getLatitud() != null) row.createCell(2).setCellValue(cto.getLatitud());
                if (cto.getLongitud() != null) row.createCell(3).setCellValue(cto.getLongitud());
                if (cto.getZona() != null) row.createCell(4).setCellValue(cto.getZona().getNombre());
                if (cto.getCluster() != null) row.createCell(5).setCellValue(cto.getCluster().getNombre());
                if (cto.getEstadoAuditoria() != null) row.createCell(6).setCellValue(cto.getEstadoAuditoria());
                row.createCell(7).setCellValue(cto.isAuditada() ? "Sí" : "No");
                if (cto.getComentarios() != null) row.createCell(8).setCellValue(cto.getComentarios());
                if (cto.getTecnicoAsignado() != null) row.createCell(9).setCellValue(cto.getTecnicoAsignado().getNombre());
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=ctos_export.xlsx");

            return org.springframework.http.ResponseEntity
                    .ok()
                    .headers(headers)
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(out.toByteArray());
        } catch (java.io.IOException e) {
            return org.springframework.http.ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCTO(@PathVariable Long id) {
        return ctoRepository.findById(id)
                .map(cto -> {
                    ctoRepository.delete(cto);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createCTO(@RequestBody CTO ctoRequest) {
        if (ctoRequest.getCodigo() == null || ctoRequest.getCodigo().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("El código es obligatorio");
        }
        if (ctoRepository.findByCodigo(ctoRequest.getCodigo()).isPresent()) {
            return ResponseEntity.badRequest().body("El código ya existe");
        }
        
        ctoRequest.setOrigen("MANUAL");

        if (ctoRequest.getLatitud() != null && ctoRequest.getLongitud() != null) {
            org.locationtech.jts.geom.GeometryFactory geometryFactory = new org.locationtech.jts.geom.GeometryFactory(new org.locationtech.jts.geom.PrecisionModel(), 4326);
            ctoRequest.setGeom(geometryFactory.createPoint(new org.locationtech.jts.geom.Coordinate(ctoRequest.getLongitud(), ctoRequest.getLatitud())));
        }

        return ResponseEntity.ok(ctoRepository.save(ctoRequest));
    }
}
