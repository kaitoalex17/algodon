package com.algodon.audit.controller;

import com.algodon.audit.service.ImportService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/import")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ImportController {

    private final ImportService importService;

    @PostMapping("/headers")
    public ResponseEntity<?> getExcelHeaders(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Por favor, suba un archivo Excel.");
        }
        try {
            List<String> headers = importService.getExcelHeaders(file);
            return ResponseEntity.ok(headers);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al extraer cabeceras: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> importExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "mapping", required = false) String mappingJson) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Por favor, suba un archivo Excel.");
        }
        try {
            Map<String, String> mapping = null;
            if (mappingJson != null && !mappingJson.trim().isEmpty()) {
                ObjectMapper mapper = new ObjectMapper();
                mapping = mapper.readValue(mappingJson, new TypeReference<Map<String, String>>() {});
            }
            
            Map<String, Object> stats = importService.importExcel(file, mapping);
            return ResponseEntity.ok(stats);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al procesar el archivo Excel: " + e.getMessage());
        }
    }
}
