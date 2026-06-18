package com.imob.api;

import com.imob.context.UserContext;
import com.imob.dto.CreatePropertyRequest;
import com.imob.dto.PropertyResponse;
import com.imob.entity.PropertyEntity;
import com.imob.entity.EvaluationEntity;
import com.imob.repository.DynamoDbRepository;
import com.imob.service.S3Service;
import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
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

@Path("/api/properties")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RegisterForReflection
@RequiredArgsConstructor
public class PropertyResource {

    private final UserContext userContext;
    private final DynamoDbRepository repository;
    private final S3Service s3Service;

    @GET
    public List<PropertyResponse> getProperties() {
        String workspaceId = this.userContext.getWorkspaceId();
        List<PropertyEntity> entities = this.repository.getProperties(workspaceId);

        List<PropertyResponse> responses = new ArrayList<>();
        for (PropertyEntity entity : entities) {
            responses.add(this.mapToResponse(entity));
        }
        return responses;
    }

    @POST
    public Response createProperty(CreatePropertyRequest request) {
        String workspaceId = this.userContext.getWorkspaceId();
        String propertyId = UUID.randomUUID().toString();

        var entity = new PropertyEntity();
        entity.setWorkspaceId(workspaceId);
        entity.setId(propertyId);
        entity.setAddress(request.getAddress());
        entity.setPrice(request.getPrice());
        entity.setSqm(request.getSqm());
        entity.setBedrooms(request.getBedrooms());
        entity.setBathrooms(request.getBathrooms());
        entity.setParking(request.getParking());
        entity.setUrl(request.getUrl());
        entity.setCreatedAt(Instant.now().toString());

        this.repository.saveProperty(entity);

        return Response.status(Response.Status.CREATED)
                .entity(this.mapToResponse(entity))
                .build();
    }

    @DELETE
    @Path("/{id}")
    public Response deleteProperty(@PathParam("id") String propertyId) {
        String workspaceId = this.userContext.getWorkspaceId();
        PropertyEntity property = this.repository.getProperty(workspaceId, propertyId);
        if (property == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Imovel nao encontrado\"}")
                    .build();

        List<EvaluationEntity> evaluations = this.repository.getEvaluationsByProperty(workspaceId, propertyId);
        for (EvaluationEntity eval : evaluations) {
            if (eval.getMediaKeys() != null)
                for (String key : eval.getMediaKeys())
                    this.s3Service.deleteObject(key);
            this.repository.deleteEvaluation(workspaceId, propertyId, eval.getCreatedAt());
        }

        this.repository.deleteProperty(workspaceId, propertyId);

        return Response.noContent().build();
    }

    private PropertyResponse mapToResponse(PropertyEntity entity) {
        var resp = new PropertyResponse();
        resp.setId(entity.getId());
        resp.setAddress(entity.getAddress());
        resp.setPrice(entity.getPrice());
        resp.setSqm(entity.getSqm());
        resp.setBedrooms(entity.getBedrooms());
        resp.setBathrooms(entity.getBathrooms());
        resp.setParking(entity.getParking());
        resp.setUrl(entity.getUrl());
        resp.setCreatedAt(entity.getCreatedAt());
        return resp;
    }
}
