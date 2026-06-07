package com.imob.api;
import com.imob.context.UserContext;
import com.imob.dto.CreateScriptRequest;
import com.imob.dto.ScriptResponse;
import com.imob.dto.UpdateScriptRequest;
import com.imob.entity.ScriptEntity;
import com.imob.repository.DynamoDbRepository;
import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
@Path("/api/scripts")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RegisterForReflection
public class ScriptResource {
    private final UserContext userContext;
    private final DynamoDbRepository repository;
    public ScriptResource(UserContext userContext, DynamoDbRepository repository) {
        this.userContext = userContext;
        this.repository = repository;
    }
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
