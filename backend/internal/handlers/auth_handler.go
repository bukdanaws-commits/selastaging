package handlers

import (
        "github.com/bukdanaws-commits/seleevent/backend/internal/models"
        "github.com/bukdanaws-commits/seleevent/backend/internal/services"
        "github.com/bukdanaws-commits/seleevent/backend/pkg/response"
        "github.com/gofiber/fiber/v2"
        "gorm.io/gorm"
)

// googleLoginRequest represents the request body for Google OAuth.
type googleLoginRequest struct {
        Token string `json:"token"`
}

// refreshRequest represents the request body for token refresh.
type refreshRequest struct {
        RefreshToken string `json:"refreshToken"`
}

// GoogleLogin handles POST /api/v1/auth/google
func GoogleLogin(db *gorm.DB) fiber.Handler {
        authService := services.NewAuthService(db)
        return func(c *fiber.Ctx) error {
                var req googleLoginRequest
                if err := c.BodyParser(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }
                if req.Token == "" {
                        return response.BadRequest(c, "Token is required")
                }

                user, accessToken, refreshToken, err := authService.GoogleOAuth(req.Token)
                if err != nil {
                        return response.InternalError(c, "Authentication failed: "+err.Error())
                }

                return response.OK(c, fiber.Map{
                        "user":        user,
                        "accessToken":  accessToken,
                        "refreshToken": refreshToken,
                        "expiresIn":    3600,
                })
        }
}

// RefreshToken handles POST /api/v1/auth/refresh
func RefreshToken(db *gorm.DB) fiber.Handler {
        authService := services.NewAuthService(db)
        return func(c *fiber.Ctx) error {
                var req refreshRequest
                if err := c.BodyParser(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }
                if req.RefreshToken == "" {
                        return response.BadRequest(c, "Refresh token is required")
                }

                accessToken, newRefreshToken, err := authService.RefreshToken(req.RefreshToken)
                if err != nil {
                        return response.Unauthorized(c, "Invalid or expired refresh token")
                }

                return response.OK(c, fiber.Map{
                        "accessToken":  accessToken,
                        "refreshToken": newRefreshToken,
                        "expiresIn":    3600,
                })
        }
}

// Logout handles POST /api/v1/auth/logout
func Logout(db *gorm.DB) fiber.Handler {
        return func(c *fiber.Ctx) error {
                // For MVP, logout is client-side (clear tokens).
                // In production, add token to a blacklist in Redis.
                return response.Success(c, "Logged out successfully", nil)
        }
}

// GetMe handles GET /api/v1/auth/me
func GetMe(db *gorm.DB) fiber.Handler {
        return func(c *fiber.Ctx) error {
                // User is set by JWT middleware in Locals
                userID, ok := c.Locals("userID").(string)
                if !ok {
                        return response.Unauthorized(c, "Not authenticated")
                }

                var user models.User
                if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
                        return response.NotFound(c, "User not found")
                }

                return response.OK(c, fiber.Map{
                        "user": user,
                })
        }
}
