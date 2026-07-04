package com.imob.api;

import com.imob.entity.WorkspaceEntity;
import com.imob.entity.UserWorkspaceRelationEntity;
import com.imob.repository.WorkspaceRepository;
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
public class WorkspaceResourceTest {

    @InjectMock
    WorkspaceRepository repository;

    @InjectMock
    DynamoDbClient dynamoDbClient;

    @BeforeEach
    public void setup() {
        // Arrange comum para o AuthFilter
        GetItemResponse getItemResponse = GetItemResponse.builder()
                .item(Map.of("workspaceId", AttributeValue.builder().s("workspace_test").build()))
                .build();

        Mockito.when(this.dynamoDbClient.getItem(Mockito.any(GetItemRequest.class)))
                .thenReturn(getItemResponse);

        UserWorkspaceRelationEntity defaultRel = new UserWorkspaceRelationEntity();
        defaultRel.setEmail("test@imob.com");
        defaultRel.setWorkspaceId("workspace_test");
        defaultRel.setRole("OWNER");
        defaultRel.setWorkspaceName("Test Workspace");

        Mockito.when(this.repository.getUserWorkspaceRelation("test@imob.com", "workspace_test"))
                .thenReturn(defaultRel);
    }

    @Test
    public void shouldListWorkspaces() {
        // Arrange
        String email = "test@imob.com";
        UserWorkspaceRelationEntity rel1 = new UserWorkspaceRelationEntity();
        rel1.setEmail(email);
        rel1.setWorkspaceId("workspace_test");
        rel1.setWorkspaceName("Test Workspace");
        rel1.setRole("OWNER");
        rel1.setJoinedAt("2026-06-01T10:00:00Z");

        UserWorkspaceRelationEntity rel2 = new UserWorkspaceRelationEntity();
        rel2.setEmail(email);
        rel2.setWorkspaceId("workspace_other");
        rel2.setWorkspaceName("Other Workspace");
        rel2.setRole("MEMBER");
        rel2.setJoinedAt("2026-06-02T10:00:00Z");

        Mockito.when(this.repository.getUserWorkspaceRelations(email))
                .thenReturn(List.of(rel1, rel2));

        // Act & Assert
        given()
                .header("X-User-Email", email)
                .when()
                .get("/api/workspaces")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("size()", is(2))
                .body("[0].workspaceId", is("workspace_test"))
                .body("[0].workspaceName", is("Test Workspace"))
                .body("[0].active", is(true))
                .body("[1].workspaceId", is("workspace_other"))
                .body("[1].workspaceName", is("Other Workspace"))
                .body("[1].active", is(false));
    }

    @Test
    public void shouldCreateWorkspace() {
        // Arrange
        String email = "test@imob.com";
        Map<String, Object> payload = Map.of(
                "name", "Novo Workspace"
        );

        // Act & Assert
        given()
                .header("X-User-Email", email)
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/api/workspaces")
                .then()
                .statusCode(201)
                .contentType(ContentType.JSON)
                .body("workspaceName", is("Novo Workspace"))
                .body("active", is(true))
                .body("role", is("OWNER"));

        Mockito.verify(this.repository, Mockito.times(1))
                .saveWorkspace(Mockito.any(WorkspaceEntity.class));
        Mockito.verify(this.repository, Mockito.times(1))
                .saveUserWorkspaceRelation(Mockito.any(UserWorkspaceRelationEntity.class));
        Mockito.verify(this.repository, Mockito.times(1))
                .updateActiveWorkspace(Mockito.eq(email), Mockito.anyString());
    }

    @Test
    public void shouldChangeActiveWorkspace() {
        // Arrange
        String email = "test@imob.com";
        UserWorkspaceRelationEntity rel1 = new UserWorkspaceRelationEntity();
        rel1.setEmail(email);
        rel1.setWorkspaceId("workspace_other");

        Mockito.when(this.repository.getUserWorkspaceRelations(email))
                .thenReturn(List.of(rel1));

        Map<String, Object> payload = Map.of(
                "workspaceId", "workspace_other"
        );

        // Act & Assert
        given()
                .header("X-User-Email", email)
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/api/workspaces/active")
                .then()
                .statusCode(204);

        Mockito.verify(this.repository, Mockito.times(1))
                .updateActiveWorkspace(email, "workspace_other");
    }

