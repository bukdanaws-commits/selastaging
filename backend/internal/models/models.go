package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ─── BASE MODELS ─────────────────────────────────────────────────────────────

// BaseModel contains common fields with id, createdAt, updatedAt.
// ID is a string UUID generated via BeforeCreate hook.
type BaseModel struct {
	ID        string    `gorm:"primaryKey;type:text" json:"id"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

// BaseModelNoUpdate contains common fields with id and createdAt only (no updatedAt).
type BaseModelNoUpdate struct {
	ID        string    `gorm:"primaryKey;type:text" json:"id"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

// BeforeCreate generates a UUID for the ID field before inserting.
func (m *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}

func (m *BaseModelNoUpdate) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}

// ─── USER ───────────────────────────────────────────────────────────────────

type User struct {
	BaseModel
	GoogleID    string     `gorm:"uniqueIndex;not null" json:"googleId"`
	Email       string     `gorm:"uniqueIndex;not null" json:"email"`
	Name        string     `gorm:"not null" json:"name"`
	Avatar      *string    `gorm:"type:text" json:"avatar,omitempty"`
	Phone       *string    `json:"phone,omitempty"`
	Role        string     `gorm:"default:PARTICIPANT;not null" json:"role"`
	OrganizerID *string    `gorm:"index" json:"organizerId,omitempty"`
	Status      string     `gorm:"default:active;not null" json:"status"`
	LastLoginAt *time.Time `json:"lastLoginAt,omitempty"`

	// Relations
	Orders       []Order        `gorm:"foreignKey:UserID" json:"orders,omitempty"`
	CounterStaff []CounterStaff `gorm:"foreignKey:UserID" json:"counterStaff,omitempty"`
	GateStaff    []GateStaff    `gorm:"foreignKey:UserID" json:"gateStaff,omitempty"`
	Redemptions  []Redemption   `gorm:"foreignKey:StaffID" json:"redemptions,omitempty"`
	GateLogs     []GateLog      `gorm:"foreignKey:StaffID" json:"gateLogs,omitempty"`
	AuditLogs    []AuditLog     `gorm:"foreignKey:UserID" json:"auditLogs,omitempty"`
}

// ─── TENANT (SaaS Multi-Tenant) ────────────────────────────────────────────

type Tenant struct {
	BaseModel
	Name           string     `gorm:"not null" json:"name"`
	Slug           string     `gorm:"uniqueIndex;not null" json:"slug"`
	Logo           *string    `gorm:"type:text" json:"logo,omitempty"`
	PrimaryColor   string     `gorm:"default:#00A39D;not null" json:"primaryColor"`
	SecondaryColor string     `gorm:"default:#F8AD3C;not null" json:"secondaryColor"`
	IsActive       bool       `gorm:"default:true;not null" json:"isActive"`
	MaxEvents      int        `gorm:"default:1;not null" json:"maxEvents"`
	MaxTickets     int        `gorm:"default:1000;not null" json:"maxTickets"`
	TrialEndsAt    *time.Time `json:"trialEndsAt,omitempty"`
	ShardKey       *string    `json:"shardKey,omitempty"`

	// Relations
	Events        []Event        `gorm:"foreignKey:TenantID" json:"events,omitempty"`
	TenantUsers   []TenantUser   `gorm:"foreignKey:TenantID" json:"tenantUsers,omitempty"`
	Subscriptions []Subscription `gorm:"foreignKey:TenantID" json:"subscriptions,omitempty"`
	Invoices      []Invoice      `gorm:"foreignKey:TenantID" json:"invoices,omitempty"`
}

// ─── SUBSCRIPTION (SaaS Billing) ────────────────────────────────────────────

