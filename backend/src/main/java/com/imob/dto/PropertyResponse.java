package com.imob.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
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
}
