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
public class WorkspaceEntity {
    private String id;
    private String name;
    private String ownerEmail;

    public Map<String, AttributeValue> toAttributeMap() {
        Map<String, AttributeValue> map = new HashMap<>();
        map.put("id", AttributeValue.builder().s(this.id).build());
        map.put("name", AttributeValue.builder().s(this.name != null ? this.name : "").build());
        map.put("ownerEmail", AttributeValue.builder().s(this.ownerEmail != null ? this.ownerEmail : "").build());
        return map;
    }

    public static WorkspaceEntity fromAttributeMap(Map<String, AttributeValue> map) {
        if (map == null || map.isEmpty())
            return null;

        WorkspaceEntity entity = new WorkspaceEntity();
        entity.setId(map.get("id").s());
        if (map.containsKey("name")) 
            entity.setName(map.get("name").s());

        if (map.containsKey("ownerEmail")) 
            entity.setOwnerEmail(map.get("ownerEmail").s());

        return entity;
    }
}
