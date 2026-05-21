package com.algodon.audit.repository;

import com.algodon.audit.entity.Cluster;
import com.algodon.audit.entity.Zona;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ClusterRepository extends JpaRepository<Cluster, Long> {
    Optional<Cluster> findByNombreAndZona(String nombre, Zona zona);
    java.util.List<Cluster> findByZonaId(Long zonaId);
}
