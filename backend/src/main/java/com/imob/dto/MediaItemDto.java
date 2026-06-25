package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@RegisterForReflection
public class MediaItemDto {
    private String s3Key;
    private String originalUrl;
    private String thumbnailUrl;
    private String mediaType; // "IMAGE" ou "VIDEO"
}
