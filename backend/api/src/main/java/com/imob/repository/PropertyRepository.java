package com.imob.repository;

import com.imob.entity.PropertyEntity;
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
public class PropertyRepository {

    private final DynamoDbClient dynamoDb;
    private final String propertiesTableName;

    public PropertyRepository(DynamoDbClient dynamoDb, @ConfigProperty(name = "imob.properties.table.name") String propertiesTableName) {
        this.dynamoDb = dynamoDb;
        this.propertiesTableName = propertiesTableName;
    }

    public void saveProperty(PropertyEntity property) {
        PutItemRequest putReq = PutItemRequest.builder()
                .tableName(this.propertiesTableName)
                .item(property.toAttributeMap())
                .build();
        this.dynamoDb.putItem(putReq);
    }

    public PropertyEntity getProperty(String workspaceId, String propertyId) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("workspaceId", AttributeValue.builder().s(workspaceId).build());
        key.put("id", AttributeValue.builder().s(propertyId).build());

        GetItemRequest getReq = GetItemRequest.builder()
                .tableName(this.propertiesTableName)
                .key(key)
                .build();

        GetItemResponse res = this.dynamoDb.getItem(getReq);
        if (res.hasItem()) 
            return PropertyEntity.fromAttributeMap(res.item());

        return null;
    }

    public List<PropertyEntity> getProperties(String workspaceId) {
        Map<String, String> attributeNames = new HashMap<>();
        attributeNames.put("#pk", "workspaceId");

        Map<String, AttributeValue> attributeValues = new HashMap<>();
        attributeValues.put(":pk", AttributeValue.builder().s(workspaceId).build());

        QueryRequest queryReq = QueryRequest.builder()
                .tableName(this.propertiesTableName)
                .keyConditionExpression("#pk = :pk")
                .expressionAttributeNames(attributeNames)
                .expressionAttributeValues(attributeValues)
                .build();

        QueryResponse res = this.dynamoDb.query(queryReq);
        List<PropertyEntity> list = new ArrayList<>();
        if (res.hasItems()) {
            for (Map<String, AttributeValue> item : res.items()) {
                PropertyEntity property = PropertyEntity.fromAttributeMap(item);
                if (property != null) 
                    list.add(property);
            }
        }

        return list;
    }

    public void deleteProperty(String workspaceId, String propertyId) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("workspaceId", AttributeValue.builder().s(workspaceId).build());
        key.put("id", AttributeValue.builder().s(propertyId).build());

        DeleteItemRequest delReq = DeleteItemRequest.builder()
                .tableName(this.propertiesTableName)
                .key(key)
                .build();
        this.dynamoDb.deleteItem(delReq);
    }
}
