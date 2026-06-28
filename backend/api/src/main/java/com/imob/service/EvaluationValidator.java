package com.imob.service;

import com.imob.dto.CriteriaDTO;
import com.imob.dto.CreateEvaluationRequest;
import com.imob.dto.UpdateEvaluationRequest;
import com.imob.entity.ScriptEntity;
import com.imob.exception.EvaluationErrorCode;
import com.imob.exception.EvaluationException;
import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Map;

@ApplicationScoped
@RegisterForReflection
public class EvaluationValidator {

    public void validate(CreateEvaluationRequest request, ScriptEntity script) {
        this.validateScript(script);
        this.validateAnswers(request.getAnswers(), script);
    }

    public void validate(UpdateEvaluationRequest request, ScriptEntity script) {
        if (script == null)
            throw new EvaluationException(EvaluationErrorCode.SCRIPT_NOT_FOUND_OR_INACTIVE);
        this.validateAnswers(request.getAnswers(), script);
    }

    public void validateUploadRequest(String fileName) {
        if (fileName == null || fileName.isBlank())
            throw new EvaluationException(EvaluationErrorCode.MISSING_FILE_NAME);
    }

    private void validateScript(ScriptEntity script) {
        if (script == null)
            throw new EvaluationException(EvaluationErrorCode.SCRIPT_NOT_FOUND_OR_INACTIVE);
    }

    private void validateAnswers(Map<String, Object> answers, ScriptEntity script) {
        if (answers == null)
            return;

        for (String criteriaId : answers.keySet()) {
            if (!this.criteriaExists(criteriaId, script.getCriteria()))
                throw new EvaluationException(EvaluationErrorCode.INVALID_CRITERIA_IN_ANSWERS);
        }
    }

    private boolean criteriaExists(String criteriaId, List<CriteriaDTO> criteria) {
        if (criteria == null)
            return false;

        for (CriteriaDTO crit : criteria) {
            if (crit.getId().equals(criteriaId))
                return true;
        }

        return false;
    }
}
