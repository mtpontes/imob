package com.imob.entity;

import io.quarkus.runtime.annotations.RegisterForReflection;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import java.util.HashMap;
import java.util.Map;

@RegisterForReflection
public class UserProfileEntity {
    private String email;
    private String workspaceId;

    public String getEmail() {
        return this.email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getWorkspaceId() {
        return this.workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public Map<String, AttributeValue> toAttributeMap() {
        Map<String, AttributeValue> map = new HashMap<>();
        map.put("PK", AttributeValue.builder().s("USER#" + this.email).build());
        map.put("SK", AttributeValue.builder().s("PROFILE").build());
        map.put("workspaceId", AttributeValue.builder().s(this.workspaceId).build());
        return map;
    }

    public static UserProfileEntity fromAttributeMap(Map<String, AttributeValue> map) {
        if (map == null || map.isEmpty()) 
            return null;
        var entity = new UserProfileEntity();
        var pk = map.get("PK").s();
        entity.setEmail(pk.substring("USER#".length()));
        entity.setWorkspaceId(map.get("workspaceId").s());
        return entity;
    }
}
