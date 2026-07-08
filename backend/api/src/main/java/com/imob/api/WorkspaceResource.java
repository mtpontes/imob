package com.imob.api;

import com.imob.context.UserContext;
import com.imob.filter.AuthFilter;
import com.imob.dto.ChangeActiveWorkspaceRequest;
import com.imob.dto.CreateWorkspaceRequest;
import com.imob.dto.InviteDetailsResponse;
import com.imob.dto.InviteResponse;
import com.imob.dto.InviteUserRequest;
import com.imob.dto.WorkspaceResponse;
import com.imob.entity.InviteEntity;
import com.imob.entity.UserWorkspaceRelationEntity;
import com.imob.entity.WorkspaceEntity;
import com.imob.repository.InviteRepository;
import com.imob.repository.WorkspaceRepository;
import com.imob.dto.UpdateWorkspaceRequest;
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
import org.eclipse.microprofile.config.inject.ConfigProperty;

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

    private static final long INVITE_TTL_SECONDS = 7L * 24 * 60 * 60;

    private final UserContext userContext;
    private final WorkspaceRepository repository;
    private final InviteRepository inviteRepository;
    private final AuthFilter authFilter;

    @ConfigProperty(name = "imob.app.url")
    String appUrl;

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

        if (!hasAccess)
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("{\"error\":\"Acesso negado a este workspace\"}")
                    .build();

        this.repository.updateActiveWorkspace(email, targetWorkspaceId);
        this.userContext.setWorkspaceId(targetWorkspaceId);
        this.authFilter.invalidateCache(email);

        return Response.noContent().build();
    }

    @POST
    @Path("/invite")
    public Response createInvite(InviteUserRequest request) {
        String activeWorkspaceId = this.userContext.getWorkspaceId();
        String callerEmail = this.userContext.getEmail();

        String targetRole = request.getRole() != null ? request.getRole().toUpperCase() : null;
        if (targetRole == null || targetRole.isBlank())
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"O campo role e obrigatorio\"}")
                    .build();

        if (!targetRole.equals("ADMIN") && !targetRole.equals("MEMBER"))
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Papel invalido. Use ADMIN ou MEMBER\"}")
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

        String token = UUID.randomUUID().toString();
        long expiresAt = Instant.now().getEpochSecond() + INVITE_TTL_SECONDS;

        InviteEntity invite = new InviteEntity();
        invite.setToken(token);
        invite.setWorkspaceId(activeWorkspaceId);
        invite.setWorkspaceName(workspace.getName());
        invite.setRole(targetRole);
        invite.setCreatedByEmail(callerEmail);
        invite.setExpiresAt(expiresAt);

        this.inviteRepository.saveInvite(invite);

        InviteResponse response = new InviteResponse();
        response.setToken(token);
        response.setInviteUrl(this.appUrl + "/invite/" + token);
        response.setRole(targetRole);
        response.setWorkspaceName(workspace.getName());
        response.setExpiresAt(expiresAt);

        return Response.status(Response.Status.CREATED)
                .entity(response)
                .build();
    }

    @GET
    @Path("/invite/{token}")
    public Response getInviteDetails(@PathParam("token") String token) {
        InviteEntity invite = this.inviteRepository.getInvite(token);
        if (invite == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Convite nao encontrado\"}")
                    .build();

        if (Instant.now().getEpochSecond() > invite.getExpiresAt())
            return Response.status(410)
                    .entity("{\"error\":\"Este convite expirou\"}")
                    .build();

        InviteDetailsResponse response = new InviteDetailsResponse();
        response.setWorkspaceName(invite.getWorkspaceName());
        response.setRole(invite.getRole());
        response.setExpiresAt(invite.getExpiresAt());

        return Response.ok(response).build();
    }

    @POST
    @Path("/invite/{token}/accept")
    public Response acceptInvite(@PathParam("token") String token) {
        String userEmail = this.userContext.getEmail();

        InviteEntity invite = this.inviteRepository.getInvite(token);
        if (invite == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Convite nao encontrado\"}")
                    .build();

        if (Instant.now().getEpochSecond() > invite.getExpiresAt())
            return Response.status(410)
                    .entity("{\"error\":\"Este convite expirou\"}")
                    .build();

        WorkspaceEntity workspace = this.repository.getWorkspace(invite.getWorkspaceId());
        if (workspace == null) 
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"O ambiente associado a este convite nao existe mais\"}")
                    .build();

        UserWorkspaceRelationEntity existing = this.repository.getUserWorkspaceRelation(userEmail, invite.getWorkspaceId());
        if (existing != null)
            return Response.status(Response.Status.CONFLICT)
                    .entity("{\"error\":\"Voce ja e membro deste workspace\"}")
                    .build();

        UserWorkspaceRelationEntity relation = new UserWorkspaceRelationEntity();
        relation.setEmail(userEmail);
        relation.setWorkspaceId(invite.getWorkspaceId());
        relation.setRole(invite.getRole());
        relation.setJoinedAt(Instant.now().toString());
        relation.setWorkspaceName(invite.getWorkspaceName());
        this.repository.saveUserWorkspaceRelation(relation);

        this.inviteRepository.deleteInvite(token);

        WorkspaceResponse response = new WorkspaceResponse();
        response.setWorkspaceId(invite.getWorkspaceId());
        response.setWorkspaceName(invite.getWorkspaceName());
        response.setRole(invite.getRole());
        response.setJoinedAt(relation.getJoinedAt());
        response.setActive(false);

        return Response.ok(response).build();
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

    @PUT
    @Path("/{workspaceId}")
    public Response updateWorkspace(@PathParam("workspaceId") String workspaceId, UpdateWorkspaceRequest request) {
        String email = this.userContext.getEmail();

        WorkspaceEntity workspace = this.repository.getWorkspace(workspaceId);
        if (workspace == null) 
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Ambiente nao encontrado\"}")
                    .build();

        UserWorkspaceRelationEntity relation = this.repository.getUserWorkspaceRelation(email, workspaceId);
        if (relation == null || !relation.getRole().equals("OWNER")) 
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("{\"error\":\"Acesso negado: apenas o proprietario pode renomear o ambiente\"}")
                    .build();

        String newName = request.getName();
        if (newName == null || newName.isBlank()) 
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"O nome do ambiente e obrigatorio\"}")
                    .build();

        workspace.setName(newName);
        this.repository.saveWorkspace(workspace);

        List<UserWorkspaceRelationEntity> relations = this.repository.getRelationsForWorkspace(workspaceId);
        for (UserWorkspaceRelationEntity rel : relations) {
            rel.setWorkspaceName(newName);
            this.repository.saveUserWorkspaceRelation(rel);
            this.authFilter.invalidateCache(rel.getEmail());
        }

        WorkspaceResponse response = new WorkspaceResponse();
        response.setWorkspaceId(workspaceId);
        response.setWorkspaceName(newName);
        response.setRole("OWNER");
        response.setJoinedAt(relation.getJoinedAt());
        response.setActive(workspaceId.equals(this.userContext.getWorkspaceId()));

        return Response.ok(response).build();
    }

    @DELETE
    @Path("/{workspaceId}")
    public Response deleteWorkspace(@PathParam("workspaceId") String workspaceId) {
        String email = this.userContext.getEmail();

        WorkspaceEntity workspace = this.repository.getWorkspace(workspaceId);
        if (workspace == null) 
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Ambiente nao encontrado\"}")
                    .build();

        UserWorkspaceRelationEntity relation = this.repository.getUserWorkspaceRelation(email, workspaceId);
        if (relation == null || !relation.getRole().equals("OWNER")) 
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("{\"error\":\"Acesso negado: apenas o proprietario pode excluir o ambiente\"}")
                    .build();

        List<UserWorkspaceRelationEntity> relations = this.repository.getRelationsForWorkspace(workspaceId);
        for (UserWorkspaceRelationEntity rel : relations) {
            String memberEmail = rel.getEmail();
            this.repository.deleteUserWorkspaceRelation(memberEmail, workspaceId);
            this.authFilter.invalidateCache(memberEmail);

            List<UserWorkspaceRelationEntity> memberRelations = this.repository.getUserWorkspaceRelations(memberEmail);
            String novoWorkspaceAtivo = null;
            for (UserWorkspaceRelationEntity mRel : memberRelations) {
                if (!mRel.getWorkspaceId().equals(workspaceId)) {
                    novoWorkspaceAtivo = mRel.getWorkspaceId();
                    break;
                }
            }

            String activeWorkspaceDoMembro = this.repository.getActiveWorkspace(memberEmail);
            if (workspaceId.equals(activeWorkspaceDoMembro)) {
                this.repository.updateActiveWorkspace(memberEmail, novoWorkspaceAtivo);
                if (memberEmail.equals(email)) 
                    this.userContext.setWorkspaceId(novoWorkspaceAtivo);
            }
            
        }

        this.repository.deleteWorkspaceAndAllRelatedItems(workspaceId);

        return Response.noContent().build();
    }
}
