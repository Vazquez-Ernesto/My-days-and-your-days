# Etapa 1: compilar con el JDK completo (usa el Maven Wrapper, no hace falta Maven instalado)
FROM eclipse-temurin:21-jdk-noble AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src/ src/
RUN ./mvnw -B -q package -DskipTests && cp target/mydays-server-*.jar app.jar

# Etapa 2: imagen liviana solo con el JRE para correr
FROM eclipse-temurin:21-jre-noble
WORKDIR /app
RUN useradd --system --uid 10001 mydays
COPY --from=build /app/app.jar app.jar
USER mydays
# El plan gratis de Render tiene 512 MB: limitamos la memoria de Java para no pasarnos
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -XX:TieredStopAtLevel=1"
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
