package com.imob.repository;

import com.imob.entity.EvaluationEntity;
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
public class EvaluationRepository {

    private final DynamoDbClient dynamoDb;
    private final String evaluationsTableName;

    public EvaluationRepository(DynamoDbClient dynamoDb, @ConfigProperty(name = "imob.evaluations.table.name") String evaluationsTableName) {
        this.dynamoDb = dynamoDb;
        this.evaluationsTableName = evaluationsTableName;
    }

    public void saveEvaluation(EvaluationEntity evaluation) {
        PutItemRequest putReq = PutItemRequest.builder()
                .tableName(this.evaluationsTableName)
                .item(evaluation.toAttributeMap())
                .build();
        this.dynamoDb.putItem(putReq);
    }

    public List<EvaluationEntity> getEvaluationsByProperty(String workspaceId, String propertyId) {
        String skPrefix = propertyId + "#";

        Map<String, String> attributeNames = new HashMap<>();
        attributeNames.put("#pk", "workspaceId");
        attributeNames.put("#sk", "propertyId_createdAt");

        Map<String, AttributeValue> attributeValues = new HashMap<>();
        attributeValues.put(":pk", AttributeValue.builder().s(workspaceId).build());
        attributeValues.put(":skPrefix", AttributeValue.builder().s(skPrefix).build());

        QueryRequest queryReq = QueryRequest.builder()
                .tableName(this.evaluationsTableName)
                .keyConditionExpression("#pk = :pk AND begins_with(#sk, :skPrefix)")
                .expressionAttributeNames(attributeNames)
                .expressionAttributeValues(attributeValues)
                .build();

        QueryResponse res = this.dynamoDb.query(queryReq);
        List<EvaluationEntity> list = new ArrayList<>();
        if (res.hasItems()) {
            for (Map<String, AttributeValue> item : res.items()) {
                EvaluationEntity evaluation = EvaluationEntity.fromAttributeMap(item);
                if (evaluation != null) 
                    list.add(evaluation);
            }
        }

        return list;
    }

    public EvaluationEntity getEvaluation(String workspaceId, String propertyId, String createdAt) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("workspaceId", AttributeValue.builder().s(workspaceId).build());
        key.put("propertyId_createdAt", AttributeValue.builder().s(propertyId + "#" + createdAt).build());

        GetItemRequest getReq = GetItemRequest.builder()
                .tableName(this.evaluationsTableName)
                .key(key)
                .build();

        GetItemResponse res = this.dynamoDb.getItem(getReq);
        if (res.hasItem()) 
            return EvaluationEntity.fromAttributeMap(res.item());

        return null;
    }

    public List<EvaluationEntity> getEvaluations(String workspaceId) {
        Map<String, String> attributeNames = new HashMap<>();
        attributeNames.put("#pk", "workspaceId");

        Map<String, AttributeValue> attributeValues = new HashMap<>();
        attributeValues.put(":pk", AttributeValue.builder().s(workspaceId).build());

        QueryRequest queryReq = QueryRequest.builder()
                .tableName(this.evaluationsTableName)
                .keyConditionExpression("#pk = :pk")
                .expressionAttributeNames(attributeNames)
                .expressionAttributeValues(attributeValues)
                .build();

        QueryResponse res = this.dynamoDb.query(queryReq);
        List<EvaluationEntity> list = new ArrayList<>();
        if (res.hasItems()) {
            for (Map<String, AttributeValue> item : res.items()) {
                EvaluationEntity evaluation = EvaluationEntity.fromAttributeMap(item);
                if (evaluation != null) 
                    list.add(evaluation);
            }
        }

        return list;
    }

    public void deleteEvaluation(String workspaceId, String propertyId, String createdAt) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("workspaceId", AttributeValue.builder().s(workspaceId).build());
        key.put("propertyId_createdAt", AttributeValue.builder().s(propertyId + "#" + createdAt).build());

        DeleteItemRequest delReq = DeleteItemRequest.builder()
                .tableName(this.evaluationsTableName)
                .key(key)
                .build();
        this.dynamoDb.deleteItem(delReq);
    }
}
