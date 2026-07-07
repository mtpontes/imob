package com.imob.filter;

import jakarta.enterprise.context.ApplicationScoped;
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

@ApplicationScoped
@Provider
@PreMatching
@Priority(Priorities.AUTHENTICATION)
@RegisterForReflection
public class AuthFilter implements ContainerRequestFilter {

    private static final Logger LOG = Logger.getLogger(AuthFilter.class);

    private static final int MAX_CACHE_SIZE = 10000;
    private final Map<String, CacheEntry> cache = new java.util.concurrent.ConcurrentHashMap<>();

    private final UserContext userContext;
    private final DynamoDbClient dynamoDb;

    private static class CacheEntry {
        private final String workspaceId;
        private final long expiresAt;

        public CacheEntry(String workspaceId, long expiresAt) {
            this.workspaceId = workspaceId;
            this.expiresAt = expiresAt;
        }

        public String getWorkspaceId() {
            return this.workspaceId;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() > this.expiresAt;
        }
    }

    public AuthFilter(UserContext userContext, DynamoDbClient dynamoDb) {
        this.userContext = userContext;
        this.dynamoDb = dynamoDb;
    }

    public void invalidateCache(String email) {
        if (email != null) this.cache.remove(email);
    }

    private String getTableName() {
        return org.eclipse.microprofile.config.ConfigProvider.getConfig()
                .getValue("imob.table.name", String.class);
    }

    private boolean isMockAuth() {
        return org.eclipse.microprofile.config.ConfigProvider.getConfig()
                .getOptionalValue("imob.mock.auth", Boolean.class)
                .orElse(false);
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
            if (this.isMockAuth()) 
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
        CacheEntry entry = this.cache.get(email);
        if (entry != null && !entry.isExpired())
            return entry.getWorkspaceId();

        String workspaceId = this.resolveWorkspaceIdFromDb(email);

        if (this.cache.size() >= MAX_CACHE_SIZE)
            this.cache.clear();

        long expiresAt = System.currentTimeMillis() + (5 * 60 * 1000);
        this.cache.put(email, new CacheEntry(workspaceId, expiresAt));

        return workspaceId;
    }

    private String resolveWorkspaceIdFromDb(String email) {
        String pk = "USER#" + email;
        String sk = "PROFILE";

        Map<String, AttributeValue> key = new HashMap<>();
        key.put("PK", AttributeValue.builder().s(pk).build());
        key.put("SK", AttributeValue.builder().s(sk).build());

        GetItemRequest getReq = GetItemRequest.builder()
                .tableName(this.getTableName())
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
        String domain = email.contains("@") ? email.split("@")[1] : "";
        String workspaceName = "Workspace Principal";
        if (!domain.isBlank()) {
            String name = domain.split("\\.")[0];
            workspaceName = name.substring(0, 1).toUpperCase() + name.substring(1) + " Workspace";
        }

        // 1. Cria o perfil
        Map<String, AttributeValue> newItem = new HashMap<>();
        newItem.put("PK", AttributeValue.builder().s(pk).build());
        newItem.put("SK", AttributeValue.builder().s(sk).build());
        newItem.put("workspaceId", AttributeValue.builder().s(newWorkspaceId).build());

        PutItemRequest putProfile = PutItemRequest.builder()
                .tableName(this.getTableName())
                .item(newItem)
                .build();
        this.dynamoDb.putItem(putProfile);

        // 2. Cria os metadados do Workspace
        Map<String, AttributeValue> workspaceMetadata = new HashMap<>();
        workspaceMetadata.put("PK", AttributeValue.builder().s("WORKSPACE#" + newWorkspaceId).build());
        workspaceMetadata.put("SK", AttributeValue.builder().s("METADATA").build());
        workspaceMetadata.put("id", AttributeValue.builder().s(newWorkspaceId).build());
        workspaceMetadata.put("name", AttributeValue.builder().s(workspaceName).build());
        workspaceMetadata.put("ownerEmail", AttributeValue.builder().s(email).build());

        PutItemRequest putWorkspace = PutItemRequest.builder()
                .tableName(this.getTableName())
                .item(workspaceMetadata)
                .build();
        this.dynamoDb.putItem(putWorkspace);

        // 3. Cria a relacao de vinculo
        Map<String, AttributeValue> relation = new HashMap<>();
        relation.put("PK", AttributeValue.builder().s("USER#" + email).build());
        relation.put("SK", AttributeValue.builder().s("WORKSPACE#" + newWorkspaceId).build());
        relation.put("email", AttributeValue.builder().s(email).build());
        relation.put("workspaceId", AttributeValue.builder().s(newWorkspaceId).build());
        relation.put("role", AttributeValue.builder().s("OWNER").build());
        relation.put("joinedAt", AttributeValue.builder().s(java.time.Instant.now().toString()).build());
        relation.put("workspaceName", AttributeValue.builder().s(workspaceName).build());

        PutItemRequest putRelation = PutItemRequest.builder()
                .tableName(this.getTableName())
                .item(relation)
                .build();
        this.dynamoDb.putItem(putRelation);

        return newWorkspaceId;
    }
}
