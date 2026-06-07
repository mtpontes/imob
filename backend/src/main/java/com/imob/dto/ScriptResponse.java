package com.imob.dto;
import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.List;
@RegisterForReflection
public class ScriptResponse {
    private String id;
    private int version;
    private boolean isActive;
    private String createdAt;
    private List<CriteriaDTO> criteria;
    private String name;
    public String getName() {
        return this.name;
    }
    public void setName(String name) {
        this.name = name;
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
    @com.fasterxml.jackson.annotation.JsonProperty("isActive")
    public boolean isActive() {
        return this.isActive;
    }
    @com.fasterxml.jackson.annotation.JsonProperty("isActive")
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
}
