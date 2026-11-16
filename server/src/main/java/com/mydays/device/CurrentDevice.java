package com.mydays.device;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Anotación para recibir el dispositivo autenticado en un controlador:
 *   public PairView myPair(@CurrentDevice Device device) { ... }
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentDevice { }
