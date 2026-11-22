package com.mydays.billing;

/** Cada cuánto se cobra: todos los meses o una vez por año. */
public enum BillingPeriod {
    MONTHLY(1, "mensual"),
    YEARLY(12, "anual");

    public final int months;
    public final String label;

    BillingPeriod(int months, String label) {
        this.months = months;
        this.label = label;
    }
}
