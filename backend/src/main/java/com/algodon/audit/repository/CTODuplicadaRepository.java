package com.algodon.audit.repository;

import com.algodon.audit.entity.CTODuplicada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CTODuplicadaRepository extends JpaRepository<CTODuplicada, Long> {
}
