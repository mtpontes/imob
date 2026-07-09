package com.imob.api;

import com.imob.entity.PropertyEntity;
import com.imob.entity.EvaluationEntity;
import com.imob.repository.PropertyRepository;
import com.imob.repository.EvaluationRepository;
import com.imob.service.S3Service;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

@QuarkusTest
public class PropertyResourceTest {

    @InjectMock
    PropertyRepository repository;

    @InjectMock
    EvaluationRepository evaluationRepository;

    @InjectMock
    DynamoDbClient dynamoDbClient;

    @InjectMock
    S3Service s3Service;

    @BeforeEach
    public void setup() {
        // Arrange comum para o AuthFilter
        GetItemResponse getItemResponse = GetItemResponse.builder()
                .item(Map.of("workspaceId", AttributeValue.builder().s("workspace_test").build()))
                .build();

        Mockito.when(this.dynamoDbClient.getItem(Mockito.any(GetItemRequest.class)))
                .thenReturn(getItemResponse);
    }

    @Test
    public void shouldCreateProperty() {
        // Arrange
        Map<String, Object> payload = Map.of(
                "address", "Rua das Flores, 123",
                "price", 350000.0,
                "sqm", 75.5,
                "bedrooms", 3,
                "bathrooms", 2,
                "parking", 1,
                "url", "https://imob.com/flores123"
        );

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/api/properties")
                .then()
                .statusCode(201)
                .contentType(ContentType.JSON)
                .body("address", is("Rua das Flores, 123"))
                .body("price", is(350000.0f))
                .body("sqm", is(75.5f))
                .body("bedrooms", is(3))
                .body("bathrooms", is(2))
                .body("parking", is(1))
                .body("url", is("https://imob.com/flores123"));

        Mockito.verify(this.repository, Mockito.times(1))
                .saveProperty(Mockito.any(PropertyEntity.class));
    }

    @Test
    public void shouldListPropertiesSortedByDate() {
        // Arrange
        PropertyEntity prop1 = new PropertyEntity();
        prop1.setWorkspaceId("workspace_test");
        prop1.setId("prop-1");
        prop1.setAddress("Rua A");
        prop1.setCreatedAt("2026-06-02T10:00:00Z");

        PropertyEntity prop2 = new PropertyEntity();
        prop2.setWorkspaceId("workspace_test");
        prop2.setId("prop-2");
        prop2.setAddress("Rua B");
        prop2.setCreatedAt("2026-06-03T10:00:00Z");

        // getProperties do repositorio deve retornar ordenado decrescentemente por data de criacao
        Mockito.when(this.repository.getProperties("workspace_test"))
                .thenReturn(List.of(prop2, prop1));

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .when()
                .get("/api/properties")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("[0].id", is("prop-2"))
                .body("[0].address", is("Rua B"))
                .body("[1].id", is("prop-1"))
                .body("[1].address", is("Rua A"));

        Mockito.verify(this.repository, Mockito.times(1))
                .getProperties("workspace_test");
    }

    @Test
    public void shouldDeletePropertyAndCascadeDeleteEvaluationsAndS3Media() {
        // Arrange
        String propertyId = "prop-123";

        PropertyEntity property = new PropertyEntity();
        property.setWorkspaceId("workspace_test");
        property.setId(propertyId);
        property.setAddress("Rua Principal, 100");

        Mockito.when(this.repository.getProperty("workspace_test", propertyId))
                .thenReturn(property);

        EvaluationEntity eval1 = new EvaluationEntity();
        eval1.setWorkspaceId("workspace_test");
        eval1.setPropertyId(propertyId);
        eval1.setCreatedAt("2026-06-18T10:00:00Z");
        eval1.setMediaKeys(List.of("workspace_test/prop-123/foto1.jpg"));

        EvaluationEntity eval2 = new EvaluationEntity();
        eval2.setWorkspaceId("workspace_test");
        eval2.setPropertyId(propertyId);
        eval2.setCreatedAt("2026-06-18T11:00:00Z");
        eval2.setMediaKeys(List.of());

        Mockito.when(this.evaluationRepository.getEvaluationsByProperty("workspace_test", propertyId))
                .thenReturn(List.of(eval1, eval2));

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .when()
                .delete("/api/properties/" + propertyId)
                .then()
                .statusCode(204);

        Mockito.verify(this.s3Service, Mockito.times(1))
                .deleteObject("workspace_test/prop-123/foto1.jpg");

        Mockito.verify(this.evaluationRepository, Mockito.times(1))
                .deleteEvaluation("workspace_test", propertyId, "2026-06-18T10:00:00Z");
        Mockito.verify(this.evaluationRepository, Mockito.times(1))
                .deleteEvaluation("workspace_test", propertyId, "2026-06-18T11:00:00Z");

        Mockito.verify(this.repository, Mockito.times(1))
                .deleteProperty("workspace_test", propertyId);
    }

    @Test
    public void shouldReturnNotFoundWhenDeletingNonexistentProperty() {
        // Arrange
        String propertyId = "prop-nonexistent";

        Mockito.when(this.repository.getProperty("workspace_test", propertyId))
                .thenReturn(null);

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .when()
                .delete("/api/properties/" + propertyId)
                .then()
                .statusCode(404)
                .contentType(ContentType.JSON)
                .body("error", is("Imovel nao encontrado"));

        Mockito.verify(this.repository, Mockito.never())
                .deleteProperty(Mockito.anyString(), Mockito.anyString());
    }
}
