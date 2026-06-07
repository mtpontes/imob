package com.imob.dto;
import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.List;
@RegisterForReflection
public class CreateScriptRequest {
    private List<CriteriaDTO> criteria;
    private String name;
    public List<CriteriaDTO> getCriteria() {
        return this.criteria;
    }
    public void setCriteria(List<CriteriaDTO> criteria) {
        this.criteria = criteria;
    }
    public String getName() {
        return this.name;
    }
    public void setName(String name) {
        this.name = name;
    }
}
