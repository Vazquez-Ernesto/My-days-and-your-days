package com.mydays.pair;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class InviteCodesTest {

    @Test
    void generaCodigosConFormatoYSinCaracteresConfusos() {
        for (int i = 0; i < 500; i++) {
            assertThat(InviteCodes.generate()).matches("^[A-Z2-9]{4}-[A-Z2-9]{4}$").doesNotContain("0", "O", "1", "I", "L");
        }
    }

    @Test
    void losCodigosNoSeRepitenFacilmente() {
        Set<String> codes = new HashSet<>();
        for (int i = 0; i < 1000; i++) codes.add(InviteCodes.generate());
        assertThat(codes).hasSize(1000);
    }

    // Test parametrizado: como it.each en Vitest
    @ParameterizedTest(name = "\"{0}\" → \"{1}\"")
    @CsvSource(nullValues = "null", value = {
            "AB2C-D3EF, AB2C-D3EF",
            "ab2c-d3ef, AB2C-D3EF",
            "'  AB2C-D3EF  ', AB2C-D3EF",
            "AB2CD3EF, null",
            "AB2C-D3E, null",
            "'', null",
    })
    void normalizaElCodigoQueEscribeElUsuario(String input, String expected) {
        assertThat(InviteCodes.normalize(input)).isEqualTo(expected);
    }
}
