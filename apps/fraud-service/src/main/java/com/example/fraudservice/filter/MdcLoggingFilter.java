package com.example.fraudservice.filter;

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
            MDC.put("requestUri",    request.getRequestURI());
            MDC.put("httpMethod",    request.getMethod());
            response.setHeader("X-Correlation-ID", correlationId);
            filterChain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
