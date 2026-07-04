package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@RegisterForReflection
public class WorkspaceResponse {
    private String workspaceId;
    private String workspaceName;
    private String role;
    private String joinedAt;
    private boolean active;
}
