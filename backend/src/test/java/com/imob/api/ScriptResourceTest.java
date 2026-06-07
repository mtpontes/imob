package com.imob.api;

import com.imob.dto.CriteriaDTO;
import com.imob.entity.ScriptEntity;
import com.imob.repository.DynamoDbRepository;
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
        script.setVersion(1);
        script.setActive(true);
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
                .body("[0].version", is(1))
                .body("[0].isActive", is(true))
                .body("[0].name", is("Roteiro Residencial Padrao"));
    }

    @Test
    public void shouldCreateNewScriptVersionOne() {
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
                .body("version", is(1))
                .body("isActive", is(true))
                .body("name", is("Roteiro Teste"))
                .body("criteria[0].id", is("crit-1"));
        
        Mockito.verify(this.repository, Mockito.times(1))
                .saveScript(Mockito.any(ScriptEntity.class));
    }

    @Test
    public void shouldOverwriteScriptWhenNewVersionIsFalse() {
        // Arrange
        String scriptId = "script-123";
        ScriptEntity existingScript = new ScriptEntity();
        existingScript.setWorkspaceId("workspace_test");
        existingScript.setId(scriptId);
        existingScript.setVersion(1);
        existingScript.setActive(true);
        existingScript.setCreatedAt("2026-05-30T00:00:00Z");
        existingScript.setCriteria(List.of());
        existingScript.setName("Nome Antigo");

        Mockito.when(this.repository.getAllVersionsOfScript("workspace_test", scriptId))
                .thenReturn(List.of(existingScript));

        CriteriaDTO criteriaDto = new CriteriaDTO();
        criteriaDto.setId("crit-new");
        criteriaDto.setLabel("Estrutura");
        criteriaDto.setType("text");
        criteriaDto.setScorable(false);
        criteriaDto.setWeight(0.0);

        Map<String, Object> payload = Map.of(
                "name", "Nome Novo",
                "newVersion", false,
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
                .body("version", is(1))
                .body("isActive", is(true))
                .body("name", is("Nome Novo"))
                .body("criteria[0].id", is("crit-new"));

        Mockito.verify(this.repository, Mockito.times(1))
                .saveScript(Mockito.any(ScriptEntity.class));
    }

    @Test
    public void shouldCreateNewVersionWhenNewVersionIsTrue() {
        // Arrange
        String scriptId = "script-123";
        ScriptEntity existingScript = new ScriptEntity();
        existingScript.setWorkspaceId("workspace_test");
        existingScript.setId(scriptId);
        existingScript.setVersion(1);
        existingScript.setActive(true);
        existingScript.setCreatedAt("2026-05-30T00:00:00Z");
        existingScript.setCriteria(List.of());
        existingScript.setName("Nome Antigo");

        Mockito.when(this.repository.getAllVersionsOfScript("workspace_test", scriptId))
                .thenReturn(List.of(existingScript));

        CriteriaDTO criteriaDto = new CriteriaDTO();
        criteriaDto.setId("crit-new");
        criteriaDto.setLabel("Estrutura");
        criteriaDto.setType("text");
        criteriaDto.setScorable(false);
        criteriaDto.setWeight(0.0);

        Map<String, Object> payload = Map.of(
                "name", "Nome Nova Versao",
                "newVersion", true,
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
                .body("version", is(2))
                .body("isActive", is(true))
                .body("name", is("Nome Nova Versao"))
                .body("criteria[0].id", is("crit-new"));

        Mockito.verify(this.repository, Mockito.times(2))
                .saveScript(Mockito.any(ScriptEntity.class));
    }
}
