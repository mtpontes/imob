package com.imob.filter;

import com.imob.context.UserContext;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

@QuarkusTest
public class AuthFilterTest {

    @InjectMock
    DynamoDbClient dynamoDbClient;

    @Path("/api/test-auth")
    public static class FakeResource {
        private final UserContext userContext;

        public FakeResource(UserContext userContext) {
            this.userContext = userContext;
        }

        @GET
        @Produces(MediaType.APPLICATION_JSON)
        public Response get() {
            return Response.ok(Map.of(
                    "email", this.userContext.getEmail(),
                    "workspaceId", this.userContext.getWorkspaceId()
            )).build();
        }
    }

    @Path("/public/test-no-auth")
    public static class FakePublicResource {
        @GET
        @Produces(MediaType.APPLICATION_JSON)
        public Response get() {
            return Response.ok(Map.of("status", "ok")).build();
        }
    }

    @Test
    public void shouldAllowCorsPreflightOptionsRequests() {
        // Arrange
        // Nao ha necessidade de mockar ou configurar headers complexos

        // Act & Assert
        given()
                .when()
                .options("/api/test-auth")
                .then()
                .statusCode(200);
    }

    @Test
    public void shouldIgnoreRequestsOutsideApiNamespace() {
        // Arrange
        // Endpoint publico que nao começa com /api/

        // Act & Assert
        given()
                .when()
                .get("/public/test-no-auth")
                .then()
                .statusCode(200)
                .body("status", is("ok"));
    }

    @Test
    public void shouldRejectRequestWithoutAuthHeaders() {
        // Arrange
        // Requisicao direta sem headers de autenticacao

        // Act & Assert
        given()
                .when()
                .get("/api/test-auth")
                .then()
                .statusCode(401)
                .contentType(ContentType.JSON)
                .body("error", is("Token de autenticacao ausente ou invalido"));
    }

    @Test
    public void shouldRejectRequestWithMalformedJwt() {
        // Arrange
        String tokenInvalido = "Bearer algo.invalido.assinatura";

        // Act & Assert
        given()
                .header("Authorization", tokenInvalido)
                .when()
                .get("/api/test-auth")
                .then()
                .statusCode(401)
                .contentType(ContentType.JSON)
                .body("error", is("Token de autenticacao ausente ou invalido"));
    }

    @Test
    public void shouldResolveWorkspaceForExistingProfile() {
        // Arrange
        String email = "existente@imob.com";
        String workspaceId = "workspace_existente_123";
        
        GetItemResponse getItemResponse = GetItemResponse.builder()
                .item(Map.of(
                        "PK", AttributeValue.builder().s("USER#" + email).build(),
                        "SK", AttributeValue.builder().s("PROFILE").build(),
                        "workspaceId", AttributeValue.builder().s(workspaceId).build()
                ))
                .build();

        Mockito.when(this.dynamoDbClient.getItem(Mockito.any(GetItemRequest.class)))
                .thenReturn(getItemResponse);

        // Act & Assert
        given()
                .header("X-User-Email", email)
                .when()
                .get("/api/test-auth")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("email", is(email))
                .body("workspaceId", is(workspaceId));

        Mockito.verify(this.dynamoDbClient, Mockito.times(1))
                .getItem(Mockito.any(GetItemRequest.class));
    }

    @Test
    public void shouldAutoProvisionWorkspaceForNewProfile() {
        // Arrange
        String email = "novo@imob.com";
        
        GetItemResponse getItemResponse = GetItemResponse.builder()
                .item(Map.of())
                .build();

        Mockito.when(this.dynamoDbClient.getItem(Mockito.any(GetItemRequest.class)))
                .thenReturn(getItemResponse);

        // Act & Assert
        given()
                .header("X-User-Email", email)
                .when()
                .get("/api/test-auth")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("email", is(email))
                .body("workspaceId", org.hamcrest.Matchers.startsWith("workspace_"));

        Mockito.verify(this.dynamoDbClient, Mockito.times(1))
                .getItem(Mockito.any(GetItemRequest.class));
        Mockito.verify(this.dynamoDbClient, Mockito.times(1))
                .putItem(Mockito.any(PutItemRequest.class));
    }

    @Test
    public void shouldAbortWithUnauthorizedWhenDynamoDbFails() {
        // Arrange
        String email = "erro@imob.com";
        
        Mockito.when(this.dynamoDbClient.getItem(Mockito.any(GetItemRequest.class)))
                .thenThrow(software.amazon.awssdk.core.exception.SdkClientException.create("Erro simulado do DynamoDB"));

        // Act & Assert
        given()
                .header("X-User-Email", email)
                .when()
                .get("/api/test-auth")
                .then()
                .statusCode(401)
                .contentType(ContentType.JSON)
                .body("error", is("Token de autenticacao ausente ou invalido"));
    }

    @Test
    public void shouldCacheWorkspaceIdForConsecutiveRequests() {
        // Arrange
        String email = "cache-test@imob.com";
        String workspaceId = "workspace_cached_abc";

        GetItemResponse getItemResponse = GetItemResponse.builder()
                .item(Map.of(
                        "PK", AttributeValue.builder().s("USER#" + email).build(),
                        "SK", AttributeValue.builder().s("PROFILE").build(),
                        "workspaceId", AttributeValue.builder().s(workspaceId).build()
                ))
                .build();

        Mockito.when(this.dynamoDbClient.getItem(Mockito.any(GetItemRequest.class)))
                .thenReturn(getItemResponse);

        // Act & Assert
        given()
                .header("X-User-Email", email)
                .when()
                .get("/api/test-auth")
                .then()
                .statusCode(200)
                .body("workspaceId", is(workspaceId));

        given()
                .header("X-User-Email", email)
                .when()
                .get("/api/test-auth")
                .then()
                .statusCode(200)
                .body("workspaceId", is(workspaceId));

        Mockito.verify(this.dynamoDbClient, Mockito.times(1))
                .getItem(Mockito.any(GetItemRequest.class));
    }
}
