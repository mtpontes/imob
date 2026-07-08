package com.imob.repository;

import com.imob.entity.InviteEntity;
import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DeleteItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;

import java.util.HashMap;
import java.util.Map;

@ApplicationScoped
@RegisterForReflection
public class InviteRepository {

    private final DynamoDbClient dynamoDb;
    private final String tableName;

    public InviteRepository(DynamoDbClient dynamoDb, @ConfigProperty(name = "imob.table.name") String tableName) {
        this.dynamoDb = dynamoDb;
        this.tableName = tableName;
    }

    public void saveInvite(InviteEntity invite) {
        PutItemRequest putReq = PutItemRequest.builder()
                .tableName(this.tableName)
                .item(invite.toAttributeMap())
                .build();
        this.dynamoDb.putItem(putReq);
    }

    public InviteEntity getInvite(String token) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("PK", AttributeValue.builder().s("INVITE#" + token).build());
        key.put("SK", AttributeValue.builder().s("METADATA").build());

        GetItemRequest getReq = GetItemRequest.builder()
                .tableName(this.tableName)
                .key(key)
                .build();

        GetItemResponse res = this.dynamoDb.getItem(getReq);
        if (res.hasItem())
            return InviteEntity.fromAttributeMap(res.item());

        return null;
    }

    public void deleteInvite(String token) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("PK", AttributeValue.builder().s("INVITE#" + token).build());
        key.put("SK", AttributeValue.builder().s("METADATA").build());

        DeleteItemRequest delReq = DeleteItemRequest.builder()
                .tableName(this.tableName)
                .key(key)
                .build();
        this.dynamoDb.deleteItem(delReq);
    }
}
