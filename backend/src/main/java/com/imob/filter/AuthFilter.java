package com.imob.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.imob.context.UserContext;
import io.quarkus.runtime.annotations.RegisterForReflection;
import org.jboss.logging.Logger;
import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.PreMatching;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import com.fasterxml.jackson.databind.JsonNode;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Provider
@PreMatching
@Priority(Priorities.AUTHENTICATION)
@RegisterForReflection
public class AuthFilter implements ContainerRequestFilter {

    private static final Logger LOG = Logger.getLogger(AuthFilter.class);

    private final UserContext userContext;
    private final DynamoDbClient dynamoDb;
    private final String tableName;
    private final boolean mockAuth;

    public AuthFilter(UserContext userContext, DynamoDbClient dynamoDb, 
                      @ConfigProperty(name = "imob.table.name") String tableName,
                      @ConfigProperty(name = "imob.mock.auth", defaultValue = "false") boolean mockAuth) {
        this.userContext = userContext;
        this.dynamoDb = dynamoDb;
        this.tableName = tableName;
        this.mockAuth = mockAuth;
    }

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void filter(ContainerRequestContext requestContext) {
        String path = requestContext.getUriInfo().getPath();
        
        // Permite requisicoes OPTIONS de CORS passarem sem autenticacao
        if (requestContext.getMethod().equalsIgnoreCase("OPTIONS")) 
            return;

        // Apenas intercepta rotas /api/*
        if (!path.startsWith("api/") && !path.startsWith("/api/")) 
            return;

        String email = this.extractEmail(requestContext);
        if (email == null || email.isBlank()) {
            if (this.mockAuth) 
                email = "dev-user@imob.com";
            else {
                requestContext.abortWith(Response.status(Response.Status.UNAUTHORIZED)
                        .entity("{\"error\":\"Token de autenticacao ausente ou invalido\"}")
                        .type(jakarta.ws.rs.core.MediaType.APPLICATION_JSON)
                        .build());
                return;
            }
        }

        try {
            String workspaceId = this.resolveWorkspaceId(email);
            this.userContext.setEmail(email);
            this.userContext.setWorkspaceId(workspaceId);
        } catch (Exception e) {
            LOG.error("Erro ao resolver ou auto-provisionar WorkspaceId no DynamoDB", e);
            requestContext.abortWith(Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"error\":\"Token de autenticacao ausente ou invalido\"}")
                    .type(jakarta.ws.rs.core.MediaType.APPLICATION_JSON)
                    .build());
        }
    }

    private String extractEmail(ContainerRequestContext requestContext) {
        String devEmail = requestContext.getHeaderString("X-User-Email");
        if (devEmail != null && !devEmail.isBlank()) 
            return devEmail;
 
        String authHeader = requestContext.getHeaderString("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            String[] parts = token.split("\\.");
            if (parts.length >= 2) {
                try {
                    byte[] decodedBytes = Base64.getUrlDecoder().decode(parts[1]);
                    String payload = new String(decodedBytes, StandardCharsets.UTF_8);
                    JsonNode node = this.objectMapper.readTree(payload);
                    if (node.has("email")) 
                        return node.get("email").asText();
                } catch (Exception e) {
                    // Ignora falha de parseamento de token malformado
                }
            }
        }
        return null;
    }

    private String resolveWorkspaceId(String email) {
        String pk = "USER#" + email;
        String sk = "PROFILE";

        Map<String, AttributeValue> key = new HashMap<>();
        key.put("PK", AttributeValue.builder().s(pk).build());
        key.put("SK", AttributeValue.builder().s(sk).build());

        GetItemRequest getReq = GetItemRequest.builder()
                .tableName(this.tableName)
                .key(key)
                .build();

        GetItemResponse res = this.dynamoDb.getItem(getReq);
        if (res.hasItem()) {
            Map<String, AttributeValue> item = res.item();
            if (item.containsKey("workspaceId")) 
                return item.get("workspaceId").s();
        }

        // Se nao existir perfil cadastrado, auto-provisiona um WorkspaceId
        String newWorkspaceId = "workspace_" + UUID.randomUUID().toString();
        Map<String, AttributeValue> newItem = new HashMap<>();
        newItem.put("PK", AttributeValue.builder().s(pk).build());
        newItem.put("SK", AttributeValue.builder().s(sk).build());
        newItem.put("workspaceId", AttributeValue.builder().s(newWorkspaceId).build());

        PutItemRequest putReq = PutItemRequest.builder()
                .tableName(this.tableName)
                .item(newItem)
                .build();

        this.dynamoDb.putItem(putReq);
        return newWorkspaceId;
    }
}
