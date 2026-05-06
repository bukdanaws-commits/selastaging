package main

import (
	"fmt"
	"log"
	"os"

	"github.com/bukdanaws-commits/seleevent/backend/internal/config"
	"github.com/bukdanaws-commits/seleevent/backend/internal/database"
	"github.com/bukdanaws-commits/seleevent/backend/internal/routes"
	"github.com/bukdanaws-commits/seleevent/backend/internal/services"
	"github.com/gofiber/fiber/v3"
	"github.com/spf13/viper"
)

var version = "dev"

func main() {
	// Load configuration (reads .env + env vars)
	config.Load()

	// Also support legacy YAML config
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./config")
	viper.AutomaticEnv()

	viper.SetDefault("DB_DRIVER", "sqlite")
	viper.SetDefault("DB_SSLMODE", "disable")
	viper.SetDefault("SERVER_PORT", "8080")

	if err := viper.ReadInConfig(); err != nil {
		log.Printf("Config file not found, using env vars: %v", err)
	}

	// Initialize database connection and auto-migrate all models
	database.Connect()

	// Initialize SSE hub for real-time event streaming
	hub := services.NewSSEHub()
	services.Hub = hub
	go hub.Run()

	// Create Fiber app
	app := fiber.New()

	// Setup all routes, passing db and SSE hub
	routes.Setup(app, database.DB, hub)

	// Determine port
	port := os.Getenv("PORT")
	if port == "" {
		port = viper.GetString("SERVER_PORT")
		if port == "" {
			port = config.Cfg.App.Port
			if port == "" {
				port = "8080"
			}
		}
	}

	log.Printf("Starting server on :%s (version: %s)", port, version)
	if err := app.Listen(fmt.Sprintf(":%s", port)); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
