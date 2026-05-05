package handlers

import (
	"github.com/bukdanaws-commits/seleevent/backend/internal/services"
	"github.com/bukdanaws-commits/seleevent/backend/pkg/response"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ─── Order Handler ───────────────────────────────────────────────────────────

// createOrderRequest is the request body for creating an order.
type createOrderRequest struct {
	EventID string                   `json:"eventId"`
	Items   []services.OrderItemInput `json:"items"`
}

// CreateOrder handles POST /api/v1/orders
func CreateOrder(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(string)
		if !ok {
			return response.Unauthorized(c, "Not authenticated")
		}

		var req createOrderRequest
		if err := c.BodyParser(&req); err != nil {
			return response.BadRequest(c, "Invalid request body")
		}

		if req.EventID == "" {
			return response.BadRequest(c, "eventId is required")
		}
		if len(req.Items) == 0 {
			return response.BadRequest(c, "At least one item is required")
		}

		// Validate items
		for i, item := range req.Items {
			if item.TicketTypeID == "" {
				return response.BadRequest(c, "ticketTypeId is required for each item")
			}
			if item.Quantity <= 0 {
				return response.BadRequest(c, "quantity must be greater than 0 for each item")
			}
			// Set defaults for attendee info if not provided
			if req.Items[i].AttendeeName == "" {
				req.Items[i].AttendeeName = ""
			}
			if req.Items[i].AttendeeEmail == "" {
				req.Items[i].AttendeeEmail = ""
			}
		}

		orderService := services.NewOrderService(db)
		order, err := orderService.CreateOrder(userID, req.EventID, req.Items)
		if err != nil {
			return response.BadRequest(c, err.Error())
		}

		return response.Created(c, "Order created successfully", order)
	}
}

// GetUserOrders handles GET /api/v1/orders
func GetUserOrders(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(string)
		if !ok {
			return response.Unauthorized(c, "Not authenticated")
		}

		orderService := services.NewOrderService(db)
		orders, err := orderService.GetOrdersByUser(userID)
		if err != nil {
			return response.InternalError(c, "Failed to retrieve orders")
		}

		return response.OK(c, orders)
	}
}

// GetOrderDetail handles GET /api/v1/orders/:orderId
func GetOrderDetail(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(string)
		if !ok {
			return response.Unauthorized(c, "Not authenticated")
		}

		orderID := c.Params("orderId")
		if orderID == "" {
			return response.BadRequest(c, "orderId is required")
		}

		orderService := services.NewOrderService(db)
		order, err := orderService.GetOrderByID(orderID)
		if err != nil {
			return response.NotFound(c, "Order not found")
		}

		// Verify the order belongs to the user
		if order.UserID != userID {
			return response.Forbidden(c, "You do not have access to this order")
		}

		return response.OK(c, order)
	}
}

// CancelOrder handles POST /api/v1/orders/:orderId/cancel
func CancelOrder(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(string)
		if !ok {
			return response.Unauthorized(c, "Not authenticated")
		}

		orderID := c.Params("orderId")
		if orderID == "" {
			return response.BadRequest(c, "orderId is required")
		}

		orderService := services.NewOrderService(db)
		if err := orderService.CancelOrder(orderID, userID); err != nil {
			return response.BadRequest(c, err.Error())
		}

		return response.Success(c, "Order cancelled successfully", nil)
	}
}
