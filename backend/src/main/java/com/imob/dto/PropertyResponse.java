package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;

@RegisterForReflection
public class PropertyResponse {
    private String id;
    private String address;
    private double price;
    private double sqm;
    private int bedrooms;
    private int bathrooms;
    private int parking;
    private String url;
    private String createdAt;

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
}
