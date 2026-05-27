package com.algodon.audit.controller;

import com.algodon.audit.entity.EstadoCTO;
import com.algodon.audit.repository.EstadoCTORepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/estados-cto")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EstadoCTOController {

    private final EstadoCTORepository repository;

    @GetMapping
    public ResponseEntity<List<EstadoCTO>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @PostMapping
    public ResponseEntity<EstadoCTO> create(@RequestBody EstadoCTO estado) {
        return ResponseEntity.ok(repository.save(estado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return repository.findById(id)
                .map(e -> {
                    repository.delete(e);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
