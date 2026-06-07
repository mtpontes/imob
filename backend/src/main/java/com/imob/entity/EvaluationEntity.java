package com.imob.entity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.runtime.annotations.RegisterForReflection;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RegisterForReflection
public class EvaluationEntity {
    private String workspaceId;
    private String propertyId;
    private String createdAt;
    private String templateId;
    private int templateVersion;
    private double finalScore;
    private String notes;
    private List<String> mediaKeys;
    private Map<String, Object> answers;

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public String getWorkspaceId() {
        return this.workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public String getPropertyId() {
        return this.propertyId;
    }

    public void setPropertyId(String propertyId) {
        this.propertyId = propertyId;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getTemplateId() {
        return this.templateId;
    }

    public void setTemplateId(String templateId) {
        this.templateId = templateId;
    }

    public int getTemplateVersion() {
        return this.templateVersion;
    }

    public void setTemplateVersion(int templateVersion) {
        this.templateVersion = templateVersion;
    }

    public double getFinalScore() {
        return this.finalScore;
    }

    public void setFinalScore(double finalScore) {
        this.finalScore = finalScore;
    }

    public String getNotes() {
        return this.notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public List<String> getMediaKeys() {
        return this.mediaKeys;
    }

    public void setMediaKeys(List<String> mediaKeys) {
        this.mediaKeys = mediaKeys;
    }

    public Map<String, Object> getAnswers() {
        return this.answers;
    }

    public void setAnswers(Map<String, Object> answers) {
        this.answers = answers;
    }

    public Map<String, AttributeValue> toAttributeMap() {
        Map<String, AttributeValue> map = new HashMap<>();
        map.put("PK", AttributeValue.builder().s("WORKSPACE#" + this.workspaceId).build());
        map.put("SK", AttributeValue.builder().s("EVALUATION#" + this.propertyId + "#" + this.createdAt).build());
        map.put("propertyId", AttributeValue.builder().s(this.propertyId).build());
        map.put("createdAt", AttributeValue.builder().s(this.createdAt).build());
        map.put("templateId", AttributeValue.builder().s(this.templateId).build());
        map.put("templateVersion", AttributeValue.builder().n(String.valueOf(this.templateVersion)).build());
        map.put("finalScore", AttributeValue.builder().n(String.valueOf(this.finalScore)).build());
        if (this.notes != null) 
            map.put("notes", AttributeValue.builder().s(this.notes).build());

        try {
            var mediaKeysJson = objectMapper.writeValueAsString(this.mediaKeys);
            map.put("mediaKeys", AttributeValue.builder().s(mediaKeysJson).build());
        } catch (Exception e) {
            map.put("mediaKeys", AttributeValue.builder().s("[]").build());
        }

        try {
            var answersJson = objectMapper.writeValueAsString(this.answers);
            map.put("answers", AttributeValue.builder().s(answersJson).build());
        } catch (Exception e) {
            map.put("answers", AttributeValue.builder().s("{}").build());
        }

        return map;
    }

    public static EvaluationEntity fromAttributeMap(Map<String, AttributeValue> map) {
        if (map == null || map.isEmpty()) 
            return null;
        var entity = new EvaluationEntity();
        var pk = map.get("PK").s();
        entity.setWorkspaceId(pk.substring("WORKSPACE#".length()));
        entity.setPropertyId(map.get("propertyId").s());
        entity.setCreatedAt(map.get("createdAt").s());
        entity.setTemplateId(map.get("templateId").s());
        entity.setTemplateVersion(Integer.parseInt(map.get("templateVersion").n()));
        entity.setFinalScore(Double.parseDouble(map.get("finalScore").n()));
        if (map.containsKey("notes")) 
            entity.setNotes(map.get("notes").s());

        if (map.containsKey("mediaKeys")) {
            try {
                var json = map.get("mediaKeys").s();
                List<String> list = objectMapper.readValue(json, new TypeReference<List<String>>() {});
                entity.setMediaKeys(list);
            } catch (Exception e) {
                entity.setMediaKeys(List.of());
            }
        } else {
            entity.setMediaKeys(List.of());
        }

        if (map.containsKey("answers")) {
            try {
                var json = map.get("answers").s();
                Map<String, Object> answersMap = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
                entity.setAnswers(answersMap);
            } catch (Exception e) {
                entity.setAnswers(Map.of());
            }
        } else {
            entity.setAnswers(Map.of());
        }

        return entity;
    }
}
