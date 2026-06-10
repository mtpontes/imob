package com.imob.service;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;

@ApplicationScoped
@RegisterForReflection
public class S3Service {

    private final String bucketName;
    private final S3Presigner s3Presigner;

    public S3Service(@ConfigProperty(name = "imob.bucket.name") String bucketName,
                     S3Presigner s3Presigner) {
        this.bucketName = bucketName;
        this.s3Presigner = s3Presigner;
    }

    public String generatePutPresignedUrl(String s3Key, String contentType, Duration expiration) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(this.bucketName)
                .key(s3Key)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(expiration)
                .putObjectRequest(putObjectRequest)
                .build();

        software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest presignedRequest = this.s3Presigner.presignPutObject(presignRequest);
        return presignedRequest.url().toString();
    }

    public String generateGetPresignedUrl(String s3Key, Duration expiration) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(this.bucketName)
                .key(s3Key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(expiration)
                .getObjectRequest(getObjectRequest)
                .build();

        software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest presignedRequest = this.s3Presigner.presignGetObject(presignRequest);
        return presignedRequest.url().toString();
    }
}
