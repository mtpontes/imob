package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;

@RegisterForReflection
public class GenerateUploadUrlRequest {
    private String fileName;

    public String getFileName() {
        return this.fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }
}
