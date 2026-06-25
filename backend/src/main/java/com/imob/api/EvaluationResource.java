package com.imob.api;

import com.imob.context.UserContext;
import com.imob.dto.CreateEvaluationRequest;
import com.imob.dto.EvaluationResponse;
import com.imob.dto.GenerateUploadUrlRequest;
import com.imob.dto.GenerateUploadUrlResponse;
import com.imob.dto.MediaItemDto;
import com.imob.dto.UpdateEvaluationRequest;
import com.imob.entity.EvaluationEntity;
import com.imob.entity.ScriptEntity;
import com.imob.repository.DynamoDbRepository;
import com.imob.service.EvaluationValidator;
import com.imob.service.S3Service;
import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Path("/api/evaluations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RegisterForReflection
@RequiredArgsConstructor
public class EvaluationResource {

    private final UserContext userContext;
    private final DynamoDbRepository repository;

    private final S3Service s3Service;
    private final EvaluationValidator evaluationValidator;

    @POST
    public Response createEvaluation(CreateEvaluationRequest request) {
        String workspaceId = this.userContext.getWorkspaceId();
        
        ScriptEntity script = this.repository.getScript(workspaceId, request.getScriptId());
        this.evaluationValidator.validate(request, script);

        EvaluationEntity entity = new EvaluationEntity();
        entity.setWorkspaceId(workspaceId);
        entity.setPropertyId(request.getPropertyId());
        entity.setCreatedAt(Instant.now().toString());
        entity.setScriptId(request.getScriptId());

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
        
        this.evaluationValidator.validateUploadRequest(request.getFileName());

        String uuid = UUID.randomUUID().toString();
        // workspaceId/uploads/uuid_fileName
        String s3Key = workspaceId + "/uploads/" + uuid + "_" + request.getFileName();
        
        String contentType = request.getContentType();
        if (contentType == null || contentType.isBlank())
            contentType = "application/octet-stream";

        // Gera pre-signed URL valida por 15 minutos para PUT
        String uploadUrl = this.s3Service.generatePutPresignedUrl(s3Key, contentType, Duration.ofMinutes(15));

        var response = new GenerateUploadUrlResponse();
        response.setUploadUrl(uploadUrl);
        response.setS3Key(s3Key);

        return Response.ok(response).build();
    }

    @GET
    @Path("/{propertyId}/date/{createdAt}")
    public Response getEvaluation(
            @PathParam("propertyId") String propertyId,
            @PathParam("createdAt") String createdAt) {
        String workspaceId = this.userContext.getWorkspaceId();
        EvaluationEntity entity = this.repository.getEvaluation(workspaceId, propertyId, createdAt);
        if (entity == null)
            return Response.status(Response.Status.NOT_FOUND).build();
        return Response.ok(this.mapToResponse(entity)).build();
    }

    @PUT
    @Path("/{propertyId}/date/{createdAt}")
    public Response updateEvaluation(
            @PathParam("propertyId") String propertyId,
            @PathParam("createdAt") String createdAt,
            UpdateEvaluationRequest request) {
        String workspaceId = this.userContext.getWorkspaceId();
        EvaluationEntity entity = this.repository.getEvaluation(workspaceId, propertyId, createdAt);
        if (entity == null)
            return Response.status(Response.Status.NOT_FOUND).build();

        ScriptEntity script = this.repository.getScript(workspaceId, entity.getScriptId());
        this.evaluationValidator.validate(request, script);

        entity.setNotes(request.getNotes());
        entity.setMediaKeys(request.getMediaKeys());
        entity.setAnswers(request.getAnswers());

        this.repository.saveEvaluation(entity);

        return Response.ok(this.mapToResponse(entity)).build();
    }

    @DELETE
    @Path("/{propertyId}/date/{createdAt}")
    public Response deleteEvaluation(
            @PathParam("propertyId") String propertyId,
            @PathParam("createdAt") String createdAt) {
        String workspaceId = this.userContext.getWorkspaceId();
        EvaluationEntity entity = this.repository.getEvaluation(workspaceId, propertyId, createdAt);
        if (entity == null)
            return Response.status(Response.Status.NOT_FOUND).build();

        this.repository.deleteEvaluation(workspaceId, propertyId, createdAt);
        return Response.noContent().build();
    }

    private EvaluationResponse mapToResponse(EvaluationEntity entity) {
        var resp = new EvaluationResponse();
        resp.setPropertyId(entity.getPropertyId());
        resp.setCreatedAt(entity.getCreatedAt());
        resp.setScriptId(entity.getScriptId());

        resp.setNotes(entity.getNotes());
        resp.setAnswers(entity.getAnswers());

        List<String> mediaUrls = new ArrayList<>();
        List<MediaItemDto> mediaItems = new ArrayList<>();
        if (entity.getMediaKeys() != null) {
            for (String key : entity.getMediaKeys()) {
                String originalUrl = this.s3Service.generateGetPresignedUrl(key, Duration.ofHours(1));
                mediaUrls.add(originalUrl);

                String thumbKey = this.getThumbnailKey(key);
                String thumbnailUrl = this.s3Service.generateGetPresignedUrl(thumbKey, Duration.ofHours(1));
                String mediaType = this.isVideoKey(key) ? "VIDEO" : "IMAGE";

                var mediaItem = new MediaItemDto(key, originalUrl, thumbnailUrl, mediaType);
                mediaItems.add(mediaItem);
            }
        }
        resp.setMediaUrls(mediaUrls);
        resp.setMediaItems(mediaItems);
        resp.setMediaKeys(entity.getMediaKeys());
        return resp;
    }

    private String getThumbnailKey(String originalKey) {
        int uploadIndex = originalKey.indexOf("/uploads/");
        if (uploadIndex == -1)
            return originalKey;
        String prefix = originalKey.substring(0, uploadIndex + 9);
        String filename = originalKey.substring(uploadIndex + 9);
        int lastDot = filename.lastIndexOf('.');
        String nameWithoutExt = lastDot == -1 ? filename : filename.substring(0, lastDot);
        return prefix + "thumbnails/" + nameWithoutExt + ".jpg";
    }

    private boolean isVideoKey(String key) {
        if (key == null)
            return false;
        String lowerKey = key.toLowerCase();
        return lowerKey.endsWith(".mp4") || 
               lowerKey.endsWith(".webm") || 
               lowerKey.endsWith(".ogg") || 
               lowerKey.endsWith(".mov") || 
               lowerKey.endsWith(".avi");
    }
}
