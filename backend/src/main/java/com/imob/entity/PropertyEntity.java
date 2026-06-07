package com.imob.entity;

import io.quarkus.runtime.annotations.RegisterForReflection;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.HashMap;
import java.util.Map;

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

    public String getWorkspaceId() {
        return this.workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAddress() {
        return this.address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public double getPrice() {
        return this.price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public double getSqm() {
        return this.sqm;
    }

    public void setSqm(double sqm) {
        this.sqm = sqm;
    }

    public int getBedrooms() {
        return this.bedrooms;
    }

    public void setBedrooms(int bedrooms) {
        this.bedrooms = bedrooms;
    }

    public int getBathrooms() {
        return this.bathrooms;
    }

    public void setBathrooms(int bathrooms) {
        this.bathrooms = bathrooms;
    }

    public int getParking() {
        return this.parking;
    }

    public void setParking(int parking) {
        this.parking = parking;
    }

    public String getUrl() {
        return this.url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public Map<String, AttributeValue> toAttributeMap() {
        Map<String, AttributeValue> map = new HashMap<>();
        map.put("PK", AttributeValue.builder().s("WORKSPACE#" + this.workspaceId).build());
        map.put("SK", AttributeValue.builder().s("PROPERTY#" + this.id).build());
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
        var entity = new PropertyEntity();
        var pk = map.get("PK").s();
        entity.setWorkspaceId(pk.substring("WORKSPACE#".length()));
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
