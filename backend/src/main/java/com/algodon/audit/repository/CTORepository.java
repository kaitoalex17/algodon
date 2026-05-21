package com.algodon.audit.repository;

import com.algodon.audit.entity.CTO;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CTORepository extends JpaRepository<CTO, Long> {
    Optional<CTO> findByCodigo(String codigo);
}
