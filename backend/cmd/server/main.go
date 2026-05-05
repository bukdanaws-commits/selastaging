package main

import (
    "fmt"
    "log"
    "os"

    "github.com/bukdanaws-commits/seleevent/backend/internal/database"
    "github.com/bukdanaws-commits/seleevent/backend/internal/route"
    "github.com/gofiber/fiber/v2"
    "github.com/spf13/viper"
)

var version = "dev"

func main() {
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

    database.Connect()

    app := fiber.New(fiber.Config{
        AppVersion: version,
    })

    route.Setup(app)

    port := os.Getenv("PORT")
    if port == "" {
        port = viper.GetString("SERVER_PORT")
        if port == "" {
            port = "8080"
        }
    }

    log.Printf("Starting server on :%s (version: %s)", port, version)
    if err := app.Listen(fmt.Sprintf(":%s", port)); err != nil {
        log.Fatalf("Server failed: %v", err)
    }
}
