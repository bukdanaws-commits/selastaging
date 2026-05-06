package config

import (
	"os"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	App    AppConfig
	DB     DBConfig
	JWT    JWTConfig
	Google GoogleConfig
	Doku   DokuConfig
}

type AppConfig struct {
	Env  string
	Port string
}

type DBConfig struct {
	Driver     string // "postgres" or "sqlite"
	Host       string
	Port       string
	User       string
	Password   string
	Name       string
	SSLMode    string
	SQLitePath string
}

type JWTConfig struct {
	Secret            string
	Expiration        string
	RefreshExpiration string
	RefreshSecret     string
}

type GoogleConfig struct {
	ClientID     string
	ClientSecret string
}

// DokuConfig holds DOKU payment gateway configuration.
type DokuConfig struct {
	ClientID     string
	ClientSecret string
	SharedKey    string
	PrivateKey   string
	IsSandbox    bool
	BaseURL      string
	SnapBaseURL  string
}

var Cfg Config

// loadSecretFromFile reads a secret from a file path.
// Cloud Run mounts secrets from Secret Manager as files at the specified mount path.
func loadSecretFromFile(path string) string {
	if path == "" {
		return ""
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

// Load reads configuration from .env file and environment variables.
// Environment variables take precedence over .env file values.
// Cloud Run Secret Manager mounted secrets are loaded via _PATH suffixed env vars.
func Load() {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	// Bind env vars to Viper keys (allows override via OS environment)
	_ = viper.BindEnv("APP_ENV")
	_ = viper.BindEnv("APP_PORT")
	_ = viper.BindEnv("DB_DRIVER")
	_ = viper.BindEnv("DB_HOST")
	_ = viper.BindEnv("DB_PORT")
	_ = viper.BindEnv("DB_USER")
	_ = viper.BindEnv("DB_PASSWORD")
	_ = viper.BindEnv("DB_NAME")
	_ = viper.BindEnv("DB_SQLITE_PATH")
	_ = viper.BindEnv("DB_SSLMODE")
	_ = viper.BindEnv("JWT_SECRET")
	_ = viper.BindEnv("JWT_EXPIRATION")
	_ = viper.BindEnv("REFRESH_JWT_EXPIRATION")
	_ = viper.BindEnv("REFRESH_JWT_SECRET")
	_ = viper.BindEnv("GOOGLE_CLIENT_ID")
	_ = viper.BindEnv("GOOGLE_CLIENT_SECRET")

	// DOKU env vars
	_ = viper.BindEnv("DOKU_CLIENT_ID")
	_ = viper.BindEnv("DOKU_CLIENT_SECRET")
	_ = viper.BindEnv("DOKU_SHARED_KEY")
	_ = viper.BindEnv("DOKU_PRIVATE_KEY")
	_ = viper.BindEnv("DOKU_IS_SANDBOX")

	// Defaults
	viper.SetDefault("APP_ENV", "development")
	viper.SetDefault("APP_PORT", "8080")
	viper.SetDefault("DB_DRIVER", "sqlite")
	viper.SetDefault("DB_SQLITE_PATH", "./seleevent.db")
	viper.SetDefault("DB_SSLMODE", "disable")
	viper.SetDefault("JWT_SECRET", "default-secret-change-me")
	viper.SetDefault("JWT_EXPIRATION", "24h")
	viper.SetDefault("REFRESH_JWT_EXPIRATION", "168h")

	// Try reading .env file (ignore error if not found — env vars will be used)
	_ = viper.ReadInConfig()

	// Determine DOKU sandbox mode
	dokuIsSandbox := viper.GetBool("DOKU_IS_SANDBOX")
	dokuBaseURL := "https://api.doku.com"
	dokuSnapBaseURL := "https://pay.doku.com"
	if dokuIsSandbox {
		dokuBaseURL = "https://api-sandbox.doku.com"
		dokuSnapBaseURL = "https://pay-sandbox.doku.com"
	}

	Cfg = Config{
		App: AppConfig{
			Env:  viper.GetString("APP_ENV"),
			Port: viper.GetString("APP_PORT"),
		},
		DB: DBConfig{
			Driver:     viper.GetString("DB_DRIVER"),
			Host:       viper.GetString("DB_HOST"),
			Port:       viper.GetString("DB_PORT"),
			User:       viper.GetString("DB_USER"),
			Password:   viper.GetString("DB_PASSWORD"),
			Name:       viper.GetString("DB_NAME"),
			SSLMode:    viper.GetString("DB_SSLMODE"),
			SQLitePath: viper.GetString("DB_SQLITE_PATH"),
		},
		JWT: JWTConfig{
			Secret:            viper.GetString("JWT_SECRET"),
			Expiration:        viper.GetString("JWT_EXPIRATION"),
			RefreshExpiration: viper.GetString("REFRESH_JWT_EXPIRATION"),
			RefreshSecret:     viper.GetString("REFRESH_JWT_SECRET"),
		},
		Google: GoogleConfig{
			ClientID:     viper.GetString("GOOGLE_CLIENT_ID"),
			ClientSecret: viper.GetString("GOOGLE_CLIENT_SECRET"),
		},
		Doku: DokuConfig{
			ClientID:     viper.GetString("DOKU_CLIENT_ID"),
			ClientSecret: viper.GetString("DOKU_CLIENT_SECRET"),
			SharedKey:    viper.GetString("DOKU_SHARED_KEY"),
			PrivateKey:   viper.GetString("DOKU_PRIVATE_KEY"),
			IsSandbox:    dokuIsSandbox,
			BaseURL:      dokuBaseURL,
			SnapBaseURL:  dokuSnapBaseURL,
		},
	}

	// ── Cloud Run Secret Manager: mount secrets as files ──────────────
	if secretPath := os.Getenv("DB_PASSWORD_PATH"); secretPath != "" {
		if val := loadSecretFromFile(secretPath); val != "" {
			Cfg.DB.Password = val
		}
	}
	if secretPath := os.Getenv("JWT_SECRET_PATH"); secretPath != "" {
		if val := loadSecretFromFile(secretPath); val != "" {
			Cfg.JWT.Secret = val
		}
	}
	if secretPath := os.Getenv("REFRESH_JWT_SECRET_PATH"); secretPath != "" {
		if val := loadSecretFromFile(secretPath); val != "" {
			Cfg.JWT.RefreshSecret = val
		}
	}
	if secretPath := os.Getenv("DOKU_CLIENT_SECRET_PATH"); secretPath != "" {
		if val := loadSecretFromFile(secretPath); val != "" {
			Cfg.Doku.ClientSecret = val
		}
	}
	if secretPath := os.Getenv("DOKU_PRIVATE_KEY_PATH"); secretPath != "" {
		if val := loadSecretFromFile(secretPath); val != "" {
			Cfg.Doku.PrivateKey = val
		}
	}
}
