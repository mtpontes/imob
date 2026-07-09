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
public class UserWorkspaceRelationEntity {
    private String email;
    private String workspaceId;
    private String role;
    private String joinedAt;
    private String workspaceName; // cache para evitar query adicional ao listar

    public Map<String, AttributeValue> toAttributeMap() {
        Map<String, AttributeValue> map = new HashMap<>();
        map.put("email", AttributeValue.builder().s(this.email).build());
        map.put("workspaceId", AttributeValue.builder().s(this.workspaceId).build());
        map.put("role", AttributeValue.builder().s(this.role != null ? this.role : "MEMBER").build());
        map.put("joinedAt", AttributeValue.builder().s(this.joinedAt != null ? this.joinedAt : "").build());
        map.put("workspaceName", AttributeValue.builder().s(this.workspaceName != null ? this.workspaceName : "").build());
        return map;
    }

    public static UserWorkspaceRelationEntity fromAttributeMap(Map<String, AttributeValue> map) {
        if (map == null || map.isEmpty())
            return null;

        UserWorkspaceRelationEntity entity = new UserWorkspaceRelationEntity();
        entity.setEmail(map.get("email").s());
        entity.setWorkspaceId(map.get("workspaceId").s());
        if (map.containsKey("role")) 
            entity.setRole(map.get("role").s());

        if (map.containsKey("joinedAt")) 
            entity.setJoinedAt(map.get("joinedAt").s());

        if (map.containsKey("workspaceName")) 
            entity.setWorkspaceName(map.get("workspaceName").s());

        return entity;
    }
}
