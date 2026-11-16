package com.mydays.pair;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PairRepository extends JpaRepository<Pair, UUID> {
    Optional<Pair> findByInviteCode(String inviteCode);

    Optional<Pair> findByOwnerDeviceId(UUID ownerDeviceId);

    /** Acá sí escribimos la consulta (JPQL): el vínculo donde el dispositivo es ella O él. */
    @Query("select p from Pair p where p.ownerDeviceId = :deviceId or p.partnerDeviceId = :deviceId")
    Optional<Pair> findByMember(UUID deviceId);
}
