package response

import "github.com/gofiber/fiber/v2"

// APIResponse is the standard response envelope for all API endpoints.
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

// Meta contains pagination metadata.
type Meta struct {
	Page       int   `json:"page,omitempty"`
	PerPage    int   `json:"per_page,omitempty"`
	Total      int64 `json:"total,omitempty"`
	TotalPages int   `json:"total_pages,omitempty"`
}

// OK sends a 200 OK response with data (shorthand for Success with empty message).
func OK(c *fiber.Ctx, data interface{}) error {
	return c.JSON(APIResponse{
		Success: true,
		Data:    data,
	})
}

// Success sends a 200 OK response with a message and optional data.
func Success(c *fiber.Ctx, message string, data interface{}) error {
	return c.JSON(APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// Error sends an error response with the given status code.
func Error(c *fiber.Ctx, status int, message string) error {
	return c.Status(status).JSON(APIResponse{
		Success: false,
		Error:   message,
	})
}

// Created sends a 201 Created response with data.
func Created(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// Paginated sends a 200 OK response with paginated data and metadata.
// Convenience overload that accepts individual pagination params.
func Paginated(c *fiber.Ctx, data interface{}, total int64, page, perPage int) error {
	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}
	return c.JSON(APIResponse{
		Success: true,
		Data:    data,
		Meta: &Meta{
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

// PaginatedWithMeta sends a 200 OK response with paginated data and pre-built Meta.
func PaginatedWithMeta(c *fiber.Ctx, data interface{}, meta Meta) error {
	return c.JSON(APIResponse{
		Success: true,
		Data:    data,
		Meta:    &meta,
	})
}

// Unauthorized sends a 401 Unauthorized response.
func Unauthorized(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Unauthorized"
	}
	return c.Status(fiber.StatusUnauthorized).JSON(APIResponse{
		Success: false,
		Error:   message,
	})
}

// Forbidden sends a 403 Forbidden response.
func Forbidden(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Forbidden"
	}
	return c.Status(fiber.StatusForbidden).JSON(APIResponse{
		Success: false,
		Error:   message,
	})
}

// NotFound sends a 404 Not Found response.
func NotFound(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Resource not found"
	}
	return c.Status(fiber.StatusNotFound).JSON(APIResponse{
		Success: false,
		Error:   message,
	})
}

// BadRequest sends a 400 Bad Request response.
func BadRequest(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Bad request"
	}
	return c.Status(fiber.StatusBadRequest).JSON(APIResponse{
		Success: false,
		Error:   message,
	})
}

// InternalError sends a 500 Internal Server Error response.
func InternalError(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Internal server error"
	}
	return c.Status(fiber.StatusInternalServerError).JSON(APIResponse{
		Success: false,
		Error:   message,
	})
}
