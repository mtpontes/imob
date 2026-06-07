package com.imob.api;

import com.imob.context.UserContext;
import com.imob.dto.CreateEvaluationRequest;
import com.imob.dto.EvaluationResponse;
import com.imob.dto.GenerateUploadUrlRequest;
import com.imob.dto.GenerateUploadUrlResponse;
import com.imob.entity.EvaluationEntity;
import com.imob.entity.TemplateEntity;
import com.imob.dto.CriteriaDTO;
import com.imob.repository.DynamoDbRepository;
import com.imob.service.EvaluationService;
import com.imob.service.S3Service;
import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Path("/api/evaluations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RegisterForReflection
public class EvaluationResource {

    private final UserContext userContext;
    private final DynamoDbRepository repository;
    private final EvaluationService evaluationService;
    private final S3Service s3Service;

    public EvaluationResource(UserContext userContext, DynamoDbRepository repository, EvaluationService evaluationService, S3Service s3Service) {
        this.userContext = userContext;
        this.repository = repository;
        this.evaluationService = evaluationService;
        this.s3Service = s3Service;
    }

    @POST
    public Response createEvaluation(CreateEvaluationRequest request) {
        String workspaceId = this.userContext.getWorkspaceId();
        
        // Valida se o template existe e esta ativo
        TemplateEntity template = this.repository.getTemplate(workspaceId, request.getTemplateId(), request.getTemplateVersion());
        if (template == null || !template.isActive()) 
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Template nao encontrado ou inativo\"}")
                    .build();

        // Valida se todas as respostas sao para criterios cadastrados no template
        if (request.getAnswers() != null) {
            for (String criteriaId : request.getAnswers().keySet()) {
                boolean exists = false;
                if (template.getCriteria() != null) {
                    for (CriteriaDTO crit : template.getCriteria()) {
                        if (crit.getId().equals(criteriaId)) {
                            exists = true;
                            break;
                        }
                    }
                }
                if (!exists) 
                    return Response.status(Response.Status.BAD_REQUEST)
                            .entity("{\"error\":\"Respostas contem criterios nao cadastrados no template\"}")
                            .build();
            }
        }

        // Calcula score final baseado nos criterios do template e respostas fornecidas
        double score = this.evaluationService.calculateFinalScore(template, request.getAnswers());

        EvaluationEntity entity = new EvaluationEntity();
        entity.setWorkspaceId(workspaceId);
        entity.setPropertyId(request.getPropertyId());
        entity.setCreatedAt(Instant.now().toString());
        entity.setTemplateId(request.getTemplateId());
        entity.setTemplateVersion(request.getTemplateVersion());
        entity.setFinalScore(score);
        entity.setNotes(request.getNotes());
        entity.setMediaKeys(request.getMediaKeys());
        entity.setAnswers(request.getAnswers());

        this.repository.saveEvaluation(entity);

        return Response.status(Response.Status.CREATED)
                .entity(this.mapToResponse(entity))
                .build();
    }

    @GET
    @Path("/property/{id}")
    public List<EvaluationResponse> getEvaluationsByProperty(@PathParam("id") String propertyId) {
        String workspaceId = this.userContext.getWorkspaceId();
        List<EvaluationEntity> entities = this.repository.getEvaluationsByProperty(workspaceId, propertyId);

        List<EvaluationResponse> responses = new ArrayList<>();
        for (EvaluationEntity entity : entities) {
            responses.add(this.mapToResponse(entity));
        }
        return responses;
    }

    @POST
    @Path("/upload-url")
    public Response generateUploadUrl(GenerateUploadUrlRequest request) {
        String workspaceId = this.userContext.getWorkspaceId();
        
        if (request.getFileName() == null || request.getFileName().isBlank()) 
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Nome do arquivo nao informado\"}")
                    .build();

        String uuid = UUID.randomUUID().toString();
        // workspaceId/uploads/uuid_fileName
        String s3Key = workspaceId + "/uploads/" + uuid + "_" + request.getFileName();
        
        // Gera pre-signed URL valida por 15 minutos para PUT
        String uploadUrl = this.s3Service.generatePutPresignedUrl(s3Key, Duration.ofMinutes(15));

        var response = new GenerateUploadUrlResponse();
        response.setUploadUrl(uploadUrl);
        response.setS3Key(s3Key);

        return Response.ok(response).build();
    }

    private EvaluationResponse mapToResponse(EvaluationEntity entity) {
        var resp = new EvaluationResponse();
        resp.setPropertyId(entity.getPropertyId());
        resp.setCreatedAt(entity.getCreatedAt());
        resp.setTemplateId(entity.getTemplateId());
        resp.setTemplateVersion(entity.getTemplateVersion());
        resp.setFinalScore(entity.getFinalScore());
        resp.setNotes(entity.getNotes());
        resp.setAnswers(entity.getAnswers());

        List<String> mediaUrls = new ArrayList<>();
        if (entity.getMediaKeys() != null) {
            for (String key : entity.getMediaKeys()) {
                String url = this.s3Service.generateGetPresignedUrl(key, Duration.ofHours(1));
                mediaUrls.add(url);
            }
        }
        resp.setMediaUrls(mediaUrls);
        return resp;
    }
}
