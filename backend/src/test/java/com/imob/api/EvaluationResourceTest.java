package com.imob.api;

import com.imob.dto.CriteriaDTO;
import com.imob.entity.ScriptEntity;
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
        // Arrange
        GetItemResponse getItemResponse = GetItemResponse.builder()
                .item(Map.of("workspaceId", AttributeValue.builder().s("workspace_test").build()))
                .build();
        Mockito.when(this.dynamoDbClient.getItem(Mockito.any(GetItemRequest.class)))
                .thenReturn(getItemResponse);
    }

    @Test
    public void shouldRejectEvaluationWithNonexistentScript() {
        // Arrange
        String scriptId = "script-nonexistent";

        Mockito.when(this.repository.getScript("workspace_test", scriptId))
                .thenReturn(null);

        Map<String, Object> payload = Map.of(
                "propertyId", "prop-123",
                "scriptId", scriptId,
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
                .body("error", is("Roteiro nao encontrado ou inativo"));
    }

    @Test
    public void shouldRejectEvaluationWithInvalidCriteriaAnswer() {
        // Arrange
        String scriptId = "script-active";

        CriteriaDTO c1 = new CriteriaDTO();
        c1.setId("c1");
        c1.setScorable(true);
        c1.setWeight(10.0);
        c1.setType("bool");

        ScriptEntity script = new ScriptEntity();
        script.setWorkspaceId("workspace_test");
        script.setId(scriptId);
        script.setCriteria(List.of(c1));

        Mockito.when(this.repository.getScript("workspace_test", scriptId))
                .thenReturn(script);

        // Answers contem 'c2' que nao pertence ao roteiro (apenas 'c1' pertence)
        Map<String, Object> payload = Map.of(
                "propertyId", "prop-123",
                "scriptId", scriptId,
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
                .body("error", is("Respostas contem criterios nao cadastrados no roteiro"));
    }

    @Test
    public void shouldCreateEvaluation() {
        // Arrange
        String scriptId = "script-active";

        CriteriaDTO c1 = new CriteriaDTO();
        c1.setId("c1");
        c1.setScorable(true);
        c1.setWeight(10.0);
        c1.setType("bool");

        ScriptEntity script = new ScriptEntity();
        script.setWorkspaceId("workspace_test");
        script.setId(scriptId);
        script.setCriteria(List.of(c1));

        Mockito.when(this.repository.getScript("workspace_test", scriptId))
                .thenReturn(script);

        Map<String, Object> payload = Map.of(
                "propertyId", "prop-123",
                "scriptId", scriptId,
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

        Mockito.when(this.s3Service.generatePutPresignedUrl(Mockito.anyString(), Mockito.anyString(), Mockito.any(java.time.Duration.class)))
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
        eval.setScriptId("script-1");

        eval.setNotes("Test note");
        eval.setMediaKeys(List.of("workspace_test/uploads/foto1.jpg"));
        eval.setAnswers(Map.of());

        Mockito.when(this.repository.getEvaluationsByProperty("workspace_test", propertyId))
                .thenReturn(List.of(eval));

        Mockito.when(this.s3Service.generateGetPresignedUrl("workspace_test/uploads/foto1.jpg", java.time.Duration.ofHours(1)))
                .thenReturn("https://s3-fake-get-url");

        Mockito.when(this.s3Service.generateGetPresignedUrl("workspace_test/uploads/thumbnails/foto1.jpg", java.time.Duration.ofHours(1)))
                .thenReturn("https://s3-fake-thumb-url");

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .when()
                .get("/api/evaluations/property/" + propertyId)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("[0].propertyId", is(propertyId))
                .body("[0].mediaUrls[0]", is("https://s3-fake-get-url"))
                .body("[0].mediaItems[0].originalUrl", is("https://s3-fake-get-url"))
                .body("[0].mediaItems[0].thumbnailUrl", is("https://s3-fake-thumb-url"))
                .body("[0].mediaItems[0].mediaType", is("IMAGE"));

        Mockito.verify(this.repository, Mockito.times(1))
                .getEvaluationsByProperty("workspace_test", propertyId);

        Mockito.verify(this.s3Service, Mockito.times(1))
                .generateGetPresignedUrl("workspace_test/uploads/foto1.jpg", java.time.Duration.ofHours(1));

        Mockito.verify(this.s3Service, Mockito.times(1))
                .generateGetPresignedUrl("workspace_test/uploads/thumbnails/foto1.jpg", java.time.Duration.ofHours(1));
    }

    @Test
    public void shouldGetEvaluation() {
        // Arrange
        String propertyId = "prop-123";
        String createdAt = "2026-06-07T22:24:45Z";

        EvaluationEntity eval = new EvaluationEntity();
        eval.setWorkspaceId("workspace_test");
        eval.setPropertyId(propertyId);
        eval.setCreatedAt(createdAt);
        eval.setScriptId("script-1");
        eval.setNotes("Notes initial");
        eval.setMediaKeys(List.of());
        eval.setAnswers(Map.of());

        Mockito.when(this.repository.getEvaluation("workspace_test", propertyId, createdAt))
                .thenReturn(eval);

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .when()
                .get("/api/evaluations/" + propertyId + "/date/" + createdAt)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("propertyId", is(propertyId))
                .body("createdAt", is(createdAt))
                .body("notes", is("Notes initial"));

        Mockito.verify(this.repository, Mockito.times(1))
                .getEvaluation("workspace_test", propertyId, createdAt);
    }

    @Test
    public void shouldReturnNotFoundWhenGettingNonexistentEvaluation() {
        // Arrange
        String propertyId = "prop-123";
        String createdAt = "2026-06-07T22:24:45Z";

        Mockito.when(this.repository.getEvaluation("workspace_test", propertyId, createdAt))
                .thenReturn(null);

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .when()
                .get("/api/evaluations/" + propertyId + "/date/" + createdAt)
                .then()
                .statusCode(404);
    }

    @Test
    public void shouldUpdateEvaluation() {
        // Arrange
        String propertyId = "prop-123";
        String createdAt = "2026-06-07T22:24:45Z";
        String scriptId = "script-active";

        EvaluationEntity existing = new EvaluationEntity();
        existing.setWorkspaceId("workspace_test");
        existing.setPropertyId(propertyId);
        existing.setCreatedAt(createdAt);
        existing.setScriptId(scriptId);
        existing.setNotes("Notes initial");
        existing.setMediaKeys(List.of());
        existing.setAnswers(Map.of());

        Mockito.when(this.repository.getEvaluation("workspace_test", propertyId, createdAt))
                .thenReturn(existing);

        ScriptEntity script = new ScriptEntity();
        script.setWorkspaceId("workspace_test");
        script.setId(scriptId);
        script.setCriteria(List.of());

        Mockito.when(this.repository.getScript("workspace_test", scriptId))
                .thenReturn(script);

        Map<String, Object> payload = Map.of(
                "notes", "Notes updated",
                "answers", Map.of(),
                "mediaKeys", List.of()
        );

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .put("/api/evaluations/" + propertyId + "/date/" + createdAt)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("propertyId", is(propertyId))
                .body("createdAt", is(createdAt))
                .body("notes", is("Notes updated"));

        Mockito.verify(this.repository, Mockito.times(1))
                .saveEvaluation(Mockito.any(EvaluationEntity.class));
    }

    @Test
    public void shouldDeleteEvaluation() {
        // Arrange
        String propertyId = "prop-123";
        String createdAt = "2026-06-07T22:24:45Z";

        EvaluationEntity existing = new EvaluationEntity();
        existing.setWorkspaceId("workspace_test");
        existing.setPropertyId(propertyId);
        existing.setCreatedAt(createdAt);
        existing.setScriptId("script-1");

        Mockito.when(this.repository.getEvaluation("workspace_test", propertyId, createdAt))
                .thenReturn(existing);

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .when()
                .delete("/api/evaluations/" + propertyId + "/date/" + createdAt)
                .then()
                .statusCode(204);

        Mockito.verify(this.repository, Mockito.times(1))
                .deleteEvaluation("workspace_test", propertyId, createdAt);
    }
}
