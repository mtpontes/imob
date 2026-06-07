package com.imob.entity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.imob.dto.CriteriaDTO;
import io.quarkus.runtime.annotations.RegisterForReflection;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RegisterForReflection
public class TemplateEntity {
    private String workspaceId;
    private String id;
    private int version;
    private boolean isActive;
    private String createdAt;
    private List<CriteriaDTO> criteria;

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public String getWorkspaceId() {
        return this.workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getVersion() {
        return this.version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public boolean isActive() {
        return this.isActive;
    }

    public void setActive(boolean active) {
        this.isActive = active;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public List<CriteriaDTO> getCriteria() {
        return this.criteria;
    }

    public void setCriteria(List<CriteriaDTO> criteria) {
        this.criteria = criteria;
    }

    public Map<String, AttributeValue> toAttributeMap() {
        Map<String, AttributeValue> map = new HashMap<>();
        map.put("PK", AttributeValue.builder().s("WORKSPACE#" + this.workspaceId).build());
        map.put("SK", AttributeValue.builder().s("TEMPLATE#" + this.id + "#v" + this.version).build());
        map.put("id", AttributeValue.builder().s(this.id).build());
        map.put("version", AttributeValue.builder().n(String.valueOf(this.version)).build());
        map.put("isActive", AttributeValue.builder().bool(this.isActive).build());
        map.put("createdAt", AttributeValue.builder().s(this.createdAt).build());

        try {
            var json = objectMapper.writeValueAsString(this.criteria);
            map.put("criteria", AttributeValue.builder().s(json).build());
        } catch (Exception e) {
            map.put("criteria", AttributeValue.builder().s("[]").build());
        }

        return map;
    }

    public static TemplateEntity fromAttributeMap(Map<String, AttributeValue> map) {
        if (map == null || map.isEmpty()) 
            return null;
        var entity = new TemplateEntity();
        
        var pk = map.get("PK").s();
        entity.setWorkspaceId(pk.substring("WORKSPACE#".length()));
        entity.setId(map.get("id").s());
        entity.setVersion(Integer.parseInt(map.get("version").n()));
        entity.setActive(map.get("isActive").bool());
        entity.setCreatedAt(map.get("createdAt").s());

        if (map.containsKey("criteria")) {
            try {
                var json = map.get("criteria").s();
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
