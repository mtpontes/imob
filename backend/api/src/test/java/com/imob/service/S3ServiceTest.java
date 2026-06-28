package com.imob.service;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;

@QuarkusTest
public class S3ServiceTest {

    @Inject
    S3Service s3Service;

    @Inject
    S3Presigner s3Presigner1;

    @Inject
    S3Presigner s3Presigner2;

    @Test
    public void shouldInjectS3PresignerAsSingleton() {
        // Arrange & Act & Assert
        assertNotNull(this.s3Service);
        assertNotNull(this.s3Presigner1);
        assertNotNull(this.s3Presigner2);
        assertSame(this.s3Presigner1, this.s3Presigner2);
    }
}
