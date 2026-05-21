package com.yourcompany.yourapp.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Adds a correlationId to every request so logs can be traced
 * across multiple services using a single KQL query in Kibana.
 *
 * Usage: correlationId: "a3f8c21b" → full request timeline across all services
 *
 * IMPORTANT: MDC.clear() in finally is not optional.
 * Spring Boot reuses threads — without clearing, a thread that processed
 * request A will bleed its correlationId into request B.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class MdcLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String correlationId = request.getHeader("X-Correlation-ID");
            if (correlationId == null || correlationId.isBlank()) {
                correlationId = UUID.randomUUID().toString().substring(0, 8);
            }
            MDC.put("correlationId", correlationId);
            MDC.put("requestUri", request.getRequestURI());
            MDC.put("httpMethod", request.getMethod());
            MDC.put("clientIp", getClientIp(request));
            response.setHeader("X-Correlation-ID", correlationId);
            filterChain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        return (xff != null && !xff.isBlank())
                ? xff.split(",")[0].trim()
                : request.getRemoteAddr();
    }
}
