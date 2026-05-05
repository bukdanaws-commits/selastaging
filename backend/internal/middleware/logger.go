package middleware

import (
	"github.com/gofiber/contrib/fiberzap/v2"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// NewLogger returns a Fiber middleware that logs requests using structured
// Zap logging with a production-style configuration.
func NewLogger() fiber.Handler {
	cfg := zap.NewProductionConfig()
	cfg.EncoderConfig.TimeKey = "timestamp"
	cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	cfg.EncoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder

	zapLogger, err := cfg.Build(zap.AddCallerSkip(1))
	if err != nil {
		zapLogger = zap.NewNop()
	}

	return fiberzap.New(fiberzap.Config{
		Logger: zapLogger,
		Fields: []string{
			"status",
			"method",
			"url",
			"latency",
			"ip",
		},
	})
}

// Logger returns a Fiber middleware that logs requests using a development-style
// Zap logger suitable for local development.
func Logger() fiber.Handler {
	zapLogger, err := zap.NewDevelopment()
	if err != nil {
		zapLogger = zap.NewNop()
	}

	return fiberzap.New(fiberzap.Config{
		Logger: zapLogger,
		Fields: []string{
			"status",
			"method",
			"url",
			"latency",
			"ip",
		},
	})
}
