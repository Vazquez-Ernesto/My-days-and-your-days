package com.mydays;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Punto de entrada: arranca el servidor web (por defecto en el puerto 8080). */
@SpringBootApplication
public class MyDaysApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyDaysApplication.class, args);
    }
}
