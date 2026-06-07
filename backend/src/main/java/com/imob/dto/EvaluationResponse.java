package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.List;
import java.util.Map;

@RegisterForReflection
public class EvaluationResponse {
    private String propertyId;
    private String createdAt;
    private String scriptId;
    private int scriptVersion;
    private double finalScore;
    private String notes;
    private List<String> mediaUrls;
    private Map<String, Object> answers;

    public String getPropertyId() {
        return this.propertyId;
    }

    public void setPropertyId(String propertyId) {
        this.propertyId = propertyId;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
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

    public double getFinalScore() {
        return this.finalScore;
    }

    public void setFinalScore(double finalScore) {
        this.finalScore = finalScore;
    }

    public String getNotes() {
        return this.notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public List<String> getMediaUrls() {
        return this.mediaUrls;
    }

    public void setMediaUrls(List<String> mediaUrls) {
        this.mediaUrls = mediaUrls;
    }

    public Map<String, Object> getAnswers() {
        return this.answers;
    }

    public void setAnswers(Map<String, Object> answers) {
        this.answers = answers;
    }
}
