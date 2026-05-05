package handlers

import (
        "github.com/bukdanaws-commits/seleevent/backend/internal/services"
        "github.com/bukdanaws-commits/seleevent/backend/pkg/response"
        "github.com/gofiber/fiber/v2"
        "gorm.io/gorm"
)

// GetNotifications handles GET /api/v1/notifications
// List user notifications with pagination.
func GetNotifications(db *gorm.DB) fiber.Handler {
        return func(c *fiber.Ctx) error {
                userID, ok := c.Locals("userID").(string)
                if !ok || userID == "" {
                        return response.Unauthorized(c, "User not authenticated")
                }

                page := c.QueryInt("page", 1)
                perPage := c.QueryInt("perPage", 20)
                unreadOnly := c.QueryBool("unreadOnly", false)

                if page < 1 {
                        page = 1
                }
                if perPage < 1 || perPage > 100 {
                        perPage = 20
                }

                notifService := services.NewNotificationService(db)
                notifications, total, err := notifService.GetNotifications(userID, page, perPage, unreadOnly)
                if err != nil {
                        return response.InternalError(c, "Failed to retrieve notifications")
                }

                // Get unread count for metadata
                unreadCount, _ := notifService.GetUnreadCount(userID)

                return c.JSON(response.APIResponse{
                        Success: true,
                        Data: fiber.Map{
                                "notifications": notifications,
                                "unreadCount":   unreadCount,
                        },
                        Meta: &response.Meta{
                                Page:       page,
                                PerPage:    perPage,
                                Total:      total,
                                TotalPages: totalPages(int(total), perPage),
                        },
                })
        }
}

// MarkNotificationRead handles PATCH /api/v1/notifications/:id/read
func MarkNotificationRead(db *gorm.DB) fiber.Handler {
        return func(c *fiber.Ctx) error {
                userID, ok := c.Locals("userID").(string)
                if !ok || userID == "" {
                        return response.Unauthorized(c, "User not authenticated")
                }

                notificationID := c.Params("id")
                if notificationID == "" {
                        return response.BadRequest(c, "Notification ID is required")
                }

                notifService := services.NewNotificationService(db)
                err := notifService.MarkAsRead(notificationID, userID)
                if err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Notification not found")
                        }
                        return response.InternalError(c, "Failed to mark notification as read")
                }

                return response.Success(c, "Notification marked as read", nil)
        }
}

// MarkAllNotificationsRead handles POST /api/v1/notifications/read-all
func MarkAllNotificationsRead(db *gorm.DB) fiber.Handler {
        return func(c *fiber.Ctx) error {
                userID, ok := c.Locals("userID").(string)
                if !ok || userID == "" {
                        return response.Unauthorized(c, "User not authenticated")
                }

                notifService := services.NewNotificationService(db)
                if err := notifService.MarkAllAsRead(userID); err != nil {
                        return response.InternalError(c, "Failed to mark all notifications as read")
                }

                return response.Success(c, "All notifications marked as read", nil)
        }
}

// totalPages is a helper to compute total pages.
func totalPages(total int, perPage int) int {
        pages := total / perPage
        if total%perPage > 0 {
                pages++
        }
        return pages
}
