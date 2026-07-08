package com.imob.entity;

import io.quarkus.runtime.annotations.RegisterForReflection;
import lombok.Getter;
import lombok.Setter;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
@RegisterForReflection
public class InviteEntity {

    private String token;
    private String workspaceId;
    private String workspaceName;
    private String role;
    private String createdByEmail;
    private long expiresAt;

    public Map<String, AttributeValue> toAttributeMap() {
        Map<String, AttributeValue> map = new HashMap<>();
        map.put("PK", AttributeValue.builder().s("INVITE#" + this.token).build());
        map.put("SK", AttributeValue.builder().s("METADATA").build());
        map.put("token", AttributeValue.builder().s(this.token).build());
        map.put("workspaceId", AttributeValue.builder().s(this.workspaceId).build());
        map.put("workspaceName", AttributeValue.builder().s(this.workspaceName != null ? this.workspaceName : "").build());
        map.put("role", AttributeValue.builder().s(this.role).build());
        map.put("createdByEmail", AttributeValue.builder().s(this.createdByEmail).build());
        map.put("expiresAt", AttributeValue.builder().n(String.valueOf(this.expiresAt)).build());
        return map;
    }

    public static InviteEntity fromAttributeMap(Map<String, AttributeValue> map) {
        if (map == null || map.isEmpty())
            return null;

        InviteEntity entity = new InviteEntity();
        String pk = map.get("PK").s();
        entity.setToken(pk.substring("INVITE#".length()));

        if (map.containsKey("workspaceId"))
            entity.setWorkspaceId(map.get("workspaceId").s());

        if (map.containsKey("workspaceName"))
            entity.setWorkspaceName(map.get("workspaceName").s());

        if (map.containsKey("role"))
            entity.setRole(map.get("role").s());

        if (map.containsKey("createdByEmail"))
            entity.setCreatedByEmail(map.get("createdByEmail").s());

        if (map.containsKey("expiresAt"))
            entity.setExpiresAt(Long.parseLong(map.get("expiresAt").n()));

        return entity;
    }
}
