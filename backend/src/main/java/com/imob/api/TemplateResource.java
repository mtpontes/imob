package com.imob.api;

import com.imob.context.UserContext;
import com.imob.dto.CreateTemplateRequest;
import com.imob.dto.TemplateResponse;
import com.imob.dto.UpdateTemplateRequest;
import com.imob.entity.TemplateEntity;
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

@Path("/api/templates")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RegisterForReflection
public class TemplateResource {

    private final UserContext userContext;
    private final DynamoDbRepository repository;

    public TemplateResource(UserContext userContext, DynamoDbRepository repository) {
        this.userContext = userContext;
        this.repository = repository;
    }

    @GET
    public List<TemplateResponse> getActiveTemplates() {
        String workspaceId = this.userContext.getWorkspaceId();
        List<TemplateEntity> entities = this.repository.getActiveTemplates(workspaceId);
        
        List<TemplateResponse> responses = new ArrayList<>();
        for (TemplateEntity entity : entities) {
            responses.add(this.mapToResponse(entity));
        }
        return responses;
    }

    @POST
    public Response createTemplate(CreateTemplateRequest request) {
        String workspaceId = this.userContext.getWorkspaceId();
        String templateId = UUID.randomUUID().toString();

        var entity = new TemplateEntity();
        entity.setWorkspaceId(workspaceId);
        entity.setId(templateId);
        entity.setVersion(1);
        entity.setActive(true);
        entity.setCreatedAt(Instant.now().toString());
        entity.setCriteria(request.getCriteria());

        this.repository.saveTemplate(entity);

        return Response.status(Response.Status.CREATED)
                .entity(this.mapToResponse(entity))
                .build();
    }

    @PUT
    @Path("/{id}")
    public Response updateTemplate(@PathParam("id") String templateId, UpdateTemplateRequest request) {
        String workspaceId = this.userContext.getWorkspaceId();
        List<TemplateEntity> allVersions = this.repository.getAllVersionsOfTemplate(workspaceId, templateId);

        if (allVersions.isEmpty()) 
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Template nao encontrado\"}")
                    .build();

        // Encontra a maior versao existente
        TemplateEntity latestEntity = null;
        for (TemplateEntity v : allVersions) {
            if (latestEntity == null || v.getVersion() > latestEntity.getVersion()) 
                latestEntity = v;
        }

        if (latestEntity == null) 
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Template nao encontrado\"}")
                    .build();

        if (request.isNewVersion()) {
            // Regra de Nova Versao: marca o antigo como inativo
            latestEntity.setActive(false);
            this.repository.saveTemplate(latestEntity);

            // Cria novo item com version = current + 1
            var newEntity = new TemplateEntity();
            newEntity.setWorkspaceId(workspaceId);
            newEntity.setId(templateId);
            newEntity.setVersion(latestEntity.getVersion() + 1);
            newEntity.setActive(true);
            newEntity.setCreatedAt(Instant.now().toString());
            newEntity.setCriteria(request.getCriteria());

            this.repository.saveTemplate(newEntity);

            return Response.ok(this.mapToResponse(newEntity)).build();
        } else {
            // Regra de Sobrescrita Total: PutItem mantendo o mesmo ID e versao
            latestEntity.setCriteria(request.getCriteria());
            latestEntity.setCreatedAt(Instant.now().toString());
            
            this.repository.saveTemplate(latestEntity);

            return Response.ok(this.mapToResponse(latestEntity)).build();
        }
    }

    private TemplateResponse mapToResponse(TemplateEntity entity) {
        var resp = new TemplateResponse();
        resp.setId(entity.getId());
        resp.setVersion(entity.getVersion());
        resp.setActive(entity.isActive());
        resp.setCreatedAt(entity.getCreatedAt());
        resp.setCriteria(entity.getCriteria());
        return resp;
    }
}
