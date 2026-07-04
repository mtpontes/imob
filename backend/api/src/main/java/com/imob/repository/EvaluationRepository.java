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
    private final String tableName;

    public EvaluationRepository(DynamoDbClient dynamoDb, @ConfigProperty(name = "imob.table.name") String tableName) {
        this.dynamoDb = dynamoDb;
        this.tableName = tableName;
    }

    public void saveEvaluation(EvaluationEntity evaluation) {
        PutItemRequest putReq = PutItemRequest.builder()
                .tableName(this.tableName)
                .item(evaluation.toAttributeMap())
                .build();
        this.dynamoDb.putItem(putReq);
    }

    public List<EvaluationEntity> getEvaluationsByProperty(String workspaceId, String propertyId) {
        String pk = "WORKSPACE#" + workspaceId;
        String skPrefix = "EVALUATION#" + propertyId + "#";

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
        key.put("PK", AttributeValue.builder().s("WORKSPACE#" + workspaceId).build());
        key.put("SK", AttributeValue.builder().s("EVALUATION#" + propertyId + "#" + createdAt).build());

        GetItemRequest getReq = GetItemRequest.builder()
                .tableName(this.tableName)
                .key(key)
                .build();

        GetItemResponse res = this.dynamoDb.getItem(getReq);
        if (res.hasItem()) 
            return EvaluationEntity.fromAttributeMap(res.item());

        return null;
    }

    public List<EvaluationEntity> getEvaluations(String workspaceId) {
        String pk = "WORKSPACE#" + workspaceId;
        String skPrefix = "EVALUATION#";

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
        key.put("PK", AttributeValue.builder().s("WORKSPACE#" + workspaceId).build());
        key.put("SK", AttributeValue.builder().s("EVALUATION#" + propertyId + "#" + createdAt).build());

        DeleteItemRequest delReq = DeleteItemRequest.builder()
                .tableName(this.tableName)
                .key(key)
                .build();
        this.dynamoDb.deleteItem(delReq);
    }
}
