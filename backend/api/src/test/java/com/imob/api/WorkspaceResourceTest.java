package com.imob.api;

import com.imob.entity.WorkspaceEntity;
import com.imob.entity.UserWorkspaceRelationEntity;
import com.imob.entity.InviteEntity;
import com.imob.repository.WorkspaceRepository;
import com.imob.repository.InviteRepository;
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

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.CoreMatchers.notNullValue;

@QuarkusTest
public class WorkspaceResourceTest {

    @InjectMock
    WorkspaceRepository repository;

    @InjectMock
    InviteRepository inviteRepository;

    @InjectMock
    DynamoDbClient dynamoDbClient;

    @BeforeEach
    public void setup() {
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
        String email = "test@imob.com";
        Map<String, Object> payload = Map.of(
                "name", "Novo Workspace"
        );

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
        String email = "test@imob.com";
        UserWorkspaceRelationEntity rel1 = new UserWorkspaceRelationEntity();
        rel1.setEmail(email);
        rel1.setWorkspaceId("workspace_other");

        Mockito.when(this.repository.getUserWorkspaceRelations(email))
                .thenReturn(List.of(rel1));

        Map<String, Object> payload = Map.of(
                "workspaceId", "workspace_other"
        );

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
        String email = "test@imob.com";
        UserWorkspaceRelationEntity rel1 = new UserWorkspaceRelationEntity();
        rel1.setEmail(email);
        rel1.setWorkspaceId("workspace_test");

        Mockito.when(this.repository.getUserWorkspaceRelations(email))
                .thenReturn(List.of(rel1));

        Map<String, Object> payload = Map.of(
                "workspaceId", "workspace_non_existent"
        );

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
    public void shouldCreateInviteToWorkspace() {
        String email = "test@imob.com";

        WorkspaceEntity workspace = new WorkspaceEntity();
        workspace.setId("workspace_test");
        workspace.setName("Test Workspace");

        Mockito.when(this.repository.getWorkspace("workspace_test"))
                .thenReturn(workspace);

        Map<String, Object> payload = Map.of(
                "role", "ADMIN"
        );

        given()
                .header("X-User-Email", email)
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/api/workspaces/invite")
                .then()
                .statusCode(201)
                .body("token", notNullValue())
                .body("inviteUrl", notNullValue())
                .body("role", is("ADMIN"))
                .body("workspaceName", is("Test Workspace"));

        Mockito.verify(this.inviteRepository, Mockito.times(1))
                .saveInvite(Mockito.any(InviteEntity.class));
    }

    @Test
    public void shouldDenyMemberFromInviting() {
        String email = "member@imob.com";

        UserWorkspaceRelationEntity memberRel = new UserWorkspaceRelationEntity();
        memberRel.setEmail(email);
        memberRel.setWorkspaceId("workspace_test");
        memberRel.setRole("MEMBER");

        Mockito.when(this.repository.getUserWorkspaceRelation(email, "workspace_test"))
                .thenReturn(memberRel);

        Map<String, Object> payload = Map.of(
                "role", "MEMBER"
        );

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
    public void shouldGetInviteDetails() {
        String token = "invite-token-123";
        InviteEntity invite = new InviteEntity();
        invite.setToken(token);
        invite.setWorkspaceId("workspace_test");
        invite.setWorkspaceName("Test Workspace");
        invite.setRole("MEMBER");
        invite.setExpiresAt(Instant.now().getEpochSecond() + 3600);

        Mockito.when(this.inviteRepository.getInvite(token))
                .thenReturn(invite);

        given()
                .header("X-User-Email", "test@imob.com")
                .when()
                .get("/api/workspaces/invite/" + token)
                .then()
                .statusCode(200)
                .body("workspaceName", is("Test Workspace"))
                .body("role", is("MEMBER"));
    }

    @Test
    public void shouldAcceptInvite() {
        String token = "invite-token-123";
        String email = "newuser@imob.com";

        InviteEntity invite = new InviteEntity();
        invite.setToken(token);
        invite.setWorkspaceId("workspace_test");
        invite.setWorkspaceName("Test Workspace");
        invite.setRole("MEMBER");
        invite.setExpiresAt(Instant.now().getEpochSecond() + 3600);

        Mockito.when(this.inviteRepository.getInvite(token))
                .thenReturn(invite);

        Mockito.when(this.repository.getUserWorkspaceRelation(email, "workspace_test"))
                .thenReturn(null);

        given()
                .header("X-User-Email", email)
                .contentType(ContentType.JSON)
                .when()
                .post("/api/workspaces/invite/" + token + "/accept")
                .then()
                .statusCode(200)
                .body("workspaceId", is("workspace_test"))
                .body("role", is("MEMBER"));

        Mockito.verify(this.repository, Mockito.times(1))
                .saveUserWorkspaceRelation(Mockito.any(UserWorkspaceRelationEntity.class));
        Mockito.verify(this.inviteRepository, Mockito.times(1))
                .deleteInvite(token);
    }

    @Test
    public void shouldReturnConflictWhenAcceptingInviteAndUserIsAlreadyMember() {
        String token = "invite-token-123";
        String email = "existing@imob.com";

        InviteEntity invite = new InviteEntity();
        invite.setToken(token);
        invite.setWorkspaceId("workspace_test");
        invite.setWorkspaceName("Test Workspace");
        invite.setRole("MEMBER");
        invite.setExpiresAt(Instant.now().getEpochSecond() + 3600);

        Mockito.when(this.inviteRepository.getInvite(token))
                .thenReturn(invite);

        UserWorkspaceRelationEntity existingRel = new UserWorkspaceRelationEntity();
        existingRel.setEmail(email);
        existingRel.setWorkspaceId("workspace_test");
        existingRel.setRole("MEMBER");

        Mockito.when(this.repository.getUserWorkspaceRelation(email, "workspace_test"))
                .thenReturn(existingRel);

        given()
                .header("X-User-Email", email)
                .contentType(ContentType.JSON)
                .when()
                .post("/api/workspaces/invite/" + token + "/accept")
                .then()
                .statusCode(409);
    }

    @Test
    public void shouldReturnGoneWhenInviteIsExpired() {
        String token = "expired-token";
        InviteEntity invite = new InviteEntity();
        invite.setToken(token);
        invite.setWorkspaceId("workspace_test");
        invite.setWorkspaceName("Test Workspace");
        invite.setRole("MEMBER");
        invite.setExpiresAt(Instant.now().getEpochSecond() - 3600);

        Mockito.when(this.inviteRepository.getInvite(token))
                .thenReturn(invite);

        given()
                .header("X-User-Email", "test@imob.com")
                .when()
                .get("/api/workspaces/invite/" + token)
                .then()
                .statusCode(410);

        given()
                .header("X-User-Email", "test@imob.com")
                .contentType(ContentType.JSON)
                .when()
                .post("/api/workspaces/invite/" + token + "/accept")
                .then()
                .statusCode(410);
    }

    @Test
    public void shouldAllowAdminToRemoveMemberButDenyRemovingOwner() {
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

        given()
                .header("X-User-Email", adminEmail)
                .when()
                .delete("/api/workspaces/members/" + memberEmail)
                .then()
                .statusCode(204);

        Mockito.verify(this.repository, Mockito.times(1))
                .deleteUserWorkspaceRelation(memberEmail, "workspace_test");

        given()
                .header("X-User-Email", adminEmail)
                .when()
                .delete("/api/workspaces/members/" + ownerEmail)
                .then()
                .statusCode(403);
    }
}
