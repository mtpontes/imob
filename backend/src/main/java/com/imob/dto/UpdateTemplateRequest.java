package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.List;

@RegisterForReflection
public class UpdateTemplateRequest {
    private List<CriteriaDTO> criteria;
    private boolean newVersion;

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
}
