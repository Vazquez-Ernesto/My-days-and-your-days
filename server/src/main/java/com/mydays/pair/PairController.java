package com.mydays.pair;

import com.mydays.device.CurrentDevice;
import com.mydays.device.Device;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pairs")
public class PairController {
    private final PairService service;

    public PairController(PairService service) {
        this.service = service;
    }

    /** Ella: crear (o regenerar) la invitación. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PairView createInvite(@CurrentDevice Device device) {
        return service.createInvite(device.getId());
    }

    /** Él: aceptar la invitación con el código. */
    @PostMapping("/join")
    public PairView join(@CurrentDevice Device device, @Valid @RequestBody JoinRequest body) {
        return service.join(device.getId(), body.code());
    }

    /** Cualquiera: ver mi vínculo (para saber si está pendiente o activo). */
    @GetMapping("/me")
    public PairView myPair(@CurrentDevice Device device) {
        return service.myPair(device.getId());
    }

    /** Cualquiera de los dos: desvincular. */
    @DeleteMapping("/{pairId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlink(@CurrentDevice Device device, @PathVariable UUID pairId) {
        service.unlink(device.getId(), pairId);
    }

    public record JoinRequest(@NotBlank String code) { }
}
