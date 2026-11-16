package com.mydays.push;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ScheduledPushRepository extends JpaRepository<ScheduledPush, UUID> {
    List<ScheduledPush> findBySendAtLessThanEqualOrderBySendAtAsc(Instant now, Limit limit);

    List<ScheduledPush> findByDeviceIdOrderBySendAtAsc(UUID deviceId);

    @Modifying
    @Query("delete from ScheduledPush s where s.deviceId = :deviceId")
    void deleteByDeviceId(UUID deviceId);
}
