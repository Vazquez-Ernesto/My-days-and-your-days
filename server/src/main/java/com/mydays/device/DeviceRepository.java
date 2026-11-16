package com.mydays.device;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data genera la implementación a partir del nombre del método: no hay que escribir SQL. */
public interface DeviceRepository extends JpaRepository<Device, UUID> {
    Optional<Device> findByTokenHash(String tokenHash);
}
