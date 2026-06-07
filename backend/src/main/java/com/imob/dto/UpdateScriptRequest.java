package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
@RegisterForReflection
public class UpdateScriptRequest {
    private List<CriteriaDTO> criteria;
    private boolean newVersion;
    private String name;
}
