package com.imob.api;

import com.imob.dto.CriteriaDTO;
import com.imob.entity.TemplateEntity;
import com.imob.entity.EvaluationEntity;
import com.imob.repository.DynamoDbRepository;
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
public class EvaluationResourceTest {

    @InjectMock
    DynamoDbRepository repository;

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
    public void shouldRejectEvaluationWithInactiveTemplate() {
        // Arrange
        String templateId = "temp-inactive";
        int version = 1;

        TemplateEntity template = new TemplateEntity();
        template.setWorkspaceId("workspace_test");
        template.setId(templateId);
        template.setVersion(version);
        template.setActive(false); // Inativo!
        template.setCriteria(List.of());

        Mockito.when(this.repository.getTemplate("workspace_test", templateId, version))
                .thenReturn(template);

        Map<String, Object> payload = Map.of(
                "propertyId", "prop-123",
                "templateId", templateId,
                "templateVersion", version,
                "answers", Map.of(),
                "notes", "Nota fiscal",
                "mediaKeys", List.of()
        );

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/api/evaluations")
                .then()
                .statusCode(400)
                .contentType(ContentType.JSON)
                .body("error", is("Template nao encontrado ou inativo"));
    }

    @Test
    public void shouldRejectEvaluationWithInvalidCriteriaAnswer() {
        // Arrange
        String templateId = "temp-active";
        int version = 1;

        CriteriaDTO c1 = new CriteriaDTO();
        c1.setId("c1");
        c1.setScorable(true);
        c1.setWeight(10.0);
        c1.setType("bool");

        TemplateEntity template = new TemplateEntity();
        template.setWorkspaceId("workspace_test");
        template.setId(templateId);
        template.setVersion(version);
        template.setActive(true);
        template.setCriteria(List.of(c1));

        Mockito.when(this.repository.getTemplate("workspace_test", templateId, version))
                .thenReturn(template);

        // Answers contem 'c2' que nao pertence ao template (apenas 'c1' pertence)
        Map<String, Object> payload = Map.of(
                "propertyId", "prop-123",
                "templateId", templateId,
                "templateVersion", version,
                "answers", Map.of("c1", true, "c2", "invalido"),
                "notes", "Nota fiscal",
                "mediaKeys", List.of()
        );

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/api/evaluations")
                .then()
                .statusCode(400)
                .contentType(ContentType.JSON)
                .body("error", is("Respostas contem criterios nao cadastrados no template"));
    }

    @Test
    public void shouldCreateEvaluationAndCalculateScore() {
        // Arrange
        String templateId = "temp-active";
        int version = 1;

        CriteriaDTO c1 = new CriteriaDTO();
        c1.setId("c1");
        c1.setScorable(true);
        c1.setWeight(10.0);
        c1.setType("bool");

        TemplateEntity template = new TemplateEntity();
        template.setWorkspaceId("workspace_test");
        template.setId(templateId);
        template.setVersion(version);
        template.setActive(true);
        template.setCriteria(List.of(c1));

        Mockito.when(this.repository.getTemplate("workspace_test", templateId, version))
                .thenReturn(template);

        Map<String, Object> payload = Map.of(
                "propertyId", "prop-123",
                "templateId", templateId,
                "templateVersion", version,
                "answers", Map.of("c1", true),
                "notes", "Nota fiscal",
                "mediaKeys", List.of()
        );

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/api/evaluations")
                .then()
                .statusCode(201)
                .contentType(ContentType.JSON)
                .body("propertyId", is("prop-123"))
                .body("finalScore", is(100.0f))
                .body("notes", is("Nota fiscal"));

        Mockito.verify(this.repository, Mockito.times(1))
                .saveEvaluation(Mockito.any(EvaluationEntity.class));
    }

    @Test
    public void shouldGenerateUploadUrl() {
        // Arrange
        Map<String, Object> payload = Map.of(
                "fileName", "fachada.jpg"
        );

        Mockito.when(this.s3Service.generatePutPresignedUrl(Mockito.anyString(), Mockito.any(java.time.Duration.class)))
                .thenReturn("https://s3-fake-upload-url");

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/api/evaluations/upload-url")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("uploadUrl", is("https://s3-fake-upload-url"))
                .body("s3Key", org.hamcrest.Matchers.containsString("workspace_test/uploads/"));
    }

    @Test
    public void shouldGenerateGetPresignedUrlsInPropertyEvaluations() {
        // Arrange
        String propertyId = "prop-123";

        EvaluationEntity eval = new EvaluationEntity();
        eval.setWorkspaceId("workspace_test");
        eval.setPropertyId(propertyId);
        eval.setCreatedAt("2026-06-03T10:00:00Z");
        eval.setTemplateId("temp-1");
        eval.setTemplateVersion(1);
        eval.setFinalScore(75.0);
        eval.setNotes("Test note");
        eval.setMediaKeys(List.of("workspace_test/uploads/foto1.jpg"));
        eval.setAnswers(Map.of());

        Mockito.when(this.repository.getEvaluationsByProperty("workspace_test", propertyId))
                .thenReturn(List.of(eval));

        Mockito.when(this.s3Service.generateGetPresignedUrl("workspace_test/uploads/foto1.jpg", java.time.Duration.ofHours(1)))
                .thenReturn("https://s3-fake-get-url");

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .when()
                .get("/api/evaluations/property/" + propertyId)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("[0].propertyId", is(propertyId))
                .body("[0].mediaUrls[0]", is("https://s3-fake-get-url"));

        Mockito.verify(this.repository, Mockito.times(1))
                .getEvaluationsByProperty("workspace_test", propertyId);
        Mockito.verify(this.s3Service, Mockito.times(1))
                .generateGetPresignedUrl("workspace_test/uploads/foto1.jpg", java.time.Duration.ofHours(1));
    }
}
