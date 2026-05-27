package com.algodon.audit.controller;

import com.algodon.audit.entity.CTODuplicada;
import com.algodon.audit.repository.CTODuplicadaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/import/duplicadas")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CTODuplicadaController {

    private final CTODuplicadaRepository duplicadaRepository;

    @GetMapping
    public ResponseEntity<List<CTODuplicada>> getAll() {
        return ResponseEntity.ok(duplicadaRepository.findAll());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return duplicadaRepository.findById(id)
                .map(d -> {
                    duplicadaRepository.delete(d);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping
    public ResponseEntity<?> deleteAll() {
        duplicadaRepository.deleteAll();
        return ResponseEntity.ok().build();
    }
}
