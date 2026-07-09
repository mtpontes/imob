package com.imob.api;

import com.imob.context.UserContext;
import com.imob.dto.CreateScriptRequest;
import com.imob.dto.ScriptResponse;
import com.imob.dto.UpdateScriptRequest;
import com.imob.entity.ScriptEntity;
import com.imob.entity.EvaluationEntity;
import com.imob.repository.ScriptRepository;
import com.imob.repository.EvaluationRepository;
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

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Path("/api/scripts")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RegisterForReflection
@RequiredArgsConstructor
public class ScriptResource {

    private final UserContext userContext;
    private final ScriptRepository repository;
    private final EvaluationRepository evaluationRepository;
    private final S3Service s3Service;

    @GET
    public List<ScriptResponse> getActiveScripts() {
        String workspaceId = this.userContext.getWorkspaceId();
        List<ScriptEntity> entities = this.repository.getActiveScripts(workspaceId);
        
        List<ScriptResponse> responses = new ArrayList<>();
        for (ScriptEntity entity : entities) {
            responses.add(this.mapToResponse(entity));
        }

        return responses;
    }

    @GET
    @Path("/{id}")
    public Response getScriptById(@PathParam("id") String scriptId) {
        String workspaceId = this.userContext.getWorkspaceId();
        ScriptEntity entity = this.repository.getScript(workspaceId, scriptId);
        if (entity == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Roteiro nao encontrado\"}")
                    .build();
        return Response.ok(this.mapToResponse(entity)).build();
    }

    @POST
    public Response createScript(CreateScriptRequest request) {
        String workspaceId = this.userContext.getWorkspaceId();
        String scriptId = UUID.randomUUID().toString();

        var entity = new ScriptEntity();
        entity.setWorkspaceId(workspaceId);
        entity.setId(scriptId);
        entity.setCreatedAt(Instant.now().toString());
        entity.setCriteria(request.getCriteria());
        entity.setName(request.getName());

        this.repository.saveScript(entity);

        return Response.status(Response.Status.CREATED)
                .entity(this.mapToResponse(entity))
                .build();
    }

    @PUT
    @Path("/{id}")
    public Response updateScript(@PathParam("id") String scriptId, UpdateScriptRequest request) {
        String workspaceId = this.userContext.getWorkspaceId();
        ScriptEntity entity = this.repository.getScript(workspaceId, scriptId);

        if (entity == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Roteiro nao encontrado\"}")
                    .build();

        entity.setCriteria(request.getCriteria());
        entity.setName(request.getName());
        entity.setCreatedAt(Instant.now().toString());
        
        this.repository.saveScript(entity);

        return Response.ok(this.mapToResponse(entity)).build();
    }

    @DELETE
    @Path("/{id}")
    public Response deleteScript(@PathParam("id") String scriptId) {
        String workspaceId = this.userContext.getWorkspaceId();
        ScriptEntity script = this.repository.getScript(workspaceId, scriptId);

        if (script == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Roteiro nao encontrado\"}")
                    .build();

        List<EvaluationEntity> evaluations = this.evaluationRepository.getEvaluations(workspaceId);
        for (EvaluationEntity eval : evaluations)
            if (scriptId.equals(eval.getScriptId())) {
                if (eval.getMediaKeys() != null)
                    for (String key : eval.getMediaKeys())
                        this.s3Service.deleteObject(key);
                this.evaluationRepository.deleteEvaluation(workspaceId, eval.getPropertyId(), eval.getCreatedAt());
            }

        this.repository.deleteScript(workspaceId, scriptId);

        return Response.noContent().build();
    }

    private ScriptResponse mapToResponse(ScriptEntity entity) {
        var resp = new ScriptResponse();
        resp.setId(entity.getId());
        resp.setCreatedAt(entity.getCreatedAt());
        resp.setCriteria(entity.getCriteria());
        resp.setName(entity.getName());

        return resp;
    }
}
