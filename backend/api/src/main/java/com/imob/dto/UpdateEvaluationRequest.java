package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import lombok.Getter;
import lombok.Setter;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@RegisterForReflection
public class UpdateEvaluationRequest {
    private String notes;
    private List<String> mediaKeys;
    private Map<String, Object> answers;
}
