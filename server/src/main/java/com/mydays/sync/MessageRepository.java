package com.mydays.sync;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByPairIdAndCreatedAtAfterOrderByCreatedAtAsc(UUID pairId, Instant after, Limit limit);
}
