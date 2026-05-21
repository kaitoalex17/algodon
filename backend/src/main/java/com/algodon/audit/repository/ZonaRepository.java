package com.algodon.audit.repository;

import com.algodon.audit.entity.Zona;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ZonaRepository extends JpaRepository<Zona, Long> {
    Optional<Zona> findByNombre(String nombre);
}
