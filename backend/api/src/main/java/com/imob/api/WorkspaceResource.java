package com.imob.api;

import com.imob.context.UserContext;
import com.imob.filter.AuthFilter;
import com.imob.dto.CreateWorkspaceRequest;
import com.imob.dto.ChangeActiveWorkspaceRequest;
import com.imob.dto.InviteUserRequest;
import com.imob.dto.WorkspaceResponse;
import com.imob.entity.WorkspaceEntity;
import com.imob.entity.UserWorkspaceRelationEntity;
import com.imob.repository.WorkspaceRepository;
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

@Path("/api/workspaces")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RegisterForReflection
@RequiredArgsConstructor
public class WorkspaceResource {

    private final UserContext userContext;
    private final WorkspaceRepository repository;
    private final AuthFilter authFilter;

    @GET
    public List<WorkspaceResponse> getWorkspaces() {
        String email = this.userContext.getEmail();
        String activeWorkspaceId = this.userContext.getWorkspaceId();

        List<UserWorkspaceRelationEntity> relations = this.repository.getUserWorkspaceRelations(email);
        
        // Se nao houver relacoes criadas ainda (ex: migracao/retrocompatibilidade), cria a relacao padrao
        if (relations.isEmpty() && activeWorkspaceId != null) {
            String domain = email.contains("@") ? email.split("@")[1] : "";
            String workspaceName = "Workspace Principal";
            if (!domain.isBlank()) {
                String name = domain.split("\\.")[0];
                workspaceName = name.substring(0, 1).toUpperCase() + name.substring(1) + " Workspace";
            }

            WorkspaceEntity workspace = this.repository.getWorkspace(activeWorkspaceId);
            if (workspace == null) {
                workspace = new WorkspaceEntity();
                workspace.setId(activeWorkspaceId);
                workspace.setName(workspaceName);
                workspace.setOwnerEmail(email);
                this.repository.saveWorkspace(workspace);
            }

            UserWorkspaceRelationEntity relation = new UserWorkspaceRelationEntity();
            relation.setEmail(email);
            relation.setWorkspaceId(activeWorkspaceId);
            relation.setRole("OWNER");
            relation.setJoinedAt(Instant.now().toString());
            relation.setWorkspaceName(workspace.getName());
            this.repository.saveUserWorkspaceRelation(relation);

            relations.add(relation);
        }

        List<WorkspaceResponse> responses = new ArrayList<>();
        for (UserWorkspaceRelationEntity relation : relations) {
            WorkspaceResponse resp = new WorkspaceResponse();
            resp.setWorkspaceId(relation.getWorkspaceId());
            resp.setWorkspaceName(relation.getWorkspaceName());
            resp.setRole(relation.getRole());
            resp.setJoinedAt(relation.getJoinedAt());
            resp.setActive(relation.getWorkspaceId().equals(activeWorkspaceId));
            responses.add(resp);
        }

        return responses;
    }

    @POST
    public Response createWorkspace(CreateWorkspaceRequest request) {
        String email = this.userContext.getEmail();
        String workspaceId = "workspace_" + UUID.randomUUID().toString();

        WorkspaceEntity workspace = new WorkspaceEntity();
        workspace.setId(workspaceId);
        workspace.setName(request.getName());
        workspace.setOwnerEmail(email);
        this.repository.saveWorkspace(workspace);

        UserWorkspaceRelationEntity relation = new UserWorkspaceRelationEntity();
        relation.setEmail(email);
        relation.setWorkspaceId(workspaceId);
        relation.setRole("OWNER");
        relation.setJoinedAt(Instant.now().toString());
        relation.setWorkspaceName(request.getName());
        this.repository.saveUserWorkspaceRelation(relation);

        this.repository.updateActiveWorkspace(email, workspaceId);
        this.userContext.setWorkspaceId(workspaceId);
        this.authFilter.invalidateCache(email);

        WorkspaceResponse resp = new WorkspaceResponse();
        resp.setWorkspaceId(workspaceId);
        resp.setWorkspaceName(request.getName());
        resp.setRole("OWNER");
        resp.setJoinedAt(relation.getJoinedAt());
        resp.setActive(true);

        return Response.status(Response.Status.CREATED)
                .entity(resp)
                .build();
    }

