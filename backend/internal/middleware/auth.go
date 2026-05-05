package middleware

import (
        "strings"

        "github.com/bukdanaws-commits/seleevent/backend/internal/config"
        "github.com/gofiber/fiber/v2"
        "github.com/golang-jwt/jwt/v5"
)

// Claims represents the JWT custom claims for authentication.
type Claims struct {
        UserID string `json:"user_id"`
        Email  string `json:"email"`
        Role   string `json:"role"`
        jwt.RegisteredClaims
}

// JWTAuth returns a Fiber middleware that validates JWT tokens from the
// Authorization header. On success it stores "userID", "userRole", and
// "userEmail" in the request locals.
func JWTAuth() fiber.Handler {
        return func(c *fiber.Ctx) error {
                // Extract Authorization header
                authHeader := c.Get("Authorization")
                if authHeader == "" {
                        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                                "success": false,
                                "error":   "Missing authorization token",
                        })
                }

                // Expect "Bearer <token>" format
                parts := strings.SplitN(authHeader, " ", 2)
                if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
                        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                                "success": false,
                                "error":   "Invalid authorization header format",
                        })
                }

                return parseAndStoreClaims(c, parts[1])
        }
}

// JWTAuthSSE returns a Fiber middleware that validates JWT tokens from the
// Authorization header OR the "token" query parameter. This is needed because
// the browser EventSource API cannot send custom headers.
func JWTAuthSSE() fiber.Handler {
        return func(c *fiber.Ctx) error {
                // First, try Authorization header
                authHeader := c.Get("Authorization")
                if authHeader != "" {
                        parts := strings.SplitN(authHeader, " ", 2)
                        if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
                                return parseAndStoreClaims(c, parts[1])
                        }
                }

                // Fallback: try query param "token"
                tokenString := c.Query("token")
                if tokenString == "" {
                        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                                "success": false,
                                "error":   "Missing authorization token",
                        })
                }

                return parseAndStoreClaims(c, tokenString)
        }
}

// parseAndStoreClaims validates the JWT token string and stores claims in locals.
func parseAndStoreClaims(c *fiber.Ctx, tokenString string) error {
        // Parse and validate the token
        secret := config.Cfg.JWT.Secret
        token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (interface{}, error) {
                if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
                        return nil, jwt.ErrSignatureInvalid
                }
                return []byte(secret), nil
        })

        if err != nil {
                if strings.Contains(err.Error(), "token is expired") || strings.Contains(err.Error(), "expired") {
                        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                                "success": false,
                                "error":   "Token has expired",
                        })
                }
                return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                        "success": false,
                        "error":   "Invalid or malformed token",
                })
        }

        claims, ok := token.Claims.(*Claims)
        if !ok || !token.Valid {
                return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                        "success": false,
                        "error":   "Invalid token claims",
                })
        }

        // Store user info in request locals
        c.Locals("userID", claims.UserID)
        c.Locals("userRole", claims.Role)
        c.Locals("userEmail", claims.Email)

        return c.Next()
}

// RoleRequired returns a Fiber middleware that checks whether the authenticated
// user's role (stored in Locals as "userRole") is one of the allowed roles.
// Returns 403 Forbidden if the role is not permitted.
func RoleRequired(roles ...string) fiber.Handler {
        roleSet := make(map[string]struct{}, len(roles))
        for _, r := range roles {
                roleSet[r] = struct{}{}
        }

        return func(c *fiber.Ctx) error {
                userRole, ok := c.Locals("userRole").(string)
                if !ok {
                        return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
                                "success": false,
                                "error":   "User role not found",
                        })
                }

                if _, allowed := roleSet[userRole]; !allowed {
                        return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
                                "success": false,
                                "error":   "Insufficient permissions",
                        })
                }

                return c.Next()
        }
}
