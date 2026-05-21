package com.algodon.audit.controller;

import com.algodon.audit.repository.CTORepository;
import com.algodon.audit.repository.ClusterRepository;
import com.algodon.audit.repository.ZonaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SystemController {

    private final CTORepository ctoRepository;
    private final ClusterRepository clusterRepository;
    private final ZonaRepository zonaRepository;

    @DeleteMapping("/purge")
    @Transactional
    public ResponseEntity<?> purgeDatabase() {
        // Delete in order to respect foreign keys
        ctoRepository.deleteAllInBatch();
        clusterRepository.deleteAllInBatch();
        zonaRepository.deleteAllInBatch();
        return ResponseEntity.ok().build();
    }
}
