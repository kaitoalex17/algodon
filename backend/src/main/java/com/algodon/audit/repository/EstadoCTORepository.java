package com.algodon.audit.repository;

import com.algodon.audit.entity.EstadoCTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EstadoCTORepository extends JpaRepository<EstadoCTO, Long> {
}
