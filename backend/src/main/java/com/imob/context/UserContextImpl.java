package com.imob.context;

import jakarta.enterprise.context.RequestScoped;
import io.quarkus.runtime.annotations.RegisterForReflection;

@RequestScoped
@RegisterForReflection
public class UserContextImpl implements UserContext {
    private String email;
    private String workspaceId;

    @Override
    public String getEmail() {
        return this.email;
    }

    @Override
    public String getWorkspaceId() {
        return this.workspaceId;
    }

    @Override
    public void setEmail(String email) {
        this.email = email;
    }

    @Override
    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }
}
