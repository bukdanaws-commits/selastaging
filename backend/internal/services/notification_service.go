package services

import (
        "encoding/json"

        "github.com/bukdanaws-commits/seleevent/backend/internal/models"
        "gorm.io/gorm"
)

// NotificationService handles notification CRUD operations.
type NotificationService struct {
        DB *gorm.DB
}

// NewNotificationService creates a new NotificationService.
func NewNotificationService(db *gorm.DB) *NotificationService {
        return &NotificationService{DB: db}
}

// CreateNotification creates a new notification for a user.
// eventType: info, warning, success, error
// category: order, redemption, gate, system, payment
// data: will be serialized to JSON string
func (s *NotificationService) CreateNotification(userID string, eventType string, title string, message string, data interface{}) error {
        var dataStr string
        if data != nil {
                b, err := json.Marshal(data)
                if err != nil {
                        dataStr = ""
                } else {
                        dataStr = string(b)
                }
        }

        // Derive TenantID from user's tenant membership
        var tenantUser models.TenantUser
        tenantID := ""
        if err := s.DB.Where("user_id = ?", userID).First(&tenantUser).Error; err == nil {
                tenantID = tenantUser.TenantID
        }

        notif := models.Notification{
                TenantID: tenantID,
                UserID:   userID,
                Title:    title,
                Message:  message,
                Type:     eventType,
                Data:     dataStr,
                IsRead:   false,
        }

        return s.DB.Create(&notif).Error
}

// CreateNotificationWithCategory creates a notification with category and eventID.
func (s *NotificationService) CreateNotificationWithCategory(userID string, eventID string, eventType string, category string, title string, message string, data interface{}) error {
        var dataStr string
        if data != nil {
                b, err := json.Marshal(data)
                if err != nil {
                        dataStr = ""
                } else {
                        dataStr = string(b)
                }
        }

        // Derive TenantID from event
        tenantID := ""
        if eventID != "" {
                var event models.Event
                if err := s.DB.Where("id = ?", eventID).First(&event).Error; err == nil {
                        tenantID = event.TenantID
                }
        }
        if tenantID == "" {
                var tenantUser models.TenantUser
                if err := s.DB.Where("user_id = ?", userID).First(&tenantUser).Error; err == nil {
                        tenantID = tenantUser.TenantID
                }
        }

        notif := models.Notification{
                TenantID: tenantID,
                UserID:   userID,
                EventID:  eventID,
                Title:    title,
                Message:  message,
                Type:     eventType,
                Category: category,
                Data:     dataStr,
                IsRead:   false,
        }

        return s.DB.Create(&notif).Error
}

// GetNotifications retrieves paginated notifications for a user.
func (s *NotificationService) GetNotifications(userID string, page int, perPage int, unreadOnly bool) ([]models.Notification, int64, error) {
        if page < 1 {
                page = 1
        }
        if perPage < 1 || perPage > 100 {
                perPage = 20
        }
        offset := (page - 1) * perPage

        var notifications []models.Notification
        var total int64

        query := s.DB.Model(&models.Notification{}).Where("user_id = ?", userID)
        if unreadOnly {
                query = query.Where("is_read = ?", false)
        }

        query.Count(&total)
        err := query.
                Order("created_at DESC").
                Limit(perPage).
                Offset(offset).
                Find(&notifications).Error

        return notifications, total, err
}

// MarkAsRead marks a single notification as read for a user.
func (s *NotificationService) MarkAsRead(notificationID string, userID string) error {
        result := s.DB.Model(&models.Notification{}).
                Where("id = ? AND user_id = ?", notificationID, userID).
                Update("is_read", true)

        if result.Error != nil {
                return result.Error
        }
        if result.RowsAffected == 0 {
                return gorm.ErrRecordNotFound
        }
        return nil
}

// MarkAllAsRead marks all notifications as read for a user.
func (s *NotificationService) MarkAllAsRead(userID string) error {
        return s.DB.Model(&models.Notification{}).
                Where("user_id = ? AND is_read = ?", userID, false).
                Update("is_read", true).Error
}

// GetUnreadCount returns the count of unread notifications for a user.
func (s *NotificationService) GetUnreadCount(userID string) (int64, error) {
        var count int64
        err := s.DB.Model(&models.Notification{}).
                Where("user_id = ? AND is_read = ?", userID, false).
                Count(&count).Error
        return count, err
}
