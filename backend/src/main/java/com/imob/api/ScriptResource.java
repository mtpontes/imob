package com.imob.api;

import com.imob.context.UserContext;
import com.imob.dto.CreateScriptRequest;
import com.imob.dto.ScriptResponse;
import com.imob.dto.UpdateScriptRequest;
import com.imob.entity.ScriptEntity;
import com.imob.repository.DynamoDbRepository;

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
    private final DynamoDbRepository repository;

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
    @Path("/{id}/version/{version}")
    public Response getScriptByIdAndVersion(@PathParam("id") String scriptId, @PathParam("version") int version) {
        String workspaceId = this.userContext.getWorkspaceId();
        ScriptEntity entity = this.repository.getScript(workspaceId, scriptId, version);
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
        entity.setVersion(1);
        entity.setActive(true);
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
        List<ScriptEntity> allVersions = this.repository.getAllVersionsOfScript(workspaceId, scriptId);

        if (allVersions.isEmpty()) 
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Roteiro nao encontrado\"}")
                    .build();

        // Encontra a maior versao existente
        ScriptEntity latestEntity = null;
        for (ScriptEntity v : allVersions) {
            if (latestEntity == null || v.getVersion() > latestEntity.getVersion()) 
                latestEntity = v;
        }

        if (latestEntity == null) 
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Roteiro nao encontrado\"}")
                    .build();

        if (request.isNewVersion()) {
            // Regra de Nova Versao: marca o antigo como inativo
            latestEntity.setActive(false);
            this.repository.saveScript(latestEntity);

            // Cria novo item com version = current + 1
            var newEntity = new ScriptEntity();
            newEntity.setWorkspaceId(workspaceId);
            newEntity.setId(scriptId);
            newEntity.setVersion(latestEntity.getVersion() + 1);
            newEntity.setActive(true);
            newEntity.setCreatedAt(Instant.now().toString());
            newEntity.setCriteria(request.getCriteria());
            newEntity.setName(request.getName());

            this.repository.saveScript(newEntity);

            return Response.ok(this.mapToResponse(newEntity)).build();
        } else {
            // Regra de Sobrescrita Total: PutItem mantendo o mesmo ID e versao
            latestEntity.setCriteria(request.getCriteria());
            latestEntity.setName(request.getName());
            latestEntity.setCreatedAt(Instant.now().toString());
            
            this.repository.saveScript(latestEntity);

            return Response.ok(this.mapToResponse(latestEntity)).build();
        }
    }

    @DELETE
    @Path("/{id}")
    public Response deleteScript(@PathParam("id") String scriptId) {
        String workspaceId = this.userContext.getWorkspaceId();
        List<ScriptEntity> versions = this.repository.getAllVersionsOfScript(workspaceId, scriptId);

        if (versions.isEmpty())
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Roteiro nao encontrado\"}")
                    .build();

        this.repository.deleteAllVersionsOfScript(workspaceId, scriptId);

        return Response.noContent().build();
    }

    private ScriptResponse mapToResponse(ScriptEntity entity) {
        var resp = new ScriptResponse();
        resp.setId(entity.getId());
        resp.setVersion(entity.getVersion());
        resp.setActive(entity.isActive());
        resp.setCreatedAt(entity.getCreatedAt());
        resp.setCriteria(entity.getCriteria());
        resp.setName(entity.getName());

        return resp;
    }
}
