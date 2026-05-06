package handlers

import (
	"strconv"

	"github.com/bukdanaws-commits/seleevent/backend/internal/services"
	"github.com/gofiber/fiber/v3"
)

// SettingsHandler handles system settings endpoints
type SettingsHandler struct {
	settingsService *services.SettingsService
}

// NewSettingsHandler creates a new SettingsHandler
func NewSettingsHandler(settingsService *services.SettingsService) *SettingsHandler {
	return &SettingsHandler{settingsService: settingsService}
}

// GetPublicFeeConfig returns fee configuration for public use (checkout page)
// GET /api/v1/settings/fee-config
func (h *SettingsHandler) GetPublicFeeConfig(c fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"ppnPercent":             h.settingsService.GetPPNPercent(),
		"defaultAdminFeePercent": h.settingsService.GetDefaultAdminFeePercent(),
		"paymentTimeoutMinutes":  h.settingsService.GetPaymentTimeoutMinutes(),
		"maxTicketsPerOrder":     h.settingsService.GetMaxTicketsPerOrder(),
	})
}

// GetAllSettings returns all settings (admin only)
// GET /api/v1/admin/settings/all
func (h *SettingsHandler) GetAllSettings(c fiber.Ctx) error {
	settings := h.settingsService.GetAll()
	return c.JSON(fiber.Map{
		"settings": settings,
	})
}

// GetSettingsByCategory returns settings for a category (admin only)
// GET /api/v1/admin/settings/:category
func (h *SettingsHandler) GetSettingsByCategory(c fiber.Ctx) error {
	category := c.Params("category")
	settings := h.settingsService.GetByCategory(category)
	return c.JSON(fiber.Map{
		"settings": settings,
	})
}

// UpdateSetting updates a single setting (admin only)
// PUT /api/v1/admin/settings/:key
func (h *SettingsHandler) UpdateSetting(c fiber.Ctx) error {
	key := c.Params("key")

	var body struct {
		Value     string `json:"value"`
		UpdatedBy uint   `json:"updatedBy"`
	}

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate key exists
	if _, ok := services.DefaultSettings[key]; !ok {
		return c.Status(400).JSON(fiber.Map{"error": "Unknown setting key: " + key})
	}

	// Validate numeric settings
	if key == "ppn_percent" || key == "default_admin_fee_percent" {
		val, err := strconv.ParseFloat(body.Value, 64)
		if err != nil || val < 0 || val > 100 {
			return c.Status(400).JSON(fiber.Map{"error": "Value must be a number between 0 and 100"})
		}
	}

	if key == "payment_timeout_minutes" || key == "max_tickets_per_order" {
		val, err := strconv.Atoi(body.Value)
		if err != nil || val <= 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Value must be a positive integer"})
		}
	}

	if err := h.settingsService.Update(key, body.Value, body.UpdatedBy); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update setting"})
	}

	return c.JSON(fiber.Map{
		"message": "Setting updated successfully",
		"key":     key,
		"value":   body.Value,
	})
}

// BulkUpdateSettings updates multiple settings at once (admin only)
// PUT /api/v1/admin/settings/bulk
func (h *SettingsHandler) BulkUpdateSettings(c fiber.Ctx) error {
	var body struct {
		Settings []struct {
			Key   string `json:"key"`
			Value string `json:"value"`
		} `json:"settings"`
		UpdatedBy uint `json:"updatedBy"`
	}

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	for _, s := range body.Settings {
		// Validate key exists
		if _, ok := services.DefaultSettings[s.Key]; !ok {
			return c.Status(400).JSON(fiber.Map{"error": "Unknown setting key: " + s.Key})
		}

		if err := h.settingsService.Update(s.Key, s.Value, body.UpdatedBy); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update setting: " + s.Key})
		}
	}

	return c.JSON(fiber.Map{
		"message": "Settings updated successfully",
		"count":   len(body.Settings),
	})
}
