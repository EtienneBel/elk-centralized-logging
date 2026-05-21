FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:resolve -q
COPY src/ ./src/
RUN mvn package -q

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
RUN mkdir -p /app/logs
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
