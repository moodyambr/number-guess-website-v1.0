# ─────────────────────────────────────────────────────────────
#  Stage 1 — Bygg JAR med Maven
# ─────────────────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Kopiera pom.xml separat för bättre Docker layer-caching
COPY pom.xml .
RUN mvn dependency:go-offline -q

COPY src ./src
RUN mvn clean package -DskipTests -q

# ─────────────────────────────────────────────────────────────
#  Stage 2 — Kör JAR med minimal JRE
# ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Kopiera bara den färdiga JAR-filen
COPY --from=build /app/target/number-guess-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

