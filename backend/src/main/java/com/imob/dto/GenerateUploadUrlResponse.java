package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@RegisterForReflection
public class GenerateUploadUrlResponse {
    private String uploadUrl;
    private String s3Key;
}
