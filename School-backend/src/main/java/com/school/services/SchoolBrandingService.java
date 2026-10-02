package com.school.services;

import com.school.dto.SchoolBrandingDto;
import com.school.entities.SchoolSettings;
import com.school.repositories.SettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Iterator;

@Service
public class SchoolBrandingService {

    private static final int MAX_LOGO_EDGE = 256;
    private static final float JPEG_QUALITY = 0.78f;

    private final SettingsRepository settingsRepository;

    public SchoolBrandingService(SettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
    }

    @Transactional
    public SchoolBrandingDto getBranding() {
        SchoolSettings settings = settingsRepository.findFirstByOrderByIdAsc().orElseGet(SchoolSettings::new);
        String logo = settings.getLogoUrl();
        String optimizedLogo = optimizeDataLogo(logo);
        if (optimizedLogo != null && !optimizedLogo.equals(logo)) {
            settings.setLogoUrl(optimizedLogo);
            if (settings.getId() != null) {
                settingsRepository.save(settings);
            }
            logo = optimizedLogo;
        }
        return new SchoolBrandingDto(settings.getSchoolName(), logo);
    }

    private String optimizeDataLogo(String logo) {
        if (logo == null || !logo.startsWith("data:image/") || !logo.contains(";base64,")) {
            return null;
        }
        try {
            int delimiter = logo.indexOf(",");
            byte[] bytes = Base64.getDecoder().decode(logo.substring(delimiter + 1));
            BufferedImage source = ImageIO.read(new ByteArrayInputStream(bytes));
            if (source == null || (source.getWidth() <= MAX_LOGO_EDGE && source.getHeight() <= MAX_LOGO_EDGE
                    && logo.startsWith("data:image/jpeg;"))) {
                return null;
            }

            double scale = Math.min(1.0, (double) MAX_LOGO_EDGE / Math.max(source.getWidth(), source.getHeight()));
            int width = Math.max(1, (int) Math.round(source.getWidth() * scale));
            int height = Math.max(1, (int) Math.round(source.getHeight() * scale));
            BufferedImage resized = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = resized.createGraphics();
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, width, height);
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.drawImage(source, 0, 0, width, height, null);
            graphics.dispose();

            Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
            if (!writers.hasNext()) return null;
            ImageWriter writer = writers.next();
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            try (ImageOutputStream imageOutput = ImageIO.createImageOutputStream(output)) {
                writer.setOutput(imageOutput);
                ImageWriteParam parameters = writer.getDefaultWriteParam();
                parameters.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                parameters.setCompressionQuality(JPEG_QUALITY);
                writer.write(null, new IIOImage(resized, null, null), parameters);
            } finally {
                writer.dispose();
            }
            byte[] optimizedBytes = output.toByteArray();
            if (optimizedBytes.length >= bytes.length) return null;
            return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(optimizedBytes);
        } catch (Exception exception) {
            return null;
        }
    }
}