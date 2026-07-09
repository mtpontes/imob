package com.imob.entity;

import io.quarkus.runtime.annotations.RegisterForReflection;
import lombok.Getter;
import lombok.Setter;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
@RegisterForReflection
public class PropertyEntity {
    private String workspaceId;
    private String id;
    private String address;
    private double price;
    private double sqm;
    private int bedrooms;
    private int bathrooms;
    private int parking;
    private String url;
    private String createdAt;

    public Map<String, AttributeValue> toAttributeMap() {
        Map<String, AttributeValue> map = new HashMap<>();
        map.put("workspaceId", AttributeValue.builder().s(this.workspaceId).build());
        map.put("id", AttributeValue.builder().s(this.id).build());
        map.put("address", AttributeValue.builder().s(this.address).build());
        map.put("price", AttributeValue.builder().n(String.valueOf(this.price)).build());
        map.put("sqm", AttributeValue.builder().n(String.valueOf(this.sqm)).build());
        map.put("bedrooms", AttributeValue.builder().n(String.valueOf(this.bedrooms)).build());
        map.put("bathrooms", AttributeValue.builder().n(String.valueOf(this.bathrooms)).build());
        map.put("parking", AttributeValue.builder().n(String.valueOf(this.parking)).build());
        if (this.url != null) 
            map.put("url", AttributeValue.builder().s(this.url).build());

        map.put("createdAt", AttributeValue.builder().s(this.createdAt).build());
        return map;
    }

    public static PropertyEntity fromAttributeMap(Map<String, AttributeValue> map) {
        if (map == null || map.isEmpty()) 
            return null;

        PropertyEntity entity = new PropertyEntity();
        entity.setWorkspaceId(map.get("workspaceId").s());
        entity.setId(map.get("id").s());
        entity.setAddress(map.get("address").s());
        entity.setPrice(Double.parseDouble(map.get("price").n()));
        entity.setSqm(Double.parseDouble(map.get("sqm").n()));
        entity.setBedrooms(Integer.parseInt(map.get("bedrooms").n()));
        entity.setBathrooms(Integer.parseInt(map.get("bathrooms").n()));
        entity.setParking(Integer.parseInt(map.get("parking").n()));
        if (map.containsKey("url")) 
            entity.setUrl(map.get("url").s());

        entity.setCreatedAt(map.get("createdAt").s());
        return entity;
    }
}
