package com.imob.service;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;
import java.time.Duration;
import java.util.Optional;

@ApplicationScoped
@RegisterForReflection
public class S3Service {

    @ConfigProperty(name = "imob.bucket.name")
    String bucketName;

    @ConfigProperty(name = "quarkus.s3.endpoint-override")
    Optional<String> endpointOverride;

    @ConfigProperty(name = "quarkus.s3.aws.region")
    Optional<String> region;

    @ConfigProperty(name = "quarkus.s3.aws.credentials.static-provider.access-key-id")
    Optional<String> accessKeyId;

    @ConfigProperty(name = "quarkus.s3.aws.credentials.static-provider.secret-access-key")
    Optional<String> secretAccessKey;

    private S3Presigner s3Presigner;

    @PostConstruct
    public void init() {
        S3Presigner.Builder builder = S3Presigner.builder();
        
        if (this.region.isPresent() && !this.region.get().isBlank()) {
            builder.region(Region.of(this.region.get()));
        } else {
            builder.region(Region.US_EAST_1);
        }

        if (this.endpointOverride.isPresent() && !this.endpointOverride.get().isBlank()) {
            builder.endpointOverride(URI.create(this.endpointOverride.get()));
            // No ambiente local com LocalStack, o SDK gera URLs virtual-hosted-style
            // (ex: http://bucket.localhost:4566) que o browser nao consegue resolver.
            // Path-style (http://localhost:4566/bucket) e a forma correta para desenvolvimento local.
            builder.serviceConfiguration(
                    S3Configuration.builder().pathStyleAccessEnabled(true).build()
            );
        }

        if (this.accessKeyId.isPresent() && !this.accessKeyId.get().isBlank() &&
                this.secretAccessKey.isPresent() && !this.secretAccessKey.get().isBlank()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(this.accessKeyId.get(), this.secretAccessKey.get())
            ));
        }

        this.s3Presigner = builder.build();
    }

    @PreDestroy
    public void destroy() {
        if (this.s3Presigner != null) 
            this.s3Presigner.close();
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
