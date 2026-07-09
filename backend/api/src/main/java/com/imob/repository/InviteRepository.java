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
    private final String invitesTableName;

    public InviteRepository(DynamoDbClient dynamoDb, @ConfigProperty(name = "imob.invites.table.name") String invitesTableName) {
        this.dynamoDb = dynamoDb;
        this.invitesTableName = invitesTableName;
    }

    public void saveInvite(InviteEntity invite) {
        PutItemRequest putReq = PutItemRequest.builder()
                .tableName(this.invitesTableName)
                .item(invite.toAttributeMap())
                .build();
        this.dynamoDb.putItem(putReq);
    }

    public InviteEntity getInvite(String token) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("token", AttributeValue.builder().s(token).build());

        GetItemRequest getReq = GetItemRequest.builder()
                .tableName(this.invitesTableName)
                .key(key)
                .build();

        GetItemResponse res = this.dynamoDb.getItem(getReq);
        if (res.hasItem())
            return InviteEntity.fromAttributeMap(res.item());

        return null;
    }

    public void deleteInvite(String token) {
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("token", AttributeValue.builder().s(token).build());

        DeleteItemRequest delReq = DeleteItemRequest.builder()
                .tableName(this.invitesTableName)
                .key(key)
                .build();
        this.dynamoDb.deleteItem(delReq);
    }
}
