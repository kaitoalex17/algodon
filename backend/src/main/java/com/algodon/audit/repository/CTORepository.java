package com.algodon.audit.repository;

import com.algodon.audit.entity.CTO;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CTORepository extends JpaRepository<CTO, Long> {
    Optional<CTO> findByCodigo(String codigo);

    @org.springframework.data.jpa.repository.Query("SELECT c FROM CTO c LEFT JOIN FETCH c.cluster cl LEFT JOIN FETCH cl.tecnicoAsignado LEFT JOIN FETCH cl.zona")
    java.util.List<CTO> findAllWithClusters();

    @org.springframework.data.jpa.repository.Query("SELECT c FROM CTO c LEFT JOIN FETCH c.cluster cl LEFT JOIN FETCH cl.tecnicoAsignado LEFT JOIN FETCH cl.zona WHERE c.id = :id")
    Optional<CTO> findByIdWithClusters(@org.springframework.data.repository.query.Param("id") Long id);
}