    @POST
    @Path("/active")
    public Response changeActiveWorkspace(ChangeActiveWorkspaceRequest request) {
        String email = this.userContext.getEmail();
        String targetWorkspaceId = request.getWorkspaceId();

        List<UserWorkspaceRelationEntity> relations = this.repository.getUserWorkspaceRelations(email);
        boolean hasAccess = false;
        for (UserWorkspaceRelationEntity relation : relations) {
            if (relation.getWorkspaceId().equals(targetWorkspaceId)) {
                hasAccess = true;
                break;
            }
        }

        if (!hasAccess) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("{\"error\":\"Acesso negado a este workspace\"}")
                    .build();
        }

        this.repository.updateActiveWorkspace(email, targetWorkspaceId);
        this.userContext.setWorkspaceId(targetWorkspaceId);
        this.authFilter.invalidateCache(email);

        return Response.noContent().build();
    }

    @POST
    @Path("/invite")
    public Response inviteUser(InviteUserRequest request) {
        String activeWorkspaceId = this.userContext.getWorkspaceId();
        String inviteeEmail = request.getEmail();
        String callerEmail = this.userContext.getEmail();

        if (inviteeEmail == null || inviteeEmail.isBlank()) 
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Email do convidado e obrigatorio\"}")
                    .build();

        UserWorkspaceRelationEntity callerRel = this.repository.getUserWorkspaceRelation(callerEmail, activeWorkspaceId);
        if (callerRel == null || (!callerRel.getRole().equals("OWNER") && !callerRel.getRole().equals("ADMIN"))) 
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("{\"error\":\"Acesso negado: apenas administradores ou proprietarios podem convidar\"}")
                    .build();

        WorkspaceEntity workspace = this.repository.getWorkspace(activeWorkspaceId);
        if (workspace == null) 
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Workspace atual nao encontrado\"}")
                    .build();

        String targetRole = request.getRole() != null && !request.getRole().isBlank() ? request.getRole().toUpperCase() : "ADMIN";
        if (!targetRole.equals("ADMIN") && !targetRole.equals("MEMBER")) 
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Papel invalido para o convite\"}")
                    .build();

        UserWorkspaceRelationEntity relation = new UserWorkspaceRelationEntity();
        relation.setEmail(inviteeEmail);
        relation.setWorkspaceId(activeWorkspaceId);
        relation.setRole(targetRole);
        relation.setJoinedAt(Instant.now().toString());
        relation.setWorkspaceName(workspace.getName());
        this.repository.saveUserWorkspaceRelation(relation);

        return Response.ok("{\"message\":\"Usuario convidado com sucesso\"}").build();
    }

    @DELETE
    @Path("/members/{email}")
    public Response removeMember(@PathParam("email") String targetEmail) {
        String activeWorkspaceId = this.userContext.getWorkspaceId();
        String callerEmail = this.userContext.getEmail();

        UserWorkspaceRelationEntity callerRel = this.repository.getUserWorkspaceRelation(callerEmail, activeWorkspaceId);
        if (callerRel == null) 
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("{\"error\":\"Acesso negado ao workspace\"}")
                    .build();

        UserWorkspaceRelationEntity targetRel = this.repository.getUserWorkspaceRelation(targetEmail, activeWorkspaceId);
        if (targetRel == null) 
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Relacao de workspace do usuario alvo nao encontrada\"}")
                    .build();

        // Regra de negocio: Um convidado (ADMIN/MEMBER) nunca pode expulsar o OWNER
        if (targetRel.getRole().equals("OWNER") && !callerEmail.equals(targetEmail)) 
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("{\"error\":\"Acesso negado: nao e permitido expulsar o proprietario do workspace\"}")
                    .build();

        // Regra de negocio: MEMBER nao pode expulsar ninguem (exceto sair a si mesmo)
        if (callerRel.getRole().equals("MEMBER") && !callerEmail.equals(targetEmail)) 
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("{\"error\":\"Acesso negado: membros comuns nao podem remover outros membros\"}")
                    .build();

        this.repository.deleteUserWorkspaceRelation(targetEmail, activeWorkspaceId);
        return Response.noContent().build();
    }
}
