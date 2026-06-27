package com.imob.exception;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.ws.rs.core.Response;

@RegisterForReflection
public enum EvaluationErrorCode {

    SCRIPT_NOT_FOUND_OR_INACTIVE(
            "Roteiro nao encontrado ou inativo",
            Response.Status.BAD_REQUEST
    ),
    INVALID_CRITERIA_IN_ANSWERS(
            "Respostas contem criterios nao cadastrados no roteiro",
            Response.Status.BAD_REQUEST
    ),
    MISSING_FILE_NAME(
            "Nome do arquivo nao informado",
            Response.Status.BAD_REQUEST
    );

    private final String message;
    private final Response.Status status;

    EvaluationErrorCode(String message, Response.Status status) {
        this.message = message;
        this.status = status;
    }

    public String getMessage() {
        return this.message;
    }

    public Response.Status getStatus() {
        return this.status;
    }
}
