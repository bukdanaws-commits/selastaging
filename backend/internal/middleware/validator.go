package middleware

import (
	"github.com/go-playground/validator/v10"
)

// Validate is the shared validator instance used across the application to
// validate struct fields based on `validate` tags.
var Validate *validator.Validate

// InitValidator creates the global Validate instance. Call this once during
// application startup (e.g. in main or an init function).
func InitValidator() {
	Validate = validator.New()
}
