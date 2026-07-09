package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@RegisterForReflection
public class InviteResponse {
    private String token;
    private String inviteUrl;
    private String role;
    private String workspaceName;
    private long expiresAt;
}
