package com.algodon.audit.service;

import com.algodon.audit.entity.CTO;
import com.algodon.audit.entity.Cluster;
import com.algodon.audit.entity.Zona;
import com.algodon.audit.repository.CTORepository;
import com.algodon.audit.repository.ClusterRepository;
import com.algodon.audit.repository.ZonaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImportService {

    private final ZonaRepository zonaRepository;
    private final ClusterRepository clusterRepository;
    private final CTORepository ctoRepository;
    
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @Transactional
    public Map<String, Object> importExcel(MultipartFile file) throws Exception {
        int importedCount = 0;
        int updatedCount = 0;

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            if (!rows.hasNext()) {
                throw new IllegalArgumentException("El archivo Excel está vacío");
            }

            Row headerRow = rows.next();
            Map<String, Integer> headerMap = getHeaderMap(headerRow);

            // Validate mandatory headers
            validateHeaders(headerMap);

            // Cache zones and clusters to avoid constant DB round-trips
            Map<String, Zona> zonaCache = new HashMap<>();
            Map<String, Map<String, Cluster>> clusterCache = new HashMap<>(); // ZonaName -> (ClusterName -> Cluster)

            while (rows.hasNext()) {
                Row currentRow = rows.next();
                if (isRowEmpty(currentRow)) {
                    continue;
                }

                String zonaNombre = getCellValueAsString(currentRow.getCell(headerMap.get("zona")));
                String clusterNombre = getCellValueAsString(currentRow.getCell(headerMap.get("cluster")));
                String codigo = getCellValueAsString(currentRow.getCell(headerMap.get("código")));

                if (zonaNombre == null || clusterNombre == null || codigo == null) {
                    log.warn("Fila {} saltada: zona, cluster o código están vacíos", currentRow.getRowNum());
                    continue;
                }

                // Get or create Zona
                Zona zona = zonaCache.computeIfAbsent(zonaNombre.toUpperCase(), name -> {
                    return zonaRepository.findByNombre(zonaNombre)
                            .orElseGet(() -> {
                                Zona z = new Zona();
                                z.setNombre(zonaNombre);
                                return zonaRepository.save(z);
                            });
                });

                // Get or create Cluster
                Map<String, Cluster> clustersInZona = clusterCache.computeIfAbsent(zona.getNombre().toUpperCase(), k -> new HashMap<>());
                Cluster cluster = clustersInZona.computeIfAbsent(clusterNombre.toUpperCase(), name -> {
                    return clusterRepository.findByNombreAndZona(clusterNombre, zona)
                            .orElseGet(() -> {
                                Cluster c = new Cluster();
                                c.setNombre(clusterNombre);
                                c.setZona(zona);
                                return clusterRepository.save(c);
                            });
                });

                // Get or create CTO
                Optional<CTO> existingCto = ctoRepository.findByCodigo(codigo);
                CTO cto = existingCto.orElseGet(CTO::new);
                if (existingCto.isPresent()) {
                    updatedCount++;
                } else {
                    importedCount++;
                }

                cto.setCodigo(codigo);
                cto.setCluster(cluster);
                cto.setUsersinc(getCellValueAsString(currentRow.getCell(headerMap.get("usersinc"))));
                cto.setOlt(getCellValueAsString(currentRow.getCell(headerMap.get("olt"))));
                cto.setEntidad(getCellValueAsString(currentRow.getCell(headerMap.get("entidad"))));
                cto.setMunicipio(getCellValueAsString(currentRow.getCell(headerMap.get("municipio"))));
                cto.setProvincia(getCellValueAsString(currentRow.getCell(headerMap.get("provincia"))));
                cto.setEmpresa(getCellValueAsString(currentRow.getCell(headerMap.get("empresa"))));
                cto.setEstado(getCellValueAsString(currentRow.getCell(headerMap.get("estado"))));

                Double latitud = getCellValueAsDouble(currentRow.getCell(headerMap.get("latitud")));
                Double longitud = getCellValueAsDouble(currentRow.getCell(headerMap.get("longitud")));
                cto.setLatitud(latitud);
                cto.setLongitud(longitud);

                if (latitud != null && longitud != null) {
                    Point geom = geometryFactory.createPoint(new Coordinate(longitud, latitud));
                    cto.setGeom(geom);
                } else {
                    cto.setGeom(null);
                }

                cto.setSincronizada(getCellValueAsBoolean(currentRow.getCell(headerMap.get("sincronizada"))));
                cto.setEntregada(getCellValueAsBoolean(currentRow.getCell(headerMap.get("entregada"))));
                cto.setAceptada(getCellValueAsBoolean(currentRow.getCell(headerMap.get("aceptada"))));
                cto.setMutualizada(getCellValueAsBoolean(currentRow.getCell(headerMap.get("mutualizada"))));
                cto.setUuii(getCellValueAsInteger(currentRow.getCell(headerMap.get("uuii"))));
                cto.setTipoDespliegueInput(getCellValueAsString(currentRow.getCell(headerMap.get("tipo_despliegue_input"))));
                cto.setStream(getCellValueAsString(currentRow.getCell(headerMap.get("stream"))));
                cto.setEc(getCellValueAsString(currentRow.getCell(headerMap.get("ec"))));

                Boolean auditada = getCellValueAsBoolean(currentRow.getCell(headerMap.get("Auditada")));
                cto.setAuditada(auditada != null ? auditada : false);
                cto.setComentarios(getCellValueAsString(currentRow.getCell(headerMap.get("Comentarios"))));

                ctoRepository.save(cto);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("imported", importedCount);
        result.put("updated", updatedCount);
        return result;
    }

    private Map<String, Integer> getHeaderMap(Row headerRow) {
        Map<String, Integer> headerMap = new HashMap<>();
        for (Cell cell : headerRow) {
            if (cell.getCellType() == CellType.STRING) {
                String val = cell.getStringCellValue().trim();
                headerMap.put(val, cell.getColumnIndex());
            }
        }
        return headerMap;
    }

    private void validateHeaders(Map<String, Integer> headerMap) {
        String[] required = {"zona", "cluster", "código", "latitud", "longitud"};
        List<String> missing = new ArrayList<>();
        for (String req : required) {
            if (!headerMap.containsKey(req)) {
                missing.add(req);
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalArgumentException("Faltan las siguientes columnas obligatorias en el Excel: " + missing);
        }
    }

    private boolean isRowEmpty(Row row) {
        if (row == null) return true;
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                return false;
            }
        }
        return true;
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                double val = cell.getNumericCellValue();
                if (val == (long) val) {
                    return String.valueOf((long) val);
                }
                return String.valueOf(val);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue().trim();
                } catch (Exception e) {
                    try {
                        return String.valueOf(cell.getNumericCellValue());
                    } catch (Exception ex) {
                        return null;
                    }
                }
            default:
                return null;
        }
    }

    private Double getCellValueAsDouble(Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case NUMERIC:
                return cell.getNumericCellValue();
            case STRING:
                try {
                    return Double.parseDouble(cell.getStringCellValue().trim());
                } catch (NumberFormatException e) {
                    return null;
                }
            default:
                return null;
        }
    }

    private Integer getCellValueAsInteger(Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case NUMERIC:
                return (int) cell.getNumericCellValue();
            case STRING:
                try {
                    return Integer.parseInt(cell.getStringCellValue().trim());
                } catch (NumberFormatException e) {
                    return null;
                }
            default:
                return null;
        }
    }

    private Boolean getCellValueAsBoolean(Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case BOOLEAN:
                return cell.getBooleanCellValue();
            case STRING:
                String val = cell.getStringCellValue().trim().toLowerCase();
                if ("si".equals(val) || "yes".equals(val) || "true".equals(val) || "1".equals(val)) {
                    return true;
                }
                if ("no".equals(val) || "false".equals(val) || "0".equals(val)) {
                    return false;
                }
                return null;
            case NUMERIC:
                return cell.getNumericCellValue() != 0;
            default:
                return null;
        }
    }
}
