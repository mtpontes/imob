package com.imob.config;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import jakarta.annotation.PreDestroy;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;
import java.util.Optional;

import jakarta.inject.Singleton;

@ApplicationScoped
@RegisterForReflection
public class S3PresignerProducer {

    @ConfigProperty(name = "quarkus.s3.endpoint-override")
    Optional<String> endpointOverride;

    @ConfigProperty(name = "quarkus.s3.aws.region")
    Optional<String> region;

    @ConfigProperty(name = "quarkus.s3.aws.credentials.static-provider.access-key-id")
    Optional<String> accessKeyId;

    @ConfigProperty(name = "quarkus.s3.aws.credentials.static-provider.secret-access-key")
    Optional<String> secretAccessKey;

    private S3Presigner s3Presigner;

    @Produces
    @Singleton
    public S3Presigner produceS3Presigner() {
        S3Presigner.Builder builder = S3Presigner.builder();
        
        if (this.region.isPresent() && !this.region.get().isBlank()) {
            builder.region(Region.of(this.region.get()));
        } else {
            builder.region(Region.US_EAST_1);
        }

        if (this.endpointOverride.isPresent() && !this.endpointOverride.get().isBlank()) {
            builder.endpointOverride(URI.create(this.endpointOverride.get()));
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
        return this.s3Presigner;
    }

    @PreDestroy
    public void destroy() {
        if (this.s3Presigner != null)
            this.s3Presigner.close();
    }
}
