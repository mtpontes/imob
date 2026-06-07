package com.imob.exception;

import io.quarkus.runtime.annotations.RegisterForReflection;

@RegisterForReflection
public class EvaluationException extends RuntimeException {

    private final EvaluationErrorCode errorCode;

    public EvaluationException(EvaluationErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public EvaluationErrorCode getErrorCode() {
        return this.errorCode;
    }
}
