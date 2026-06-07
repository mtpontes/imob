package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.List;
import java.util.Map;

@RegisterForReflection
public class CreateEvaluationRequest {
    private String propertyId;
    private String scriptId;
    private int scriptVersion;
    private String notes;
    private List<String> mediaKeys;
    private Map<String, Object> answers;

    public String getPropertyId() {
        return this.propertyId;
    }

    public void setPropertyId(String propertyId) {
        this.propertyId = propertyId;
    }

    public String getScriptId() {
        return this.scriptId;
    }

    public void setScriptId(String scriptId) {
        this.scriptId = scriptId;
    }

    public int getScriptVersion() {
        return this.scriptVersion;
    }

    public void setScriptVersion(int scriptVersion) {
        this.scriptVersion = scriptVersion;
    }

    public String getNotes() {
        return this.notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public List<String> getMediaKeys() {
        return this.mediaKeys;
    }

    public void setMediaKeys(List<String> mediaKeys) {
        this.mediaKeys = mediaKeys;
    }

    public Map<String, Object> getAnswers() {
        return this.answers;
    }

    public void setAnswers(Map<String, Object> answers) {
        this.answers = answers;
    }
}