    @Test
    public void shouldReturnForbiddenWhenChangingToInvalidActiveWorkspace() {
        // Arrange
        String email = "test@imob.com";
        UserWorkspaceRelationEntity rel1 = new UserWorkspaceRelationEntity();
        rel1.setEmail(email);
        rel1.setWorkspaceId("workspace_test");

        Mockito.when(this.repository.getUserWorkspaceRelations(email))
                .thenReturn(List.of(rel1));

        Map<String, Object> payload = Map.of(
                "workspaceId", "workspace_non_existent"
        );

        // Act & Assert
        given()
                .header("X-User-Email", email)
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/api/workspaces/active")
                .then()
                .statusCode(403);
    }

    @Test
    public void shouldInviteUserToWorkspace() {
        // Arrange
        String email = "test@imob.com";
        String inviteeEmail = "invitee@imob.com";

        WorkspaceEntity workspace = new WorkspaceEntity();
        workspace.setId("workspace_test");
        workspace.setName("Test Workspace");

        Mockito.when(this.repository.getWorkspace("workspace_test"))
                .thenReturn(workspace);

        Map<String, Object> payload = Map.of(
                "email", inviteeEmail,
                "role", "ADMIN"
        );

        // Act & Assert
        given()
                .header("X-User-Email", email)
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/api/workspaces/invite")
                .then()
                .statusCode(200);

        Mockito.verify(this.repository, Mockito.times(1))
                .saveUserWorkspaceRelation(Mockito.any(UserWorkspaceRelationEntity.class));
    }

    @Test
    public void shouldDenyMemberFromInviting() {
        // Arrange
        String email = "member@imob.com";
        String inviteeEmail = "invitee@imob.com";

        UserWorkspaceRelationEntity memberRel = new UserWorkspaceRelationEntity();
        memberRel.setEmail(email);
        memberRel.setWorkspaceId("workspace_test");
        memberRel.setRole("MEMBER");

        Mockito.when(this.repository.getUserWorkspaceRelation(email, "workspace_test"))
                .thenReturn(memberRel);

        Map<String, Object> payload = Map.of(
                "email", inviteeEmail
        );

        // Act & Assert
        given()
                .header("X-User-Email", email)
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/api/workspaces/invite")
                .then()
                .statusCode(403);
    }

    @Test
    public void shouldAllowAdminToRemoveMemberButDenyRemovingOwner() {
        // Arrange
        String adminEmail = "admin@imob.com";
        String memberEmail = "member@imob.com";
        String ownerEmail = "test@imob.com";

        UserWorkspaceRelationEntity adminRel = new UserWorkspaceRelationEntity();
        adminRel.setEmail(adminEmail);
        adminRel.setWorkspaceId("workspace_test");
        adminRel.setRole("ADMIN");

        UserWorkspaceRelationEntity memberRel = new UserWorkspaceRelationEntity();
        memberRel.setEmail(memberEmail);
        memberRel.setWorkspaceId("workspace_test");
        memberRel.setRole("MEMBER");

        UserWorkspaceRelationEntity ownerRel = new UserWorkspaceRelationEntity();
        ownerRel.setEmail(ownerEmail);
        ownerRel.setWorkspaceId("workspace_test");
        ownerRel.setRole("OWNER");

        Mockito.when(this.repository.getUserWorkspaceRelation(adminEmail, "workspace_test"))
                .thenReturn(adminRel);
        Mockito.when(this.repository.getUserWorkspaceRelation(memberEmail, "workspace_test"))
                .thenReturn(memberRel);
        Mockito.when(this.repository.getUserWorkspaceRelation(ownerEmail, "workspace_test"))
                .thenReturn(ownerRel);

        // Act & Assert (Admin tenta remover Member - Permitido)
        given()
                .header("X-User-Email", adminEmail)
                .when()
                .delete("/api/workspaces/members/" + memberEmail)
                .then()
                .statusCode(204);

        Mockito.verify(this.repository, Mockito.times(1))
                .deleteUserWorkspaceRelation(memberEmail, "workspace_test");

        // Act & Assert (Admin tenta remover Owner - Proibido)
        given()
                .header("X-User-Email", adminEmail)
                .when()
                .delete("/api/workspaces/members/" + ownerEmail)
                .then()
                .statusCode(403);
    }
}
