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
    private final String tableName;

    public WorkspaceRepository(DynamoDbClient dynamoDb, @ConfigProperty(name = "imob.table.name") String tableName) {
        this.dynamoDb = dynamoDb;
        this.tableName = tableName;
    }

    public void saveWorkspace(WorkspaceEntity workspace) {
        PutItemRequest putReq = PutItemRequest.builder()
                .tableName(this.tableName)
                .item(workspace.toAttributeMap())
                .build();
        this.dynamoDb.putItem(putReq);
    }

    public WorkspaceEntity getWorkspace(String workspaceId) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("PK", AttributeValue.builder().s("WORKSPACE#" + workspaceId).build());
        key.put("SK", AttributeValue.builder().s("METADATA").build());

        GetItemRequest getReq = GetItemRequest.builder()
                .tableName(this.tableName)
                .key(key)
                .build();

        GetItemResponse res = this.dynamoDb.getItem(getReq);
        if (res.hasItem()) 
            return WorkspaceEntity.fromAttributeMap(res.item());

        return null;
    }

    public void saveUserWorkspaceRelation(UserWorkspaceRelationEntity relation) {
        PutItemRequest putReq = PutItemRequest.builder()
                .tableName(this.tableName)
                .item(relation.toAttributeMap())
                .build();
        this.dynamoDb.putItem(putReq);
    }

    public List<UserWorkspaceRelationEntity> getUserWorkspaceRelations(String email) {
        String pk = "USER#" + email;
        String skPrefix = "WORKSPACE#";

        Map<String, String> attributeNames = new HashMap<>();
        attributeNames.put("#pk", "PK");
        attributeNames.put("#sk", "SK");

        Map<String, AttributeValue> attributeValues = new HashMap<>();
        attributeValues.put(":pk", AttributeValue.builder().s(pk).build());
        attributeValues.put(":skPrefix", AttributeValue.builder().s(skPrefix).build());

        QueryRequest queryReq = QueryRequest.builder()
                .tableName(this.tableName)
                .keyConditionExpression("#pk = :pk AND begins_with(#sk, :skPrefix)")
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
        key.put("PK", AttributeValue.builder().s("USER#" + email).build());
        key.put("SK", AttributeValue.builder().s("WORKSPACE#" + workspaceId).build());

        GetItemRequest getReq = GetItemRequest.builder()
                .tableName(this.tableName)
                .key(key)
                .build();

        GetItemResponse res = this.dynamoDb.getItem(getReq);
        if (res.hasItem()) 
            return UserWorkspaceRelationEntity.fromAttributeMap(res.item());

        return null;
    }

    public void deleteUserWorkspaceRelation(String email, String workspaceId) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("PK", AttributeValue.builder().s("USER#" + email).build());
        key.put("SK", AttributeValue.builder().s("WORKSPACE#" + workspaceId).build());

        DeleteItemRequest delReq = DeleteItemRequest.builder()
                .tableName(this.tableName)
                .key(key)
                .build();
        this.dynamoDb.deleteItem(delReq);
    }

    public void updateActiveWorkspace(String email, String workspaceId) {
        String pk = "USER#" + email;
        String sk = "PROFILE";

        Map<String, AttributeValue> key = new HashMap<>();
        key.put("PK", AttributeValue.builder().s(pk).build());
        key.put("SK", AttributeValue.builder().s(sk).build());

        GetItemRequest getReq = GetItemRequest.builder()
                .tableName(this.tableName)
                .key(key)
                .build();
        GetItemResponse res = this.dynamoDb.getItem(getReq);
        Map<String, AttributeValue> item = new HashMap<>();
        if (res.hasItem()) 
            item.putAll(res.item());
        else {
            item.put("PK", AttributeValue.builder().s(pk).build());
            item.put("SK", AttributeValue.builder().s(sk).build());
        }

        item.put("workspaceId", AttributeValue.builder().s(workspaceId).build());

        PutItemRequest putReq = PutItemRequest.builder()
                .tableName(this.tableName)
                .item(item)
                .build();
        this.dynamoDb.putItem(putReq);
    }
}
