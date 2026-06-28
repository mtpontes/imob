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

# Copy the Quarkus fast-jar application
COPY --from=build /usr/src/app/target/quarkus-app/ /app/

EXPOSE 8080

# Command to run the application
CMD ["java", "-jar", "quarkus-run.jar"]
