package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;

@RegisterForReflection
public class GenerateUploadUrlResponse {
    private String uploadUrl;
    private String s3Key;

    public String getUploadUrl() {
        return this.uploadUrl;
    }

    public void setUploadUrl(String uploadUrl) {
        this.uploadUrl = uploadUrl;
    }

    public String getS3Key() {
        return this.s3Key;
    }

    public void setS3Key(String s3Key) {
        this.s3Key = s3Key;
    }
}
