package database

import (
	"fmt"
	"log"
	"strings"

	"github.com/bukdanaws-commits/seleevent/backend/internal/models"
	"github.com/glebarez/sqlite"
	"github.com/spf13/viper"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	dbDriver := getEnv("DB_DRIVER", "DATABASE_DRIVER", "sqlite")
	var err error

	switch dbDriver {
	case "postgres":
		dsn := buildPostgresDSN()
		logLevel := logger.Warn
		if getEnvBool("DEBUG") {
			logLevel = logger.Info
		}
		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logLevel),
		})
		if err != nil {
			log.Fatalf("Failed to connect to PostgreSQL: %v", err)
		}
		log.Println("Connected to PostgreSQL")
	default:
		dbPath := getEnv("DB_PATH", "DATABASE_PATH", "seleevent.db")
		DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
		if err != nil {
			log.Fatalf("Failed to connect to SQLite: %v", err)
		}
		log.Println("Connected to SQLite")
	}

	safeAutoMigrate()
}

func buildPostgresDSN() string {
	host := getEnv("DB_HOST", "DATABASE_HOST", "localhost")
	port := getEnv("DB_PORT", "DATABASE_PORT", "5432")
	user := getEnv("DB_USER", "DATABASE_USER", "postgres")
	password := getEnv("DB_PASSWORD", "DATABASE_PASSWORD", "")
	dbname := getEnv("DB_NAME", "DATABASE_NAME", "eventku")
	sslmode := getEnv("DB_SSLMODE", "DATABASE_SSLMODE", "disable")
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s", host, port, user, password, dbname, sslmode)
}

func safeAutoMigrate() {
	if DB == nil {
		log.Fatal("Database connection is nil")
	}

	if isPostgres() {
		cleanupPostgresConstraints()
	}

	// Use AllModels() from the models package to migrate all registered models
	allModels := models.AllModels()

	for _, m := range allModels {
		if err := DB.AutoMigrate(m); err != nil {
			errMsg := err.Error()
			if isConstraintError(errMsg) {
				log.Printf("AutoMigrate constraint warning (safe to ignore): %v", err)
				continue
			}
			log.Printf("AutoMigrate error for %T: %v", m, err)
		} else {
			log.Printf("Migrated table for %T", m)
		}
	}
	log.Println("Database migration completed")
}

func isConstraintError(errMsg string) bool {
	patterns := []string{
		"SQLSTATE 42704",
		"does not exist",
		"already exists",
		"duplicate key value",
		"relation already exists",
	}
	for _, p := range patterns {
		if strings.Contains(errMsg, p) {
			return true
		}
	}
	return false
}

func cleanupPostgresConstraints() {
	type fix struct {
		table    string
		pgName   string
		gormName string
	}
	fixes := []fix{
		{table: "users", pgName: "users_google_id_key", gormName: "uni_users_google_id"},
	}
	for _, f := range fixes {
		var count int64
		DB.Raw(`SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = ? AND constraint_name = ? AND constraint_type = 'UNIQUE'`, f.table, f.pgName).Scan(&count)
		if count > 0 {
			sql := fmt.Sprintf("ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s", f.table, f.pgName)
			if err := DB.Exec(sql).Error; err != nil {
				log.Printf("Could not drop constraint %s: %v", f.pgName, err)
			} else {
				log.Printf("Dropped old constraint %s from table %s", f.pgName, f.table)
			}
		}
		DB.Exec(fmt.Sprintf("ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s", f.table, f.gormName))
	}
}

func isPostgres() bool {
	return getEnv("DB_DRIVER", "DATABASE_DRIVER", "sqlite") == "postgres"
}

func getEnv(keys ...string) string {
	for _, key := range keys {
		if val := viper.GetString(key); val != "" {
			return val
		}
	}
	if len(keys) > 0 {
		return keys[len(keys)-1]
	}
	return ""
}

func getEnvBool(keys ...string) bool {
	for _, key := range keys {
		if val := viper.GetBool(key); val {
			return true
		}
	}
	return false
}
