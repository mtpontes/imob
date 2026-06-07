package com.imob.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;

@RegisterForReflection
public class CriteriaDTO {
    private String id;
    private String label;
    private String type; // text | bool | range

    @JsonProperty("isScorable")
    private boolean isScorable;

    private double weight;
    private Double min;
    private Double max;

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getLabel() {
        return this.label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }

    @JsonProperty("isScorable")
    public boolean isScorable() {
        return this.isScorable;
    }

    @JsonProperty("isScorable")
    public void setScorable(boolean scorable) {
        this.isScorable = scorable;
    }

    public double getWeight() {
        return this.weight;
    }

    public void setWeight(double weight) {
        this.weight = weight;
    }

    public Double getMin() {
        return this.min;
    }

    public void setMin(Double min) {
        this.min = min;
    }

    public Double getMax() {
        return this.max;
    }

    public void setMax(Double max) {
        this.max = max;
    }
}
