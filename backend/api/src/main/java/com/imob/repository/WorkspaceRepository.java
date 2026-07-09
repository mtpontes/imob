package com.imob.repository;

import com.imob.entity.WorkspaceEntity;
import com.imob.entity.UserWorkspaceRelationEntity;
import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DeleteItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
@RegisterForReflection
public class WorkspaceRepository {

    private final DynamoDbClient dynamoDb;
    private final String workspacesTableName;
    private final String relationsTableName;
    private final String userProfilesTableName;
    private final String propertiesTableName;
    private final String evaluationsTableName;
    private final String scriptsTableName;

    public WorkspaceRepository(
            DynamoDbClient dynamoDb, 
            @ConfigProperty(name = "imob.workspaces.table.name") String workspacesTableName,
            @ConfigProperty(name = "imob.user-workspace-relations.table.name") String relationsTableName,
            @ConfigProperty(name = "imob.user-profiles.table.name") String userProfilesTableName,
            @ConfigProperty(name = "imob.properties.table.name") String propertiesTableName,
            @ConfigProperty(name = "imob.evaluations.table.name") String evaluationsTableName,
            @ConfigProperty(name = "imob.scripts.table.name") String scriptsTableName) {
        this.dynamoDb = dynamoDb;
        this.workspacesTableName = workspacesTableName;
        this.relationsTableName = relationsTableName;
        this.userProfilesTableName = userProfilesTableName;
        this.propertiesTableName = propertiesTableName;
        this.evaluationsTableName = evaluationsTableName;
        this.scriptsTableName = scriptsTableName;
    }

    public void saveWorkspace(WorkspaceEntity workspace) {
        PutItemRequest putReq = PutItemRequest.builder()
                .tableName(this.workspacesTableName)
                .item(workspace.toAttributeMap())
                .build();
        this.dynamoDb.putItem(putReq);
    }

    public WorkspaceEntity getWorkspace(String workspaceId) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("id", AttributeValue.builder().s(workspaceId).build());

        GetItemRequest getReq = GetItemRequest.builder()
                .tableName(this.workspacesTableName)
                .key(key)
                .build();

        GetItemResponse res = this.dynamoDb.getItem(getReq);
        if (res.hasItem()) 
            return WorkspaceEntity.fromAttributeMap(res.item());

