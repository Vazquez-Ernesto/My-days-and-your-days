package com.mydays.sync;

import com.mydays.device.CurrentDevice;
import com.mydays.device.Device;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pairs/{pairId}")
public class SyncController {
    private final SyncService service;

    public SyncController(SyncService service) {
        this.service = service;
    }

    @PutMapping("/snapshot")
    public SyncService.SnapshotView putSnapshot(@CurrentDevice Device device, @PathVariable UUID pairId,
                                                @Valid @RequestBody EncryptedPayload body) {
        return service.putSnapshot(device.getId(), pairId, body);
    }

    @GetMapping("/snapshot")
    public SyncService.SnapshotView getSnapshot(@CurrentDevice Device device, @PathVariable UUID pairId) {
        return service.getSnapshot(device.getId(), pairId);
    }

    @PutMapping("/profile")
    public SyncService.ProfileView putProfile(@CurrentDevice Device device, @PathVariable UUID pairId,
                                              @Valid @RequestBody EncryptedPayload body) {
        return service.putProfile(device.getId(), pairId, body);
    }

    @GetMapping("/profiles")
    public List<SyncService.ProfileView> getProfiles(@CurrentDevice Device device, @PathVariable UUID pairId,
                                                     @RequestParam(required = false) Instant since) {
        return service.getProfiles(device.getId(), pairId, since);
    }

    @PostMapping("/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public SyncService.MessageView postMessage(@CurrentDevice Device device, @PathVariable UUID pairId,
                                               @Valid @RequestBody EncryptedPayload body) {
        return service.postMessage(device.getId(), pairId, body);
    }

    @GetMapping("/messages")
    public List<SyncService.MessageView> getMessages(@CurrentDevice Device device, @PathVariable UUID pairId,
                                                     @RequestParam(required = false) Instant since) {
        return service.getMessages(device.getId(), pairId, since);
    }
}
