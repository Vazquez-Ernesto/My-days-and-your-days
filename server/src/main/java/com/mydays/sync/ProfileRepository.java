package com.mydays.sync;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, Profile.Key> {
    List<Profile> findByIdPairIdAndUpdatedAtAfter(UUID pairId, Instant after);
}
