# Stage 1: Build target using Maven and Java 25
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /usr/src/app

# Copy pom.xml to cache dependencies
COPY pom.xml ./
RUN mvn dependency:go-offline -B

# Copy source code and build package
COPY src ./src
RUN mvn package -DskipTests

# Stage 2: Runtime image
FROM eclipse-temurin:25-jre
WORKDIR /app

# Copy the Quarkus runner jar and lib directory (Quarkus thin-jar layout)
COPY --from=build /usr/src/app/target/backend-1.0.0-SNAPSHOT-runner.jar /app/runner.jar
COPY --from=build /usr/src/app/target/lib/ /app/lib/

EXPOSE 8080

# Command to run the application
CMD ["java", "-jar", "runner.jar"]
