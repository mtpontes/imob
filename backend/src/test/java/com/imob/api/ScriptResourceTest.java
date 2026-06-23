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
public class ScriptResourceTest {

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
    public void shouldReturnActiveScripts() {
        // Arrange
        ScriptEntity script = new ScriptEntity();
        script.setWorkspaceId("workspace_test");
        script.setId("script-123");
        script.setCreatedAt("2026-05-30T00:00:00Z");
        script.setCriteria(List.of());
        script.setName("Roteiro Residencial Padrao");

        Mockito.when(this.repository.getActiveScripts("workspace_test"))
                .thenReturn(List.of(script));

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .when()
                .get("/api/scripts")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("[0].id", is("script-123"))
                .body("[0].name", is("Roteiro Residencial Padrao"));
    }

    @Test
    public void shouldCreateScript() {
        // Arrange
        CriteriaDTO criteriaDto = new CriteriaDTO();
        criteriaDto.setId("crit-1");
        criteriaDto.setLabel("Fachada");
        criteriaDto.setType("bool");
        criteriaDto.setScorable(true);
        criteriaDto.setWeight(10.0);

        Map<String, Object> payload = Map.of(
                "name", "Roteiro Teste",
                "criteria", List.of(criteriaDto)
        );

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/api/scripts")
                .then()
                .statusCode(201)
                .contentType(ContentType.JSON)
                .body("name", is("Roteiro Teste"))
                .body("criteria[0].id", is("crit-1"));
        
        Mockito.verify(this.repository, Mockito.times(1))
                .saveScript(Mockito.any(ScriptEntity.class));
    }

    @Test
    public void shouldUpdateScript() {
        // Arrange
        String scriptId = "script-123";
        ScriptEntity existingScript = new ScriptEntity();
        existingScript.setWorkspaceId("workspace_test");
        existingScript.setId(scriptId);
        existingScript.setCreatedAt("2026-05-30T00:00:00Z");
        existingScript.setCriteria(List.of());
        existingScript.setName("Nome Antigo");

        Mockito.when(this.repository.getScript("workspace_test", scriptId))
                .thenReturn(existingScript);

        CriteriaDTO criteriaDto = new CriteriaDTO();
        criteriaDto.setId("crit-new");
        criteriaDto.setLabel("Estrutura");
        criteriaDto.setType("text");
        criteriaDto.setScorable(false);
        criteriaDto.setWeight(0.0);

        Map<String, Object> payload = Map.of(
                "name", "Nome Novo",
                "criteria", List.of(criteriaDto)
        );

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .put("/api/scripts/" + scriptId)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", is(scriptId))
                .body("name", is("Nome Novo"))
                .body("criteria[0].id", is("crit-new"));

        Mockito.verify(this.repository, Mockito.times(1))
                .saveScript(Mockito.any(ScriptEntity.class));
    }

    @Test
    public void shouldDeleteScriptAndCascadeDeleteEvaluationsAndS3Media() {
        // Arrange
        String scriptId = "script-to-delete";

        ScriptEntity script = new ScriptEntity();
        script.setWorkspaceId("workspace_test");
        script.setId(scriptId);

        Mockito.when(this.repository.getScript("workspace_test", scriptId))
                .thenReturn(script);

        EvaluationEntity eval1 = new EvaluationEntity();
        eval1.setWorkspaceId("workspace_test");
        eval1.setPropertyId("prop-1");
        eval1.setCreatedAt("2026-06-18T10:00:00Z");
        eval1.setScriptId(scriptId);
        eval1.setMediaKeys(List.of("workspace_test/uploads/foto1.jpg", "workspace_test/uploads/foto2.jpg"));

        EvaluationEntity eval2 = new EvaluationEntity();
        eval2.setWorkspaceId("workspace_test");
        eval2.setPropertyId("prop-2");
        eval2.setCreatedAt("2026-06-18T11:00:00Z");
        eval2.setScriptId(scriptId);
        eval2.setMediaKeys(List.of());

        EvaluationEntity evalOther = new EvaluationEntity();
        evalOther.setWorkspaceId("workspace_test");
        evalOther.setPropertyId("prop-3");
        evalOther.setCreatedAt("2026-06-18T12:00:00Z");
        evalOther.setScriptId("other-script");
        evalOther.setMediaKeys(List.of("workspace_test/uploads/foto3.jpg"));

        Mockito.when(this.repository.getEvaluations("workspace_test"))
                .thenReturn(List.of(eval1, eval2, evalOther));

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .when()
                .delete("/api/scripts/" + scriptId)
                .then()
                .statusCode(204);

        Mockito.verify(this.s3Service, Mockito.times(1))
                .deleteObject("workspace_test/uploads/foto1.jpg");
        Mockito.verify(this.s3Service, Mockito.times(1))
                .deleteObject("workspace_test/uploads/foto2.jpg");
        Mockito.verify(this.s3Service, Mockito.never())
                .deleteObject("workspace_test/uploads/foto3.jpg");

        Mockito.verify(this.repository, Mockito.times(1))
                .deleteEvaluation("workspace_test", "prop-1", "2026-06-18T10:00:00Z");
        Mockito.verify(this.repository, Mockito.times(1))
                .deleteEvaluation("workspace_test", "prop-2", "2026-06-18T11:00:00Z");
        Mockito.verify(this.repository, Mockito.never())
                .deleteEvaluation("workspace_test", "prop-3", "2026-06-18T12:00:00Z");

        Mockito.verify(this.repository, Mockito.times(1))
                .deleteScript("workspace_test", scriptId);
    }

    @Test
    public void shouldReturnNotFoundWhenDeletingNonexistentScript() {
        // Arrange
        String scriptId = "nonexistent-script";

        Mockito.when(this.repository.getScript("workspace_test", scriptId))
                .thenReturn(null);

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .when()
                .delete("/api/scripts/" + scriptId)
                .then()
                .statusCode(404)
                .contentType(ContentType.JSON)
                .body("error", is("Roteiro nao encontrado"));

        Mockito.verify(this.repository, Mockito.never())
                .deleteScript(Mockito.anyString(), Mockito.anyString());
    }
}
