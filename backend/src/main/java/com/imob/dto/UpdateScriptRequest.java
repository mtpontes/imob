package com.imob.dto;
import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.List;
@RegisterForReflection
public class UpdateScriptRequest {
    private List<CriteriaDTO> criteria;
    private boolean newVersion;
    private String name;
    public List<CriteriaDTO> getCriteria() {
        return this.criteria;
    }
    public void setCriteria(List<CriteriaDTO> criteria) {
        this.criteria = criteria;
    }
    public boolean isNewVersion() {
        return this.newVersion;
    }
    public void setNewVersion(boolean newVersion) {
        this.newVersion = newVersion;
    }
    public String getName() {
        return this.name;
    }
    public void setName(String name) {
        this.name = name;
    }
}
