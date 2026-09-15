package ca.bc.gov.nrs.hrs.dto.block;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Request payload for creating an attachment upload intent. */
public record AttachmentIntentRequest(
    @NotBlank(message = "documentType is required")
    String documentType,
    @NotBlank(message = "fileName is required")
    @Size(max = 255, message = "fileName must be at most 255 characters")
    String fileName,
    @NotBlank(message = "mimeType is required")
    @Size(max = 128, message = "mimeType must be at most 128 characters")
    String mimeType,
    @NotNull(message = "declaredSizeBytes is required")
    @Positive(message = "declaredSizeBytes must be a positive number")
    Long declaredSizeBytes) {}
