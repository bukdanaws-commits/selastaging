package services

import (
	"strconv"
	"sync"

	"github.com/bukdanaws-commits/seleevent/backend/internal/models"
	"gorm.io/gorm"
)

var (
	settingsCache   = make(map[string]string)
	settingsCacheMu sync.RWMutex
)

// DefaultSettings defines the default system settings
var DefaultSettings = map[string]map[string]string{
	"ppn_percent": {
		"value":    "11",
		"label":    "PPN (Pajak Pertambahan Nilai) dalam persen",
		"category": "fee",
	},
	"default_admin_fee_percent": {
		"value":    "2",
		"label":    "Default Admin Fee (Biaya Platform) dalam persen",
		"category": "fee",
	},
	"payment_timeout_minutes": {
		"value":    "30",
		"label":    "Payment timeout dalam menit",
		"category": "payment",
	},
	"max_tickets_per_order": {
		"value":    "5",
		"label":    "Maksimal tiket per order",
		"category": "payment",
	},
}

// DefaultSettingsService is the global settings service instance
var DefaultSettingsService *SettingsService

// SettingsService manages system-wide configurable settings
type SettingsService struct {
	db *gorm.DB
}

// NewSettingsService creates a new SettingsService
func NewSettingsService(db *gorm.DB) *SettingsService {
	return &SettingsService{db: db}
}

// SeedDefaults creates default settings if they don't exist
func (s *SettingsService) SeedDefaults() {
	for key, def := range DefaultSettings {
		var existing models.SystemSettings
		if err := s.db.Where("key = ?", key).First(&existing).Error; err != nil {
			s.db.Create(&models.SystemSettings{
				Key:      key,
				Value:    def["value"],
				Label:    def["label"],
				Category: def["category"],
			})
		}
	}
	s.RefreshCache()
}

// RefreshCache reloads all settings into memory
func (s *SettingsService) RefreshCache() {
	var settings []models.SystemSettings
	s.db.Find(&settings)

	settingsCacheMu.Lock()
	defer settingsCacheMu.Unlock()
	settingsCache = make(map[string]string)
	for _, setting := range settings {
		settingsCache[setting.Key] = setting.Value
	}
}

// Get returns a setting value by key
func (s *SettingsService) Get(key string) string {
	settingsCacheMu.RLock()
	defer settingsCacheMu.RUnlock()
	if val, ok := settingsCache[key]; ok {
		return val
	}
	// Fallback to defaults
	if def, ok := DefaultSettings[key]; ok {
		return def["value"]
	}
	return ""
}

// GetFloat returns a setting value as float64
func (s *SettingsService) GetFloat(key string) float64 {
	val := s.Get(key)
	f, err := strconv.ParseFloat(val, 64)
	if err != nil {
		if def, ok := DefaultSettings[key]; ok {
			f, _ = strconv.ParseFloat(def["value"], 64)
		}
	}
	return f
}

// GetInt returns a setting value as int
func (s *SettingsService) GetInt(key string) int {
	val := s.Get(key)
	i, err := strconv.Atoi(val)
	if err != nil {
		if def, ok := DefaultSettings[key]; ok {
			i, _ = strconv.Atoi(def["value"])
		}
	}
	return i
}

// GetAll returns all settings grouped by category
func (s *SettingsService) GetAll() map[string][]models.SystemSettings {
	var settings []models.SystemSettings
	s.db.Order("category, key").Find(&settings)

	result := make(map[string][]models.SystemSettings)
	for _, setting := range settings {
		result[setting.Category] = append(result[setting.Category], setting)
	}
	return result
}

// GetByCategory returns settings filtered by category
func (s *SettingsService) GetByCategory(category string) []models.SystemSettings {
	var settings []models.SystemSettings
	s.db.Where("category = ?", category).Order("key").Find(&settings)
	return settings
}

// Update updates a setting value
func (s *SettingsService) Update(key string, value string, updatedBy uint) error {
	result := s.db.Model(&models.SystemSettings{}).
		Where("key = ?", key).
		Updates(map[string]any{
			"value":      value,
			"updated_by": updatedBy,
		})

	if result.Error != nil {
		return result.Error
	}

	// Refresh cache after update
	s.RefreshCache()
	return nil
}

// GetPPNPercent returns the current PPN percentage
func (s *SettingsService) GetPPNPercent() float64 {
	return s.GetFloat("ppn_percent")
}

// GetDefaultAdminFeePercent returns the default admin fee percentage
func (s *SettingsService) GetDefaultAdminFeePercent() float64 {
	return s.GetFloat("default_admin_fee_percent")
}

// GetPaymentTimeoutMinutes returns payment timeout in minutes
func (s *SettingsService) GetPaymentTimeoutMinutes() int {
	return s.GetInt("payment_timeout_minutes")
}

// GetMaxTicketsPerOrder returns max tickets per order
func (s *SettingsService) GetMaxTicketsPerOrder() int {
	return s.GetInt("max_tickets_per_order")
}
