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
public class UserProfileEntity {
    private String email;
    private String workspaceId;

    public Map<String, AttributeValue> toAttributeMap() {
        Map<String, AttributeValue> map = new HashMap<>();
        map.put("email", AttributeValue.builder().s(this.email).build());
        map.put("workspaceId", AttributeValue.builder().s(this.workspaceId).build());
        return map;
    }

    public static UserProfileEntity fromAttributeMap(Map<String, AttributeValue> map) {
        if (map == null || map.isEmpty()) 
            return null;

        UserProfileEntity entity = new UserProfileEntity();
        entity.setEmail(map.get("email").s());
        entity.setWorkspaceId(map.get("workspaceId").s());
        return entity;
    }
}
