package middleware

import (
        "github.com/gofiber/fiber/v3"
        "github.com/gofiber/fiber/v3/middleware/cors"
)

// CORS returns a Fiber middleware that handles Cross-Origin Resource Sharing.
// AllowOrigins is set to "*" for development; in production replace with
// specific trusted domains.
func CORS() fiber.Handler {
        return cors.New(cors.Config{
                AllowOriginsFunc: func(origin string) bool { return true },
                AllowMethods: []string{
                        "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
                },
                AllowHeaders: []string{
                        "Origin", "Content-Type", "Accept", "Authorization",
                },
                AllowCredentials: true,
                ExposeHeaders:    []string{"Content-Length"},
        })
}
