package com.imob.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
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
}
