package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
@RegisterForReflection
public class ScriptResponse {
    private String id;
    private int version;

    @com.fasterxml.jackson.annotation.JsonProperty("isActive")
    private boolean isActive;

    private String createdAt;
    private List<CriteriaDTO> criteria;
    private String name;
}
