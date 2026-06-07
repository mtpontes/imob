package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.List;

@RegisterForReflection
public class CreateTemplateRequest {
    private List<CriteriaDTO> criteria;

    public List<CriteriaDTO> getCriteria() {
        return this.criteria;
    }

    public void setCriteria(List<CriteriaDTO> criteria) {
        this.criteria = criteria;
    }
}
