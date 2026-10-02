package com.school.services;

import com.school.entities.SchoolSettings;
import com.school.repositories.SettingsRepository;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SchoolBrandingServiceTest {

    @Test
    void compressesAndPersistsOversizedDataUrlLogo() throws Exception {
        SettingsRepository repository = mock(SettingsRepository.class);
        SchoolSettings settings = new SchoolSettings();
        settings.setId(1L);
        settings.setSchoolName("Example School");

        BufferedImage source = new BufferedImage(1200, 800, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < source.getHeight(); y++) {
            for (int x = 0; x < source.getWidth(); x++) {
                source.setRGB(x, y, new Color((x * 31 + y) % 256, (x + y * 17) % 256, (x * y) % 256).getRGB());
            }
        }
        ByteArrayOutputStream pngBytes = new ByteArrayOutputStream();
        ImageIO.write(source, "png", pngBytes);
        String original = "data:image/png;base64," + Base64.getEncoder().encodeToString(pngBytes.toByteArray());
        settings.setLogoUrl(original);
        when(repository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(settings));
        when(repository.save(settings)).thenReturn(settings);

        var branding = new SchoolBrandingService(repository).getBranding();

        assertEquals("Example School", branding.schoolName());
        assertTrue(branding.logoUrl().startsWith("data:image/jpeg;base64,"));
        assertNotEquals(original, branding.logoUrl());
        byte[] optimizedBytes = Base64.getDecoder().decode(branding.logoUrl().substring(branding.logoUrl().indexOf(',') + 1));
        BufferedImage optimized = ImageIO.read(new ByteArrayInputStream(optimizedBytes));
        assertTrue(optimized.getWidth() <= 256);
        assertTrue(optimized.getHeight() <= 256);
        verify(repository).save(settings);
    }
}
