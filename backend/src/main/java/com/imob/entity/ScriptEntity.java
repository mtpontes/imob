package com.imob.entity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.imob.dto.CriteriaDTO;
import io.quarkus.runtime.annotations.RegisterForReflection;
import lombok.Getter;
import lombok.Setter;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@RegisterForReflection
public class ScriptEntity {
    private String workspaceId;
    private String id;
    private int version;
    private boolean isActive;
    private String createdAt;
    private List<CriteriaDTO> criteria;
    private String name;

    private static final ObjectMapper objectMapper = new ObjectMapper();
    public Map<String, AttributeValue> toAttributeMap() {
        Map<String, AttributeValue> map = new HashMap<>();
        map.put("PK", AttributeValue.builder().s("WORKSPACE#" + this.workspaceId).build());
        map.put("SK", AttributeValue.builder().s("SCRIPT#" + this.id + "#v" + this.version).build());
        map.put("id", AttributeValue.builder().s(this.id).build());
        map.put("version", AttributeValue.builder().n(String.valueOf(this.version)).build());
        map.put("isActive", AttributeValue.builder().bool(this.isActive).build());
        map.put("createdAt", AttributeValue.builder().s(this.createdAt).build());
        map.put("name", AttributeValue.builder().s(this.name != null ? this.name : "").build());
        try {
            String json = objectMapper.writeValueAsString(this.criteria);
            map.put("criteria", AttributeValue.builder().s(json).build());
        } catch (Exception e) {
            map.put("criteria", AttributeValue.builder().s("[]").build());
        }
        return map;
    }
    public static ScriptEntity fromAttributeMap(Map<String, AttributeValue> map) {
        if (map == null || map.isEmpty()) 
            return null;
        ScriptEntity entity = new ScriptEntity();
        
        String pk = map.get("PK").s();
        entity.setWorkspaceId(pk.substring("WORKSPACE#".length()));
        entity.setId(map.get("id").s());
        entity.setVersion(Integer.parseInt(map.get("version").n()));
        entity.setActive(map.get("isActive").bool());
        entity.setCreatedAt(map.get("createdAt").s());
        if (map.containsKey("name")) {
            entity.setName(map.get("name").s());
        }
        if (map.containsKey("criteria")) {
            try {
                String json = map.get("criteria").s();
                List<CriteriaDTO> list = objectMapper.readValue(json, new TypeReference<List<CriteriaDTO>>() {});
                entity.setCriteria(list);
            } catch (Exception e) {
                entity.setCriteria(List.of());
            }
        } else {
            entity.setCriteria(List.of());
        }
        return entity;
    }
}
