package com.imob.api;

import com.imob.dto.CriteriaDTO;
import com.imob.entity.TemplateEntity;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

@QuarkusTest
public class TemplateResourceTest {

    @InjectMock
    DynamoDbRepository repository;

    @InjectMock
    DynamoDbClient dynamoDbClient;

    @BeforeEach
    public void setup() {
        // Arrange comum para autenticacao do AuthFilter
        var getItemResponse = GetItemResponse.builder()
                .item(Map.of("workspaceId", AttributeValue.builder().s("workspace_test").build()))
                .build();
        
        Mockito.when(this.dynamoDbClient.getItem(Mockito.any(GetItemRequest.class)))
                .thenReturn(getItemResponse);
    }

    @Test
    public void shouldReturnActiveTemplates() {
        // Arrange
        var template = new TemplateEntity();
        template.setWorkspaceId("workspace_test");
        template.setId("template-123");
        template.setVersion(1);
        template.setActive(true);
        template.setCreatedAt("2026-05-30T00:00:00Z");
        template.setCriteria(List.of());

        Mockito.when(this.repository.getActiveTemplates("workspace_test"))
                .thenReturn(List.of(template));

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .when()
                .get("/api/templates")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("[0].id", is("template-123"))
                .body("[0].version", is(1))
                .body("[0].isActive", is(true));
    }

    @Test
    public void shouldCreateNewTemplateVersionOne() {
        // Arrange
        var criteriaDto = new CriteriaDTO();
        criteriaDto.setId("crit-1");
        criteriaDto.setLabel("Fachada");
        criteriaDto.setType("bool");
        criteriaDto.setScorable(true);
        criteriaDto.setWeight(10.0);

        var payload = Map.of(
                "criteria", List.of(criteriaDto)
        );

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/api/templates")
                .then()
                .statusCode(201)
                .contentType(ContentType.JSON)
                .body("version", is(1))
                .body("isActive", is(true))
                .body("criteria[0].id", is("crit-1"));
        
        Mockito.verify(this.repository, Mockito.times(1))
                .saveTemplate(Mockito.any(TemplateEntity.class));
    }

    @Test
    public void shouldOverwriteTemplateWhenNewVersionIsFalse() {
        // Arrange
        String templateId = "template-123";
        TemplateEntity existingTemplate = new TemplateEntity();
        existingTemplate.setWorkspaceId("workspace_test");
        existingTemplate.setId(templateId);
        existingTemplate.setVersion(1);
        existingTemplate.setActive(true);
        existingTemplate.setCreatedAt("2026-05-30T00:00:00Z");
        existingTemplate.setCriteria(List.of());

        Mockito.when(this.repository.getAllVersionsOfTemplate("workspace_test", templateId))
                .thenReturn(List.of(existingTemplate));

        CriteriaDTO criteriaDto = new CriteriaDTO();
        criteriaDto.setId("crit-new");
        criteriaDto.setLabel("Estrutura");
        criteriaDto.setType("text");
        criteriaDto.setScorable(false);
        criteriaDto.setWeight(0.0);

        Map<String, Object> payload = Map.of(
                "newVersion", false,
                "criteria", List.of(criteriaDto)
        );

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .put("/api/templates/" + templateId)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", is(templateId))
                .body("version", is(1))
                .body("isActive", is(true))
                .body("criteria[0].id", is("crit-new"));

        Mockito.verify(this.repository, Mockito.times(1))
                .saveTemplate(Mockito.any(TemplateEntity.class));
    }

    @Test
    public void shouldCreateNewVersionWhenNewVersionIsTrue() {
        // Arrange
        String templateId = "template-123";
        TemplateEntity existingTemplate = new TemplateEntity();
        existingTemplate.setWorkspaceId("workspace_test");
        existingTemplate.setId(templateId);
        existingTemplate.setVersion(1);
        existingTemplate.setActive(true);
        existingTemplate.setCreatedAt("2026-05-30T00:00:00Z");
        existingTemplate.setCriteria(List.of());

        Mockito.when(this.repository.getAllVersionsOfTemplate("workspace_test", templateId))
                .thenReturn(List.of(existingTemplate));

        CriteriaDTO criteriaDto = new CriteriaDTO();
        criteriaDto.setId("crit-new");
        criteriaDto.setLabel("Estrutura");
        criteriaDto.setType("text");
        criteriaDto.setScorable(false);
        criteriaDto.setWeight(0.0);

        Map<String, Object> payload = Map.of(
                "newVersion", true,
                "criteria", List.of(criteriaDto)
        );

        // Act & Assert
        given()
                .header("X-User-Email", "test@imob.com")
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .put("/api/templates/" + templateId)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", is(templateId))
                .body("version", is(2))
                .body("isActive", is(true))
                .body("criteria[0].id", is("crit-new"));

        // O saveTemplate deve ser chamado 2 vezes (uma para inativar a antiga, outra para salvar a nova)
        Mockito.verify(this.repository, Mockito.times(2))
                .saveTemplate(Mockito.any(TemplateEntity.class));
    }
}