type Subscription struct {
	BaseModel
	TenantID           string     `gorm:"index;not null" json:"tenantId"`
	Plan               string     `gorm:"not null" json:"plan"`
	Status             string     `gorm:"default:trial;not null" json:"status"`
	CurrentPeriodStart time.Time  `gorm:"not null" json:"currentPeriodStart"`
	CurrentPeriodEnd   time.Time  `gorm:"not null" json:"currentPeriodEnd"`
	CancelledAt        *time.Time `json:"cancelledAt,omitempty"`

	// Relations
	Tenant   Tenant    `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Invoices []Invoice `gorm:"foreignKey:SubscriptionID" json:"invoices,omitempty"`
}

// ─── INVOICE (Tenant Invoicing) ─────────────────────────────────────────────

type Invoice struct {
	BaseModel
	TenantID       string     `gorm:"index;not null" json:"tenantId"`
	SubscriptionID *string    `gorm:"index" json:"subscriptionId,omitempty"`
	AmountCents    int        `gorm:"not null" json:"amountCents"`
	Currency       string     `gorm:"default:IDR;not null" json:"currency"`
	Status         string     `gorm:"default:draft;not null" json:"status"`
	DueDate        *time.Time `json:"dueDate,omitempty"`
	PaidAt         *time.Time `json:"paidAt,omitempty"`
	PdfURL         *string    `gorm:"type:text" json:"pdfUrl,omitempty"`

	// Relations
	Tenant       Tenant       `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Subscription Subscription `gorm:"foreignKey:SubscriptionID" json:"subscription,omitempty"`
}

// ─── TENANT USER ────────────────────────────────────────────────────────────

type TenantUser struct {
	BaseModel
	UserID   string    `gorm:"uniqueIndex:idx_user_tenant;not null" json:"userId"`
	TenantID string    `gorm:"uniqueIndex:idx_user_tenant;not null" json:"tenantId"`
	Role     string    `gorm:"default:PARTICIPANT;not null" json:"role"`
	IsActive bool      `gorm:"default:true;not null" json:"isActive"`
	JoinedAt time.Time `gorm:"autoCreateTime" json:"joinedAt"`

	// Relations
	Tenant Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
}

// ─── EVENT ──────────────────────────────────────────────────────────────────

type Event struct {
	BaseModel
	TenantID    string         `gorm:"index;not null" json:"tenantId"`
	OrganizerID *string        `gorm:"index" json:"organizerId,omitempty"`
	Slug        string         `gorm:"uniqueIndex;not null" json:"slug"`
	Title       string         `gorm:"not null" json:"title"`
	Subtitle    *string        `gorm:"type:text" json:"subtitle,omitempty"`
	Date        time.Time      `gorm:"not null" json:"date"`
	DoorsOpen   *time.Time     `json:"doorsOpen,omitempty"`
	Venue       string         `gorm:"not null" json:"venue"`
	City        string         `gorm:"not null" json:"city"`
	Address     *string        `gorm:"type:text" json:"address,omitempty"`
	Capacity    int            `gorm:"not null" json:"capacity"`
	Status      string         `gorm:"index;default:draft;not null" json:"status"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deletedAt,omitempty"`

	// Relations
	Tenant      *Tenant      `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	TicketTypes []TicketType `gorm:"foreignKey:EventID" json:"ticketTypes,omitempty"`
	Orders      []Order      `gorm:"foreignKey:EventID" json:"orders,omitempty"`
	Counters    []Counter    `gorm:"foreignKey:EventID" json:"counters,omitempty"`
	Gates       []Gate       `gorm:"foreignKey:EventID" json:"gates,omitempty"`
}

// ─── TICKET TYPE ────────────────────────────────────────────────────────────

type TicketType struct {
	BaseModel
	TenantID    string         `gorm:"index;not null" json:"tenantId"`
	EventID     string         `gorm:"index;not null" json:"eventId"`
	Name        string         `gorm:"not null" json:"name"`
	Description *string        `gorm:"type:text" json:"description,omitempty"`
	Price       int            `gorm:"not null" json:"price"`
	Quota       int            `gorm:"not null" json:"quota"`
	Sold        int            `gorm:"default:0;not null" json:"sold"`
	Tier        string         `gorm:"default:floor;not null" json:"tier"`
	Zone        *string        `json:"zone,omitempty"`
	Emoji       *string        `json:"emoji,omitempty"`
	Benefits    *string        `gorm:"type:text" json:"benefits,omitempty"`
	PlatformFee float64        `gorm:"type:numeric(5,2);default:0;not null" json:"platformFee"`
	SeatConfig  *string        `gorm:"type:text" json:"seatConfig,omitempty"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deletedAt,omitempty"`

	// Relations
	Event  Event       `gorm:"foreignKey:EventID" json:"event,omitempty"`
	Seats  []Seat      `gorm:"foreignKey:TicketTypeID" json:"seats,omitempty"`
	Orders []OrderItem `gorm:"foreignKey:TicketTypeID" json:"orderItems,omitempty"`
}

