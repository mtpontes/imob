package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@RegisterForReflection
public class InviteDetailsResponse {
    private String workspaceName;
    private String role;
    private long expiresAt;
}
