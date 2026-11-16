package com.mydays.push;

import com.mydays.device.CurrentDevice;
import com.mydays.device.Device;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/push")
public class PushController {
    private final PushService push;
    private final VapidKeyService vapid;

    public PushController(PushService push, VapidKeyService vapid) {
        this.push = push;
        this.vapid = vapid;
    }

    /** Pública: la app la necesita para suscribirse. */
    @GetMapping("/public-key")
    public Map<String, String> publicKey() {
        return Map.of("publicKey", vapid.keys().publicKeyB64Url());
    }

    @PutMapping("/subscription")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void subscribe(@CurrentDevice Device device, @Valid @RequestBody SubscriptionRequest body) {
        push.subscribe(device.getId(), body.endpoint(), body.keys().p256dh(), body.keys().auth());
    }

    @DeleteMapping("/subscription")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsubscribe(@CurrentDevice Device device) {
        push.unsubscribe(device.getId());
    }

    @PutMapping("/schedule")
    public Map<String, Integer> schedule(@CurrentDevice Device device, @Valid @RequestBody ScheduleRequest body) {
        List<PushService.Item> items = body.items().stream().map(i -> new PushService.Item(i.sendAt(), i.ciphertext(), i.iv())).toList();
        return Map.of("scheduled", push.replaceSchedule(device.getId(), items));
    }

    @PostMapping("/test")
    public ResponseEntity<Map<String, String>> test(@CurrentDevice Device device) {
        PushSender.Result r = push.sendTest(device.getId());
        return ResponseEntity.status(r == PushSender.Result.DELIVERED ? HttpStatus.OK : HttpStatus.BAD_GATEWAY)
                .body(Map.of("result", r.name()));
    }

    public record SubscriptionRequest(@NotBlank @Size(max = 1000) String endpoint, @NotNull @Valid Keys keys) {
        public record Keys(@NotBlank @Size(max = 128) String p256dh, @NotBlank @Size(max = 64) String auth) { }
    }

    public record ScheduleRequest(@NotNull @Size(max = 120) List<@Valid ScheduleItem> items) { }

    public record ScheduleItem(@NotNull Instant sendAt,
                               @NotBlank @Size(max = 3000) @Pattern(regexp = "^[A-Za-z0-9+/=_-]+$") String ciphertext,
                               @NotBlank @Size(min = 12, max = 32) @Pattern(regexp = "^[A-Za-z0-9+/=_-]+$") String iv) { }
}
