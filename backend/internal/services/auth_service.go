package services

import (
        "encoding/json"
        "errors"
        "fmt"
        "io"
        "net/http"
        "time"

        "github.com/bukdanaws-commits/seleevent/backend/internal/config"
        "github.com/bukdanaws-commits/seleevent/backend/internal/models"
        "github.com/golang-jwt/jwt/v5"
        "gorm.io/gorm"
)

// GoogleTokenInfo represents the response from Google's tokeninfo endpoint.
type GoogleTokenInfo struct {
        Iss           string `json:"iss"`
        Sub           string `json:"sub"`           // Google user ID
        Azp           string `json:"azp"`           // Client ID
        Aud           string `json:"aud"`           // Client ID (who the token is for)
        Email         string `json:"email"`
        EmailVerified bool   `json:"email_verified"`
        Name          string `json:"name"`
        Picture       string `json:"picture"`
        GivenName     string `json:"given_name"`
        FamilyName    string `json:"family_name"`
        Locale        string `json:"locale"`
        Exp           int64  `json:"exp"`
        Iat           int64  `json:"iat"`
        HD            string `json:"hd"` // Hosted domain (for Google Workspace)
}

// Claims represents custom JWT claims.
type Claims struct {
        UserID string `json:"user_id"`
        Email  string `json:"email"`
        Role   string `json:"role"`
        jwt.RegisteredClaims
}

// AuthService handles authentication logic.
type AuthService struct {
        DB        *gorm.DB
        ClientID  string
        ClientSec string
}

// NewAuthService creates a new AuthService.
func NewAuthService(db *gorm.DB) *AuthService {
        return &AuthService{
                DB:        db,
                ClientID:  config.Cfg.Google.ClientID,
                ClientSec: config.Cfg.Google.ClientSecret,
        }
}

// verifyGoogleToken calls Google's tokeninfo API to validate the ID token.
func (s *AuthService) verifyGoogleToken(idToken string) (*GoogleTokenInfo, error) {
        // Call Google tokeninfo endpoint
        url := fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", idToken)
        resp, err := http.Get(url)
        if err != nil {
                return nil, fmt.Errorf("failed to verify google token: %w", err)
        }
        defer resp.Body.Close()

        body, err := io.ReadAll(resp.Body)
        if err != nil {
                return nil, fmt.Errorf("failed to read google response: %w", err)
        }

        if resp.StatusCode != http.StatusOK {
                return nil, fmt.Errorf("google token verification failed (status %d): %s", resp.StatusCode, string(body))
        }

        var tokenInfo GoogleTokenInfo
        if err := json.Unmarshal(body, &tokenInfo); err != nil {
                return nil, fmt.Errorf("failed to parse google response: %w", err)
        }

        // Verify the token is intended for our app
        if tokenInfo.Aud != s.ClientID && tokenInfo.Azp != s.ClientID {
                return nil, fmt.Errorf("token audience mismatch: expected %s, got %s", s.ClientID, tokenInfo.Aud)
        }

        // Verify email is verified (if present)
        if tokenInfo.Email != "" && !tokenInfo.EmailVerified {
                return nil, errors.New("google email is not verified")
        }

        return &tokenInfo, nil
}

// GenerateTokenPair creates an access token and refresh token for a user.
func (s *AuthService) GenerateTokenPair(user *models.User) (accessToken, refreshToken string, err error) {
        now := time.Now()
        accessDuration, err := time.ParseDuration(config.Cfg.JWT.Expiration)
        if err != nil {
                return "", "", fmt.Errorf("invalid JWT expiration config: %w", err)
        }
        accessExp := now.Add(accessDuration)

        refreshDuration, err := time.ParseDuration(config.Cfg.JWT.RefreshExpiration)
        if err != nil {
                return "", "", fmt.Errorf("invalid JWT refresh expiration config: %w", err)
        }
        refreshExp := now.Add(refreshDuration)

        jwtSecret := config.Cfg.JWT.Secret
        if jwtSecret == "" {
                return "", "", errors.New("JWT secret is not configured")
        }

        // Access token
        accessClaims := &Claims{
                UserID: user.ID,
                Email:  user.Email,
                Role:   user.Role,
                RegisteredClaims: jwt.RegisteredClaims{
                        ExpiresAt: jwt.NewNumericDate(accessExp),
                        IssuedAt:  jwt.NewNumericDate(now),
                        NotBefore: jwt.NewNumericDate(now),
                        Issuer:    "seleevent",
                },
        }
        accessToken, err = jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString([]byte(jwtSecret))
        if err != nil {
                return "", "", err
        }

        // Refresh token
        refreshSecret := config.Cfg.JWT.RefreshSecret
        if refreshSecret == "" {
                refreshSecret = jwtSecret // fallback to access secret
        }

        refreshClaims := &Claims{
                UserID: user.ID,
                Email:  user.Email,
                Role:   user.Role,
                RegisteredClaims: jwt.RegisteredClaims{
                        ExpiresAt: jwt.NewNumericDate(refreshExp),
                        IssuedAt:  jwt.NewNumericDate(now),
                        NotBefore: jwt.NewNumericDate(now),
                        Issuer:    "seleevent",
                },
        }
        refreshToken, err = jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString([]byte(refreshSecret))
        if err != nil {
                return "", "", err
        }

        return accessToken, refreshToken, nil
}

