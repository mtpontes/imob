package com.imob.context;

public interface UserContext {
    String getEmail();
    String getWorkspaceId();
    void setEmail(String email);
    void setWorkspaceId(String workspaceId);
}
