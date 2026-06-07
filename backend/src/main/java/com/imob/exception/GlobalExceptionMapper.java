package com.imob.exception;

import com.imob.dto.ErrorResponse;
import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;
import software.amazon.awssdk.awscore.exception.AwsServiceException;

@Provider
@RegisterForReflection
public class GlobalExceptionMapper implements ExceptionMapper<Exception> {

    private static final Logger LOG = Logger.getLogger(GlobalExceptionMapper.class);

    @Override
    public Response toResponse(Exception exception) {
        if (exception instanceof EvaluationException evalEx) {
            EvaluationErrorCode code = evalEx.getErrorCode();
            ErrorResponse body = new ErrorResponse(code.getMessage(), code.getStatus().getStatusCode());

            return Response.status(code.getStatus())
                    .type(MediaType.APPLICATION_JSON)
                    .entity(body)
                    .build();
        }

        if (exception instanceof WebApplicationException webEx) {
            Response original = webEx.getResponse();
            ErrorResponse body = new ErrorResponse(exception.getMessage(), original.getStatus());

            return Response.status(original.getStatus())
                    .type(MediaType.APPLICATION_JSON)
                    .entity(body)
                    .build();
        }

        if (exception instanceof AwsServiceException awsEx) {
            LOG.errorf("Erro no servico AWS [%s]: %s", awsEx.awsErrorDetails().errorCode(), awsEx.getMessage());

            ErrorResponse body = new ErrorResponse("Erro ao comunicar com servico AWS", 503);

            return Response.status(Response.Status.SERVICE_UNAVAILABLE)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(body)
                    .build();
        }

        LOG.errorf(exception, "Erro interno nao tratado: %s", exception.getMessage());

        ErrorResponse body = new ErrorResponse("Erro interno no servidor", 500);

        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .type(MediaType.APPLICATION_JSON)
                .entity(body)
                .build();
    }
}