// ValidateToken parses and validates a JWT token string.
func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
        token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
                if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                        return nil, errors.New("unexpected signing method")
                }
                return []byte(config.Cfg.JWT.Secret), nil
        })
        if err != nil {
                return nil, err
        }
        if claims, ok := token.Claims.(*Claims); ok && token.Valid {
                return claims, nil
        }
        return nil, errors.New("invalid token")
}

// RefreshToken validates a refresh token and issues a new token pair.
func (s *AuthService) RefreshToken(refreshToken string) (accessToken, newRefreshToken string, err error) {
        // Try refresh secret first, then fall back to access secret
        refreshSecret := config.Cfg.JWT.RefreshSecret
        if refreshSecret == "" {
                refreshSecret = config.Cfg.JWT.Secret
        }

        token, err := jwt.ParseWithClaims(refreshToken, &Claims{}, func(token *jwt.Token) (interface{}, error) {
                if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                        return nil, errors.New("unexpected signing method")
                }
                return []byte(refreshSecret), nil
        })
        if err != nil {
                return "", "", errors.New("invalid refresh token")
        }

        claims, ok := token.Claims.(*Claims)
        if !ok || !token.Valid {
                return "", "", errors.New("invalid refresh token claims")
        }

        var user models.User
        if err := s.DB.Where("id = ?", claims.UserID).First(&user).Error; err != nil {
                return "", "", errors.New("user not found")
        }

        return s.GenerateTokenPair(&user)
}

// GoogleOAuth handles Google OAuth login with REAL Google token verification.
// idToken is the Google ID token received from the frontend.
func (s *AuthService) GoogleOAuth(idToken string) (*models.User, string, string, error) {
        // Step 1: Verify the Google ID token
        tokenInfo, err := s.verifyGoogleToken(idToken)
        if err != nil {
                return nil, "", "", fmt.Errorf("google verification failed: %w", err)
        }

        // Step 2: Find or create user
        var user models.User
        result := s.DB.Where("google_id = ?", tokenInfo.Sub).First(&user)

        if result.Error != nil {
                if errors.Is(result.Error, gorm.ErrRecordNotFound) {
                        // Build user name from Google data
                        name := tokenInfo.Name
                        if name == "" {
                                name = tokenInfo.GivenName
                                if tokenInfo.FamilyName != "" {
                                        name += " " + tokenInfo.FamilyName
                                }
                        }
                        if name == "" {
                                name = "User"
                        }

                        avatar := tokenInfo.Picture

                        // Create new user
                        user = models.User{
                                GoogleID: tokenInfo.Sub,
                                Email:    tokenInfo.Email,
                                Name:     name,
                                Avatar:   &avatar,
                                Role:     "PARTICIPANT",
                                Status:   "active",
                        }
                        if err := s.DB.Create(&user).Error; err != nil {
                                return nil, "", "", fmt.Errorf("failed to create user: %w", err)
                        }
                } else {
                        return nil, "", "", fmt.Errorf("database error: %w", result.Error)
                }
        } else {
                // Update existing user info from Google
                now := time.Now()
                updates := map[string]interface{}{
                        "last_login_at": now,
                        "email":         tokenInfo.Email,
                        "name":          user.Name, // keep existing name (may have been customized)
                }
                if tokenInfo.Picture != "" {
                        updates["avatar"] = tokenInfo.Picture
                }
                s.DB.Model(&user).Updates(updates)
                user.LastLoginAt = &now
        }

        // Step 3: Generate JWT tokens
        accessToken, refreshToken, err := s.GenerateTokenPair(&user)
        if err != nil {
                return nil, "", "", fmt.Errorf("failed to generate tokens: %w", err)
        }

        return &user, accessToken, refreshToken, nil
}
