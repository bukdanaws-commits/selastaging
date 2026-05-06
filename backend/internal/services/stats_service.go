package services

import (
	"github.com/bukdanaws-commits/seleevent/backend/internal/models"
	"gorm.io/gorm"
)

// LiveStats holds real-time event statistics.
type LiveStats struct {
	TotalTicketsPaid  int64   `json:"totalTicketsPaid"`
	TotalRedeemed     int64   `json:"totalRedeemed"`
	TotalInside       int64   `json:"totalInside"`
	TotalOutside      int64   `json:"totalOutside"`
	TotalExited       int64   `json:"totalExited"`
	TotalNotRedeemed  int64   `json:"totalNotRedeemed"`
	TotalGateScans    int64   `json:"totalGateScans"`
	TotalReentries    int64   `json:"totalReentries"`
	ActiveCounters    int64   `json:"activeCounters"`
	ActiveGates       int64   `json:"activeGates"`
	TotalCounterStaff int64   `json:"totalCounterStaff"`
	TotalGateStaff    int64   `json:"totalGateStaff"`
	OccupancyRate     float64 `json:"occupancyRate"`
	TotalRevenue      int64   `json:"totalRevenue"`
}

// DashboardKPIs holds dashboard KPI data.
type DashboardKPIs struct {
	TotalRevenue        int64   `json:"totalRevenue"`
	TotalTicketsSold    int64   `json:"totalTicketsSold"`
	TotalOrders         int64   `json:"totalOrders"`
	PaidOrders          int64   `json:"paidOrders"`
	PendingOrders       int64   `json:"pendingOrders"`
	TotalUsers          int64   `json:"totalUsers"`
	TotalQuota          int64   `json:"totalQuota"`
	TicketsRedeemed     int64   `json:"ticketsRedeemed"`
	TicketsInside       int64   `json:"ticketsInside"`
	PendingVerifications int64  `json:"pendingVerifications"`
	AvgVerificationTime float64 `json:"avgVerificationTime"`
	OccupancyRate       float64 `json:"occupancyRate"`
}

// DashboardStats holds combined dashboard data.
type DashboardStats struct {
	KPIs      *DashboardKPIs `json:"kpis"`
	LiveStats *LiveStats     `json:"liveStats"`
}

// StatsService handles statistics and aggregation queries.
type StatsService struct {
	DB *gorm.DB
}

// NewStatsService creates a new StatsService.
func NewStatsService(db *gorm.DB) *StatsService {
	return &StatsService{DB: db}
}

// GetLiveStats aggregates real-time statistics for an event.
func (s *StatsService) GetLiveStats(eventID string) (*LiveStats, error) {
	stats := &LiveStats{}

	// Total tickets from paid orders
	s.DB.Model(&models.Ticket{}).
		Joins("JOIN orders ON orders.id = tickets.order_id").
		Where("orders.event_id = ? AND orders.status = ?", eventID, "paid").
		Count(&stats.TotalTicketsPaid)

	// Ticket status counts
	s.DB.Model(&models.Ticket{}).
		Joins("JOIN orders ON orders.id = tickets.order_id").
		Where("orders.event_id = ?", eventID).
		Where("tickets.status = ?", "redeemed").
		Count(&stats.TotalRedeemed)

	s.DB.Model(&models.Ticket{}).
		Joins("JOIN orders ON orders.id = tickets.order_id").
		Where("orders.event_id = ?", eventID).
		Where("tickets.status = ?", "inside").
		Count(&stats.TotalInside)

	s.DB.Model(&models.Ticket{}).
		Joins("JOIN orders ON orders.id = tickets.order_id").
		Where("orders.event_id = ?", eventID).
		Where("tickets.status = ?", "outside").
		Count(&stats.TotalOutside)

	// Not redeemed: active status from paid orders
	s.DB.Model(&models.Ticket{}).
		Joins("JOIN orders ON orders.id = tickets.order_id").
		Where("orders.event_id = ? AND orders.status = ? AND tickets.status = ?", eventID, "paid", "active").
		Count(&stats.TotalNotRedeemed)

	// Gate scans from today (across all gates for this event)
	s.DB.Model(&models.GateLog{}).
		Joins("JOIN gates ON gates.id = gate_logs.gate_id").
		Where("gates.event_id = ?", eventID).
		Count(&stats.TotalGateScans)

	// Reentries: tickets with more than 1 IN gate log
	subQuery := s.DB.Model(&models.GateLog{}).
		Select("ticket_id, COUNT(*) as cnt").
		Where("action = ?", "IN").
		Group("ticket_id").
		Having("cnt > ?", 1)
	s.DB.Table("(?) as sub", subQuery).Count(&stats.TotalReentries)

	// Active counters and gates
	s.DB.Model(&models.Counter{}).
		Where("event_id = ? AND status = ?", eventID, "active").
		Count(&stats.ActiveCounters)

	s.DB.Model(&models.Gate{}).
		Where("event_id = ? AND status = ?", eventID, "active").
		Count(&stats.ActiveGates)

	// Staff counts
	s.DB.Model(&models.CounterStaff{}).
		Joins("JOIN counters ON counters.id = counter_staff.counter_id").
		Where("counters.event_id = ? AND counter_staff.status = ?", eventID, "active").
		Count(&stats.TotalCounterStaff)

	s.DB.Model(&models.GateStaff{}).
		Joins("JOIN gates ON gates.id = gate_staff.gate_id").
		Where("gates.event_id = ? AND gate_staff.status = ?", eventID, "active").
		Count(&stats.TotalGateStaff)

	// Occupancy rate
	var event models.Event
	if s.DB.Where("id = ?", eventID).First(&event).Error == nil && event.Capacity > 0 {
		stats.OccupancyRate = float64(stats.TotalInside) / float64(event.Capacity) * 100
	}

	return stats, nil
}

// GetDashboardStats returns combined dashboard statistics.
func (s *StatsService) GetDashboardStats(eventID string) (*DashboardStats, error) {
	live, err := s.GetLiveStats(eventID)
	if err != nil {
		return nil, err
	}

	kpis := &DashboardKPIs{}

	// Revenue from paid orders
	s.DB.Model(&models.Order{}).
		Where("event_id = ? AND status = ?", eventID, "paid").
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&kpis.TotalRevenue)

	// Orders
	s.DB.Model(&models.Order{}).
		Where("event_id = ?", eventID).
		Count(&kpis.TotalOrders)

	s.DB.Model(&models.Order{}).
		Where("event_id = ? AND status = ?", eventID, "paid").
		Count(&kpis.PaidOrders)

	s.DB.Model(&models.Order{}).
		Where("event_id = ? AND status = ?", eventID, "pending").
		Count(&kpis.PendingOrders)

	// Users
	s.DB.Model(&models.User{}).Count(&kpis.TotalUsers)

	// Quota
	s.DB.Model(&models.TicketType{}).
		Where("event_id = ?", eventID).
		Select("COALESCE(SUM(quota), 0)").
		Scan(&kpis.TotalQuota)

	// Tickets sold (all tickets from paid orders)
	kpis.TotalTicketsSold = live.TotalTicketsPaid

	// Ticket status counts
	kpis.TicketsRedeemed = live.TotalRedeemed
	kpis.TicketsInside = live.TotalInside

	// Occupancy rate
	kpis.OccupancyRate = live.OccupancyRate

	return &DashboardStats{
		KPIs:      kpis,
		LiveStats: live,
	}, nil
}
