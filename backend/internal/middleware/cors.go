package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

// CORS returns a Fiber middleware that handles Cross-Origin Resource Sharing.
// AllowOrigins is set to "*" for development; in production replace with
// specific trusted domains.
func CORS() fiber.Handler {
	return cors.New(cors.Config{
		AllowOrigins:     "*", // In production, use specific domains
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
		ExposeHeaders:    "Content-Length",
	})
}
