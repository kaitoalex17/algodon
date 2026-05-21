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

    public List<String> getExcelHeaders(MultipartFile file) throws Exception {
        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();
            if (!rows.hasNext()) {
                throw new IllegalArgumentException("El archivo Excel está vacío");
            }
            Row headerRow = rows.next();
            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) {
                if (cell.getCellType() == CellType.STRING) {
                    headers.add(cell.getStringCellValue().trim());
                } else {
                    headers.add("Columna " + cell.getColumnIndex());
                }
            }
            return headers;
        }
    }

    @Transactional
    public Map<String, Object> importExcel(MultipartFile file, Map<String, String> mapping) throws Exception {
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
            
            // Map: Excel Header Name -> Column Index
            Map<String, Integer> excelHeaderToIndex = new HashMap<>();
            for (Cell cell : headerRow) {
                if (cell.getCellType() == CellType.STRING) {
                    String val = cell.getStringCellValue().trim();
                    excelHeaderToIndex.put(val, cell.getColumnIndex());
                }
            }

            String[] allFields = {
                "codigo", "zona", "cluster", "latitud", "longitud", "usersinc", "olt", 
                "entidad", "municipio", "provincia", "empresa", "estado", "sincronizada", 
                "entregada", "aceptada", "mutualizada", "uuii", "tipoDespliegueInput", 
                "stream", "ec", "auditada", "comentarios"
            };

            Map<String, Integer> fieldToIndex = new HashMap<>();
            for (String field : allFields) {
                String mappedHeader = mapping != null ? mapping.get(field) : null;
                if (mappedHeader == null || mappedHeader.trim().isEmpty()) {
                    mappedHeader = getDefaultHeaderName(field);
                }
                
                Integer index = excelHeaderToIndex.get(mappedHeader);
                if (index == null) {
                    for (Map.Entry<String, Integer> entry : excelHeaderToIndex.entrySet()) {
                        if (entry.getKey().equalsIgnoreCase(mappedHeader)) {
                            index = entry.getValue();
                            break;
                        }
                    }
                }
                if (index != null) {
                    fieldToIndex.put(field, index);
                }
            }

            List<String> missing = new ArrayList<>();
            String[] requiredFields = {"codigo", "zona", "cluster", "latitud", "longitud"};
            for (String req : requiredFields) {
                if (!fieldToIndex.containsKey(req)) {
                    String userMappedHeader = mapping != null ? mapping.get(req) : null;
                    missing.add(req + (userMappedHeader != null ? " (mapeado como '" + userMappedHeader + "')" : ""));
                }
            }
            if (!missing.isEmpty()) {
                throw new IllegalArgumentException("Faltan las siguientes columnas obligatorias en el Excel: " + missing);
            }

            Map<String, Zona> zonaCache = new HashMap<>();
            Map<String, Map<String, Cluster>> clusterCache = new HashMap<>();

            while (rows.hasNext()) {
                Row currentRow = rows.next();
                if (isRowEmpty(currentRow)) {
                    continue;
                }

                String zonaNombre = getFieldValueAsString(currentRow, fieldToIndex.get("zona"));
                String clusterNombre = getFieldValueAsString(currentRow, fieldToIndex.get("cluster"));
                String codigo = getFieldValueAsString(currentRow, fieldToIndex.get("codigo"));

                if (zonaNombre == null || clusterNombre == null || codigo == null) {
                    log.warn("Fila {} saltada: zona, cluster o código están vacíos", currentRow.getRowNum());
                    continue;
                }

                Zona zona = zonaCache.computeIfAbsent(zonaNombre.toUpperCase(), name -> {
                    return zonaRepository.findByNombre(zonaNombre)
                            .orElseGet(() -> {
                                Zona z = new Zona();
                                z.setNombre(zonaNombre);
                                return zonaRepository.save(z);
                            });
                });

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

                Optional<CTO> existingCto = ctoRepository.findByCodigo(codigo);
                CTO cto = existingCto.orElseGet(CTO::new);
                if (existingCto.isPresent()) {
                    updatedCount++;
                } else {
                    importedCount++;
                }

                cto.setCodigo(codigo);
                cto.setCluster(cluster);
                cto.setUsersinc(getFieldValueAsString(currentRow, fieldToIndex.get("usersinc")));
                cto.setOlt(getFieldValueAsString(currentRow, fieldToIndex.get("olt")));
                cto.setEntidad(getFieldValueAsString(currentRow, fieldToIndex.get("entidad")));
                cto.setMunicipio(getFieldValueAsString(currentRow, fieldToIndex.get("municipio")));
                cto.setProvincia(getFieldValueAsString(currentRow, fieldToIndex.get("provincia")));
                cto.setEmpresa(getFieldValueAsString(currentRow, fieldToIndex.get("empresa")));
                cto.setEstado(getFieldValueAsString(currentRow, fieldToIndex.get("estado")));

                Double latitud = getFieldValueAsDouble(currentRow, fieldToIndex.get("latitud"));
                Double longitud = getFieldValueAsDouble(currentRow, fieldToIndex.get("longitud"));
                cto.setLatitud(latitud);
                cto.setLongitud(longitud);

                if (latitud != null && longitud != null) {
                    Point geom = geometryFactory.createPoint(new Coordinate(longitud, latitud));
                    cto.setGeom(geom);
                } else {
                    cto.setGeom(null);
                }

                cto.setSincronizada(getFieldValueAsBoolean(currentRow, fieldToIndex.get("sincronizada")));
                cto.setEntregada(getFieldValueAsBoolean(currentRow, fieldToIndex.get("entregada")));
                cto.setAceptada(getFieldValueAsBoolean(currentRow, fieldToIndex.get("aceptada")));
                cto.setMutualizada(getFieldValueAsBoolean(currentRow, fieldToIndex.get("mutualizada")));
                cto.setUuii(getFieldValueAsInteger(currentRow, fieldToIndex.get("uuii")));
                cto.setTipoDespliegueInput(getFieldValueAsString(currentRow, fieldToIndex.get("tipoDespliegueInput")));
                cto.setStream(getFieldValueAsString(currentRow, fieldToIndex.get("stream")));
                cto.setEc(getFieldValueAsString(currentRow, fieldToIndex.get("ec")));

                Boolean auditada = getFieldValueAsBoolean(currentRow, fieldToIndex.get("auditada"));
                cto.setAuditada(auditada != null ? auditada : false);
                cto.setComentarios(getFieldValueAsString(currentRow, fieldToIndex.get("comentarios")));

                ctoRepository.save(cto);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("imported", importedCount);
        result.put("updated", updatedCount);
        return result;
    }

    private String getDefaultHeaderName(String field) {
        switch (field) {
            case "codigo": return "código";
            case "tipoDespliegueInput": return "tipo_despliegue_input";
            case "auditada": return "Auditada";
            case "comentarios": return "Comentarios";
            default: return field;
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

    private String getFieldValueAsString(Row row, Integer colIndex) {
        if (colIndex == null) return null;
        return getCellValueAsString(row.getCell(colIndex));
    }

    private Double getFieldValueAsDouble(Row row, Integer colIndex) {
        if (colIndex == null) return null;
        return getCellValueAsDouble(row.getCell(colIndex));
    }

    private Integer getFieldValueAsInteger(Row row, Integer colIndex) {
        if (colIndex == null) return null;
        return getCellValueAsInteger(row.getCell(colIndex));
    }

    private Boolean getFieldValueAsBoolean(Row row, Integer colIndex) {
        if (colIndex == null) return null;
        return getCellValueAsBoolean(row.getCell(colIndex));
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