// ─── SEAT (Assigned Seating Master) ─────────────────────────────────────────

type Seat struct {
	BaseModel
	TenantID     string `gorm:"index;not null" json:"tenantId"`
	EventID      string `gorm:"index;not null" json:"eventId"`
	TicketTypeID string `gorm:"index;not null" json:"ticketTypeId"`
	Section      string `gorm:"not null" json:"section"`
	Row          string `gorm:"not null" json:"row"`
	Number       string `gorm:"not null" json:"number"`
	Label        string `gorm:"not null" json:"label"`
	Status       string `gorm:"index;default:available;not null" json:"status"`

	// Relations
	Tenant     Tenant     `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Event      Event      `gorm:"foreignKey:EventID" json:"event,omitempty"`
	TicketType TicketType `gorm:"foreignKey:TicketTypeID" json:"ticketType,omitempty"`
}

// ─── ORDER ──────────────────────────────────────────────────────────────────

type Order struct {
	BaseModel
	TenantID              string         `gorm:"index;not null" json:"tenantId"`
	OrderCode             string         `gorm:"uniqueIndex;not null" json:"orderCode"`
	UserID                string         `gorm:"index;not null" json:"userId"`
	EventID               string         `gorm:"index;not null" json:"eventId"`
	TotalAmount           int            `gorm:"not null" json:"totalAmount"`
	Status                string         `gorm:"index;default:pending;not null" json:"status"`
	PaymentType           *string        `json:"paymentType,omitempty"`
	PaymentMethod         *string        `json:"paymentMethod,omitempty"`
	PaymentChannel        *string        `json:"paymentChannel,omitempty"`
	DokuTransactionID     *string        `json:"dokuTransactionId,omitempty"`
	PaymentTransactionID  *string        `json:"paymentTransactionId,omitempty"`
	ExpiresAt             *time.Time     `json:"expiresAt,omitempty"`
	PaidAt                *time.Time     `json:"paidAt,omitempty"`
	DeletedAt             gorm.DeletedAt `gorm:"index" json:"deletedAt,omitempty"`

	// Relations
	User    User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Event   Event       `gorm:"foreignKey:EventID" json:"event,omitempty"`
	Items   []OrderItem `gorm:"foreignKey:OrderID" json:"items,omitempty"`
	Tickets []Ticket    `gorm:"foreignKey:OrderID" json:"tickets,omitempty"`
}

// ─── ORDER ITEM ─────────────────────────────────────────────────────────────

type OrderItem struct {
	BaseModel
	TenantID       string `gorm:"index;not null" json:"tenantId"`
	OrderID        string `gorm:"index;not null" json:"orderId"`
	TicketTypeID   string `gorm:"index;not null" json:"ticketTypeId"`
	Quantity       int    `gorm:"not null" json:"quantity"`
	PricePerTicket int    `gorm:"not null" json:"pricePerTicket"`
	Subtotal       int    `gorm:"not null" json:"subtotal"`

	// Relations
	Order      Order      `gorm:"foreignKey:OrderID" json:"order,omitempty"`
	TicketType TicketType `gorm:"foreignKey:TicketTypeID" json:"ticketType,omitempty"`
}

// ─── TICKET ─────────────────────────────────────────────────────────────────

type Ticket struct {
	BaseModel
	TenantID       string     `gorm:"index;not null" json:"tenantId"`
	OrderID        string     `gorm:"index;not null" json:"orderId"`
	TicketTypeID   string     `gorm:"index;not null" json:"ticketTypeId"`
	EventID        string     `gorm:"index;not null" json:"eventId"`
	SeatID         *string    `gorm:"index" json:"seatId,omitempty"`
	TicketCode     string     `gorm:"uniqueIndex;not null" json:"ticketCode"`
	AttendeeName   string     `gorm:"not null" json:"attendeeName"`
	AttendeeEmail  string     `gorm:"index;not null" json:"attendeeEmail"`
	SeatLabel      *string    `json:"seatLabel,omitempty"`
	QrData         string     `gorm:"not null" json:"qrData"`
	WristbandCode  *string    `gorm:"uniqueIndex" json:"wristbandCode,omitempty"`
	EventTitle     string     `gorm:"not null" json:"eventTitle"`
	TicketTypeName string     `gorm:"not null" json:"ticketTypeName"`
	Status         string     `gorm:"index;default:active;not null" json:"status"`
	RedeemedAt     *time.Time `json:"redeemedAt,omitempty"`
	RedeemedBy     *string    `json:"redeemedBy,omitempty"`

	// Relations
	Order       Order        `gorm:"foreignKey:OrderID" json:"order,omitempty"`
	Seat        *Seat        `gorm:"foreignKey:SeatID" json:"seat,omitempty"`
	Redemptions []Redemption `gorm:"foreignKey:TicketID" json:"redemptions,omitempty"`
	GateLogs    []GateLog    `gorm:"foreignKey:TicketID" json:"gateLogs,omitempty"`
}

// ─── COUNTER (Wristband Redemption Booth) ───────────────────────────────────

type Counter struct {
	BaseModel
	TenantID string     `gorm:"index;not null" json:"tenantId"`
	EventID  string     `gorm:"index;not null" json:"eventId"`
	Name     string     `gorm:"not null" json:"name"`
	Location *string    `gorm:"type:text" json:"location,omitempty"`
	Capacity int        `gorm:"default:500;not null" json:"capacity"`
	Status   string     `gorm:"default:inactive;not null" json:"status"`
	OpenAt   *time.Time `json:"openAt,omitempty"`
	CloseAt  *time.Time `json:"closeAt,omitempty"`

	// Relations
	Event       Event          `gorm:"foreignKey:EventID" json:"event,omitempty"`
	Staff       []CounterStaff `gorm:"foreignKey:CounterID" json:"staff,omitempty"`
	Redemptions []Redemption   `gorm:"foreignKey:CounterID" json:"redemptions,omitempty"`
}

// ─── COUNTER STAFF ASSIGNMENT ───────────────────────────────────────────────

type CounterStaff struct {
	BaseModel
	TenantID   string    `gorm:"index;not null" json:"tenantId"`
	UserID     string    `gorm:"uniqueIndex:idx_user_counter;not null" json:"userId"`
	CounterID  string    `gorm:"uniqueIndex:idx_user_counter;not null" json:"counterId"`
	Shift      *string   `json:"shift,omitempty"`
	Status     string    `gorm:"default:active;not null" json:"status"`
	AssignedAt time.Time `gorm:"autoCreateTime" json:"assignedAt"`

	// Relations
	User    User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Counter Counter `gorm:"foreignKey:CounterID" json:"counter,omitempty"`
}

// ─── GATE (Entry/Exit Points) ───────────────────────────────────────────────

type Gate struct {
	BaseModel
	TenantID       string  `gorm:"index;not null" json:"tenantId"`
	EventID        string  `gorm:"index;not null" json:"eventId"`
	Name           string  `gorm:"not null" json:"name"`
	Type           string  `gorm:"default:entry;not null" json:"type"`
	Location       *string `gorm:"type:text" json:"location,omitempty"`
	MinAccessLevel *string `json:"minAccessLevel,omitempty"`
	CapacityPerMin int     `gorm:"default:30;not null" json:"capacityPerMin"`
	Status         string  `gorm:"default:inactive;not null" json:"status"`

	// Relations
	Event    Event       `gorm:"foreignKey:EventID" json:"event,omitempty"`
	Staff    []GateStaff `gorm:"foreignKey:GateID" json:"staff,omitempty"`
	GateLogs []GateLog   `gorm:"foreignKey:GateID" json:"gateLogs,omitempty"`
}

// ─── GATE STAFF ASSIGNMENT ──────────────────────────────────────────────────

type GateStaff struct {
	BaseModel
	TenantID   string    `gorm:"index;not null" json:"tenantId"`
	UserID     string    `gorm:"uniqueIndex:idx_user_gate;not null" json:"userId"`
	GateID     string    `gorm:"uniqueIndex:idx_user_gate;not null" json:"gateId"`
	Shift      *string   `json:"shift,omitempty"`
	Status     string    `gorm:"default:active;not null" json:"status"`
	AssignedAt time.Time `gorm:"autoCreateTime" json:"assignedAt"`

	// Relations
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Gate Gate `gorm:"foreignKey:GateID" json:"gate,omitempty"`
}

// ─── REDEMPTION (Wristband Exchange) ────────────────────────────────────────

type Redemption struct {
	BaseModel
	TenantID       string    `gorm:"index;not null" json:"tenantId"`
	TicketID       string    `gorm:"uniqueIndex;not null" json:"ticketId"`
	CounterID      string    `gorm:"index;not null" json:"counterId"`
	StaffID        string    `gorm:"index;not null" json:"staffId"`
	WristbandCode  string    `gorm:"not null" json:"wristbandCode"`
	WristbandColor string    `gorm:"not null" json:"wristbandColor"`
	WristbandType  string    `gorm:"not null" json:"wristbandType"`
	Notes          *string   `gorm:"type:text" json:"notes,omitempty"`
	RedeemedAt     time.Time `gorm:"autoCreateTime" json:"redeemedAt"`

	// Relations
	Ticket  Ticket  `gorm:"foreignKey:TicketID" json:"ticket,omitempty"`
	Counter Counter `gorm:"foreignKey:CounterID" json:"counter,omitempty"`
	Staff   User    `gorm:"foreignKey:StaffID" json:"staff,omitempty"`
}

// ─── GATE LOG (Entry/Exit Tracking) ────────────────────────────────────────

type GateLog struct {
	BaseModel
	TenantID  string    `gorm:"index;not null" json:"tenantId"`
	TicketID  string    `gorm:"index;not null" json:"ticketId"`
	GateID    string    `gorm:"index;not null" json:"gateId"`
	StaffID   string    `gorm:"index;not null" json:"staffId"`
	EventID   string    `gorm:"index;not null" json:"eventId"`
	Action    string    `gorm:"index;not null" json:"action"`
	Notes     *string   `gorm:"type:text" json:"notes,omitempty"`
	ScannedAt time.Time `gorm:"index;autoCreateTime" json:"scannedAt"`

	// Relations
	Ticket Ticket `gorm:"foreignKey:TicketID" json:"ticket,omitempty"`
	Gate   Gate   `gorm:"foreignKey:GateID" json:"gate,omitempty"`
	Staff  User   `gorm:"foreignKey:StaffID" json:"staff,omitempty"`
}

// ─── WRISTBAND INVENTORY ────────────────────────────────────────────────────

type WristbandInventory struct {
	BaseModel
	TenantID       string `gorm:"index;not null" json:"tenantId"`
	EventID        string `gorm:"uniqueIndex:idx_event_color;not null" json:"eventId"`
	Color          string `gorm:"uniqueIndex:idx_event_color;not null" json:"color"`
	ColorHex       string `gorm:"not null" json:"colorHex"`
	Type           string `gorm:"not null" json:"type"`
	TotalStock     int    `gorm:"default:0;not null" json:"totalStock"`
	UsedStock      int    `gorm:"default:0;not null" json:"usedStock"`
	RemainingStock int    `gorm:"default:0;not null" json:"remainingStock"`
}

// ─── NOTIFICATION ───────────────────────────────────────────────────────────

type Notification struct {
	ID        string    `gorm:"primaryKey;type:text" json:"id"`
	TenantID  string    `gorm:"index;not null" json:"tenantId"`
	UserID    string    `gorm:"index;not null" json:"userId"`
	EventID   string    `gorm:"index" json:"eventId,omitempty"`
	Title     string    `gorm:"size:255;not null" json:"title"`
	Message   string    `gorm:"type:text;not null" json:"message"`
	Type      string    `gorm:"size:50;default:info;not null" json:"type"` // info, warning, success, error
	Category  string    `gorm:"size:50" json:"category,omitempty"`         // order, redemption, gate, system, payment
	IsRead    bool      `gorm:"default:false;not null;index" json:"isRead"`
	Data      string    `gorm:"type:text" json:"data,omitempty"` // JSON string
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

// BeforeCreate generates a UUID for the ID field before inserting.
func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == "" {
		n.ID = uuid.New().String()
	}
	return nil
}

// ─── AUDIT LOG ──────────────────────────────────────────────────────────────

type AuditLog struct {
	BaseModelNoUpdate
	TenantID string  `gorm:"index;not null" json:"tenantId"`
	UserID   string  `gorm:"index;not null" json:"userId"`
	Action   string  `gorm:"not null" json:"action"`
	Module   string  `gorm:"index;not null" json:"module"`
	Details  *string `gorm:"type:text" json:"details,omitempty"`
	IP       *string `json:"ip,omitempty"`

	// Relations
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// ─── ORGANIZER ──────────────────────────────────────────────────────────────

type Organizer struct {
	BaseModel
	UserID   string  `gorm:"index;not null" json:"userId"`
	TenantID string  `gorm:"index;not null" json:"tenantId"`
	Status   string  `gorm:"default:pending;not null" json:"status"` // pending, approved, rejected

	// Relations
	User         User               `gorm:"foreignKey:UserID" json:"user,omitempty"`
	FeeConfig    *OrganizerFeeConfig `gorm:"foreignKey:OrganizerID" json:"feeConfig,omitempty"`
	BankAccounts []OrganizerBankAccount `gorm:"foreignKey:OrganizerID" json:"bankAccounts,omitempty"`
}

// ─── COUPON (matches ICoupon) ──────────────────────────────────────────────

type Coupon struct {
	BaseModel
	TenantID          string         `gorm:"index;not null" json:"tenantId"`
	OrganizerID       string         `gorm:"index;not null" json:"organizerId"`
	Code              string         `gorm:"uniqueIndex;not null" json:"code"`
	Name              string         `gorm:"not null" json:"name"`
	Description       *string        `gorm:"type:text" json:"description,omitempty"`
	DiscountType      string         `gorm:"not null" json:"discountType"` // percentage, nominal
	DiscountValue     float64        `gorm:"not null" json:"discountValue"`
	MaxDiscount       *float64       `json:"maxDiscount,omitempty"`
	Scope             string         `gorm:"not null" json:"scope"` // global, event
	EventID           *string        `gorm:"index" json:"eventId,omitempty"`
	CategoryConfigs   *string        `gorm:"type:text" json:"categoryConfigs,omitempty"` // JSON array
	UsageLimit        int            `gorm:"default:100;not null" json:"usageLimit"`
	UsageLimitPerUser int            `gorm:"default:1;not null" json:"usageLimitPerUser"`
	UsedCount         int            `gorm:"default:0;not null" json:"usedCount"`
	Status            string         `gorm:"default:active;not null" json:"status"`
	StartsAt          time.Time      `gorm:"not null" json:"startsAt"`
	ExpiresAt         time.Time      `gorm:"not null" json:"expiresAt"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"deletedAt,omitempty"`
}

// ─── COUPON USAGE (matches ICouponUsage) ───────────────────────────────────

type CouponUsage struct {
	BaseModelNoUpdate
	CouponID       string  `gorm:"index;not null" json:"couponId"`
	UserID         string  `gorm:"index;not null" json:"userId"`
	OrderID        string  `gorm:"index;not null" json:"orderId"`
	DiscountAmount float64 `gorm:"not null" json:"discountAmount"`
}

// ─── ORGANIZER BANK ACCOUNT (matches IOrganizerBankAccount) ────────────────

type OrganizerBankAccount struct {
	BaseModel
	OrganizerID   string `gorm:"index;not null" json:"organizerId"`
	BankName      string `gorm:"not null" json:"bankName"`
	AccountNumber string `gorm:"not null" json:"accountNumber"`
	AccountHolder string `gorm:"not null" json:"accountHolder"`
	IsVerified    bool   `gorm:"default:false;not null" json:"isVerified"`
	Status        string `gorm:"default:active;not null" json:"status"`
}

// ─── WITHDRAWAL REQUEST (matches IWithdrawalRequest) ───────────────────────

type WithdrawalRequest struct {
	BaseModel
	OrganizerID        string     `gorm:"index;not null" json:"organizerId"`
	OrganizerName      string     `gorm:"not null" json:"organizerName"`
	EventID            string     `gorm:"index;not null" json:"eventId"`
	EventCode          string     `json:"eventCode"`
	EventName          string     `json:"eventName"`
	Amount             float64    `gorm:"not null" json:"amount"`
	Fee                float64    `gorm:"default:0;not null" json:"fee"`
	NetAmount          float64    `gorm:"not null" json:"netAmount"`
	BankAccountID      string     `gorm:"index;not null" json:"bankAccountId"`
	BankName           string     `json:"bankName"`
	AccountNumber      string     `json:"accountNumber"`
	AccountHolder      string     `json:"accountHolder"`
	Status             string     `gorm:"index;default:pending;not null" json:"status"`
	Method             string     `gorm:"default:MANUAL;not null" json:"method"` // AUTO_DOKU, MANUAL
	ApprovedAt         *time.Time `json:"approvedAt,omitempty"`
	ApprovedBy         *string    `json:"approvedBy,omitempty"`
	RejectedAt         *time.Time `json:"rejectedAt,omitempty"`
	RejectedBy         *string    `json:"rejectedBy,omitempty"`
	RejectedReason     *string    `gorm:"type:text" json:"rejectedReason,omitempty"`
	TransferredAt      *time.Time `json:"transferredAt,omitempty"`
	TransferProof      *string    `gorm:"type:text" json:"transferProof,omitempty"`
	TransferNote       *string    `gorm:"type:text" json:"transferNote,omitempty"`
	CompletedAt        *time.Time `json:"completedAt,omitempty"`
	DisputeReason      *string    `gorm:"type:text" json:"disputeReason,omitempty"`
	DokuDisbursementID *string    `json:"dokuDisbursementId,omitempty"`
	DokuReferenceNo    *string    `json:"dokuReferenceNo,omitempty"`
	DokuStatus         *string    `json:"dokuStatus,omitempty"`
	FailureReason      *string    `gorm:"type:text" json:"failureReason,omitempty"`
}

// ─── PAYMENT LOG (matches IPaymentLog) ─────────────────────────────────────

type PaymentLog struct {
	BaseModelNoUpdate
	EventID               string     `gorm:"index;not null" json:"eventId"`
	OrderID               string     `gorm:"index;not null" json:"orderId"`
	OrderCode             string     `gorm:"not null" json:"orderCode"`
	TransactionID         string     `gorm:"not null" json:"transactionId"`
	PaymentMethod         string     `gorm:"not null" json:"paymentMethod"`
	PaymentChannel        string     `json:"paymentChannel"`
	Amount                float64    `gorm:"not null" json:"amount"`
	Currency              string     `gorm:"default:IDR;not null" json:"currency"`
	Status                string     `gorm:"index;default:pending;not null" json:"status"`
	PaidAt                *time.Time `json:"paidAt,omitempty"`
	ExpiredAt             *time.Time `json:"expiredAt,omitempty"`
	DokuResponseCode      *string    `json:"dokuResponseCode,omitempty"`
	NotificationReceivedAt *time.Time `json:"notificationReceivedAt,omitempty"`
	RawData               *string    `gorm:"type:text" json:"rawData,omitempty"`
}

// ─── ORGANIZER FEE CONFIG (matches IOrganizerFeeConfig) ────────────────────

type OrganizerFeeConfig struct {
	BaseModel
	OrganizerID   string  `gorm:"uniqueIndex;not null" json:"organizerId"`
	OrganizerName string  `gorm:"not null" json:"organizerName"`
	FeePercent    float64 `gorm:"type:numeric(5,2);default:5;not null" json:"feePercent"`
	IsApproved    bool    `gorm:"default:false;not null" json:"isApproved"`
}

// ─── REFUND ────────────────────────────────────────────────────────────────

type Refund struct {
	BaseModel
	OrganizerID     string     `gorm:"index;not null" json:"organizerId"`
	OrderID         string     `gorm:"index;not null" json:"orderId"`
	Amount          int        `gorm:"not null" json:"amount"`
	Reason          string     `gorm:"type:text;not null" json:"reason"`
	Status          string     `gorm:"index;default:pending;not null" json:"status"` // pending, approved, rejected, completed, failed
	ProcessedAt     *time.Time `json:"processedAt,omitempty"`
	CompletedAt     *time.Time `json:"completedAt,omitempty"`
	RejectionReason *string    `gorm:"type:text" json:"rejectionReason,omitempty"`
}

// ─── ALL MODELS ─────────────────────────────────────────────────────────────

// AllModels returns all GORM models for auto-migration.
func AllModels() []any {
	return []any{
		&User{},
		&Tenant{},
		&Subscription{},
		&Invoice{},
		&TenantUser{},
		&Event{},
		&TicketType{},
		&Seat{},
		&Order{},
		&OrderItem{},
		&Ticket{},
		&Counter{},
		&CounterStaff{},
		&Gate{},
		&GateStaff{},
		&Redemption{},
		&GateLog{},
		&WristbandInventory{},
		&Notification{},
		&AuditLog{},
		&Organizer{},
		&Coupon{},
		&CouponUsage{},
		&OrganizerBankAccount{},
		&WithdrawalRequest{},
		&PaymentLog{},
		&OrganizerFeeConfig{},
		&Refund{},
	}
}
