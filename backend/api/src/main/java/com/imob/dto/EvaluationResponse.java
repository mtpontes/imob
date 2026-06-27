package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import lombok.Getter;
import lombok.Setter;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@RegisterForReflection
public class EvaluationResponse {
    private String propertyId;
    private String createdAt;
    private String scriptId;

    private String notes;
    private List<String> mediaUrls; // Mantido por retrocompatibilidade se necessario, mas sera obsoleto
    private List<MediaItemDto> mediaItems;
    private List<String> mediaKeys;
    private Map<String, Object> answers;
}
