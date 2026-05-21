package com.algodon.audit.controller;

import com.algodon.audit.entity.Cluster;
import com.algodon.audit.entity.Usuario;
import com.algodon.audit.entity.Zona;
import com.algodon.audit.repository.ClusterRepository;
import com.algodon.audit.repository.UsuarioRepository;
import com.algodon.audit.repository.ZonaRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AssignmentController {

    private final ZonaRepository zonaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ClusterRepository clusterRepository;

    @GetMapping("/zonas")
    public ResponseEntity<List<Zona>> getZonas() {
        return ResponseEntity.ok(zonaRepository.findAll());
    }

    @GetMapping("/usuarios")
    public ResponseEntity<List<Usuario>> getUsuarios() {
        return ResponseEntity.ok(usuarioRepository.findAll());
    }

    @PostMapping("/usuarios")
    public ResponseEntity<?> createUsuario(@RequestBody Usuario usuario) {
        if (usuario.getUsername() == null || usuario.getNombre() == null || usuario.getEmail() == null) {
            return ResponseEntity.badRequest().body("Faltan campos requeridos (username, nombre, email)");
        }
        if (usuarioRepository.findByUsername(usuario.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("El nombre de usuario ya está registrado");
        }
        if (usuarioRepository.findByEmail(usuario.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("El email ya está registrado");
        }
        return ResponseEntity.ok(usuarioRepository.save(usuario));
    }

    @PostMapping("/assignment/distribute")
    public ResponseEntity<?> distributeClusters(@RequestBody DistributeRequest request) {
        if (request.getZonaId() == null || request.getTecnicoIds() == null || request.getTecnicoIds().isEmpty()) {
            return ResponseEntity.badRequest().body("Faltan parámetros requeridos (zonaId o tecnicoIds)");
        }

        List<Cluster> clusters = clusterRepository.findByZonaId(request.getZonaId());
        if (clusters.isEmpty()) {
            return ResponseEntity.badRequest().body("No se encontraron clusters para la zona especificada");
        }

        List<Usuario> tecnicos = usuarioRepository.findAllById(request.getTecnicoIds());
        if (tecnicos.isEmpty()) {
            return ResponseEntity.badRequest().body("No se encontraron técnicos para los IDs proporcionados");
        }

        // Barajar aleatoriamente los clusters
        Collections.shuffle(clusters);

        // Reparto equitativo (Round Robin)
        for (int i = 0; i < clusters.size(); i++) {
            Usuario tecnico = tecnicos.get(i % tecnicos.size());
            clusters.get(i).setTecnicoAsignado(tecnico);
        }

        clusterRepository.saveAll(clusters);

        return ResponseEntity.ok(Map.of(
            "message", "Clusters distribuidos correctamente",
            "clustersCount", clusters.size(),
            "tecnicosCount", tecnicos.size()
        ));
    }

    @PostMapping("/assignment/assign")
    public ResponseEntity<?> assignClusters(@RequestBody AssignRequest request) {
        if (request.getClusterIds() == null || request.getClusterIds().isEmpty() || request.getTecnicoId() == null) {
            return ResponseEntity.badRequest().body("Faltan parámetros requeridos (clusterIds o tecnicoId)");
        }

        Usuario tecnico = usuarioRepository.findById(request.getTecnicoId()).orElse(null);
        if (tecnico == null) {
            return ResponseEntity.badRequest().body("Técnico no encontrado");
        }

        List<Cluster> clusters = clusterRepository.findAllById(request.getClusterIds());
        if (clusters.isEmpty()) {
            return ResponseEntity.badRequest().body("No se encontraron clusters");
        }

        for (Cluster c : clusters) {
            c.setTecnicoAsignado(tecnico);
        }
        clusterRepository.saveAll(clusters);

        return ResponseEntity.ok(Map.of(
            "message", "Clusters asignados correctamente",
            "assignedCount", clusters.size()
        ));
    }

    @Data
    public static class DistributeRequest {
        private Long zonaId;
        private List<Long> tecnicoIds;
    }

    @Data
    public static class AssignRequest {
        private List<Long> clusterIds;
        private Long tecnicoId;
    }
}