        return null;
    }

    public void saveUserWorkspaceRelation(UserWorkspaceRelationEntity relation) {
        PutItemRequest putReq = PutItemRequest.builder()
                .tableName(this.relationsTableName)
                .item(relation.toAttributeMap())
                .build();
        this.dynamoDb.putItem(putReq);
    }

    public List<UserWorkspaceRelationEntity> getUserWorkspaceRelations(String email) {
        Map<String, String> attributeNames = new HashMap<>();
        attributeNames.put("#pk", "email");

        Map<String, AttributeValue> attributeValues = new HashMap<>();
        attributeValues.put(":pk", AttributeValue.builder().s(email).build());

        QueryRequest queryReq = QueryRequest.builder()
                .tableName(this.relationsTableName)
                .keyConditionExpression("#pk = :pk")
                .expressionAttributeNames(attributeNames)
                .expressionAttributeValues(attributeValues)
                .build();

        QueryResponse res = this.dynamoDb.query(queryReq);
        List<UserWorkspaceRelationEntity> list = new ArrayList<>();
        if (res.hasItems()) {
            for (Map<String, AttributeValue> item : res.items()) {
                UserWorkspaceRelationEntity rel = UserWorkspaceRelationEntity.fromAttributeMap(item);
                if (rel != null) 
                    list.add(rel);
            }
        }

        return list;
    }

    public UserWorkspaceRelationEntity getUserWorkspaceRelation(String email, String workspaceId) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("email", AttributeValue.builder().s(email).build());
        key.put("workspaceId", AttributeValue.builder().s(workspaceId).build());

        GetItemRequest getReq = GetItemRequest.builder()
                .tableName(this.relationsTableName)
                .key(key)
                .build();

        GetItemResponse res = this.dynamoDb.getItem(getReq);
        if (res.hasItem()) 
            return UserWorkspaceRelationEntity.fromAttributeMap(res.item());

        return null;
    }

    public void deleteUserWorkspaceRelation(String email, String workspaceId) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("email", AttributeValue.builder().s(email).build());
        key.put("workspaceId", AttributeValue.builder().s(workspaceId).build());

        DeleteItemRequest delReq = DeleteItemRequest.builder()
                .tableName(this.relationsTableName)
                .key(key)
                .build();
        this.dynamoDb.deleteItem(delReq);
    }

    public void updateActiveWorkspace(String email, String workspaceId) {
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("email", AttributeValue.builder().s(email).build());
        if (workspaceId != null && !workspaceId.isBlank()) 
            item.put("workspaceId", AttributeValue.builder().s(workspaceId).build());

        PutItemRequest putReq = PutItemRequest.builder()
                .tableName(this.userProfilesTableName)
                .item(item)
                .build();
        this.dynamoDb.putItem(putReq);
    }

    public String getActiveWorkspace(String email) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("email", AttributeValue.builder().s(email).build());

        GetItemRequest getReq = GetItemRequest.builder()
                .tableName(this.userProfilesTableName)
                .key(key)
                .build();

        GetItemResponse res = this.dynamoDb.getItem(getReq);
        if (res.hasItem()) {
            Map<String, AttributeValue> item = res.item();
            if (item.containsKey("workspaceId")) 
                return item.get("workspaceId").s();
        }

        return null;
    }

    public List<UserWorkspaceRelationEntity> getRelationsForWorkspace(String workspaceId) {
        Map<String, String> attributeNames = new HashMap<>();
        attributeNames.put("#workspaceId", "workspaceId");

        Map<String, AttributeValue> attributeValues = new HashMap<>();
        attributeValues.put(":workspaceId", AttributeValue.builder().s(workspaceId).build());

        QueryRequest queryReq = QueryRequest.builder()
                .tableName(this.relationsTableName)
                .indexName("WorkspaceIndex")
                .keyConditionExpression("#workspaceId = :workspaceId")
                .expressionAttributeNames(attributeNames)
                .expressionAttributeValues(attributeValues)
                .build();

        QueryResponse res = this.dynamoDb.query(queryReq);
        List<UserWorkspaceRelationEntity> list = new ArrayList<>();
        if (res.hasItems()) {
            for (Map<String, AttributeValue> item : res.items()) {
                UserWorkspaceRelationEntity rel = UserWorkspaceRelationEntity.fromAttributeMap(item);
                if (rel != null) 
                    list.add(rel);
            }
        }

        return list;
    }

    public void deleteWorkspaceAndAllRelatedItems(String workspaceId) {
        List<UserWorkspaceRelationEntity> relations = this.getRelationsForWorkspace(workspaceId);
        for (UserWorkspaceRelationEntity relation : relations) {
            this.deleteUserWorkspaceRelation(relation.getEmail(), workspaceId);
        }

        this.deleteItemsByWorkspaceId(this.propertiesTableName, "id", workspaceId);
        this.deleteItemsByWorkspaceId(this.scriptsTableName, "id", workspaceId);
        this.deleteItemsByWorkspaceId(this.evaluationsTableName, "propertyId_createdAt", workspaceId);

        Map<String, AttributeValue> key = new HashMap<>();
        key.put("id", AttributeValue.builder().s(workspaceId).build());

        DeleteItemRequest delReq = DeleteItemRequest.builder()
                .tableName(this.workspacesTableName)
                .key(key)
                .build();
        this.dynamoDb.deleteItem(delReq);
    }

    private void deleteItemsByWorkspaceId(String targetTableName, String rangeKeyName, String workspaceId) {
        Map<String, String> attributeNames = new HashMap<>();
        attributeNames.put("#pk", "workspaceId");

        Map<String, AttributeValue> attributeValues = new HashMap<>();
        attributeValues.put(":pk", AttributeValue.builder().s(workspaceId).build());

        QueryRequest queryReq = QueryRequest.builder()
                .tableName(targetTableName)
                .keyConditionExpression("#pk = :pk")
                .expressionAttributeNames(attributeNames)
                .expressionAttributeValues(attributeValues)
                .build();

        QueryResponse res = this.dynamoDb.query(queryReq);
        if (res.hasItems()) {
            for (Map<String, AttributeValue> item : res.items()) {
                Map<String, AttributeValue> key = new HashMap<>();
                key.put("workspaceId", AttributeValue.builder().s(workspaceId).build());
                key.put(rangeKeyName, item.get(rangeKeyName));

                DeleteItemRequest delReq = DeleteItemRequest.builder()
                        .tableName(targetTableName)
                        .key(key)
                        .build();
                this.dynamoDb.deleteItem(delReq);
            }
        }
    }
}
