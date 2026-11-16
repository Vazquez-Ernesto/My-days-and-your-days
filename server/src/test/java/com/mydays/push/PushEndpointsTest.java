package com.mydays.push;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class PushEndpointsTest {
    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({
            "https://web.push.apple.com/QGv2x9, true",
            "https://api.push.apple.com/x, true",
            "https://fcm.googleapis.com/fcm/send/abc, true",
            "https://updates.push.services.mozilla.com/wpush/v2/x, true",
            "https://wns2-par02p.notify.windows.com/w/?token=x, true",
            "http://web.push.apple.com/x, false",
            "https://push.apple.com.evil.com/x, false",
            "https://evil.com/web.push.apple.com, false",
            "https://169.254.169.254/latest/meta-data, false",
            "no-es-una-url, false",
    })
    void soloServiciosDePushConocidos(String endpoint, boolean allowed) {
        assertThat(PushEndpoints.isAllowed(endpoint)).isEqualTo(allowed);
    }
}
