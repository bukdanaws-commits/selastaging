package main

import (
        "fmt"
        "log"
        "math/rand"
        "strings"
        "time"

        "github.com/bukdanaws-commits/seleevent/backend/internal/config"
        "github.com/bukdanaws-commits/seleevent/backend/internal/database"
        "github.com/bukdanaws-commits/seleevent/backend/internal/models"
        "github.com/google/uuid"
        "gorm.io/gorm"
)

const batchSize = 500

// ─── INDONESIAN NAME DATA ────────────────────────────────────────────────

var firstNames = []string{
        "Budi", "Andi", "Rizky", "Bayu", "Dimas", "Fajar", "Hendra", "Irfan",
        "Joko", "Kemal", "Lukman", "Mahendra", "Naufal", "Omar", "Prasetyo",
        "Rahmat", "Surya", "Teguh", "Umar", "Vino", "Wahyu", "Yusuf", "Zainal",
        "Ahmad", "Bambang", "Cahyo", "Denny", "Eko", "Firman", "Gunawan",
        "Agus", "Bram", "Dedi", "Galang", "Hasan", "Ismail", "Joni", "Krisna",
        "Lutfi", "Mukti", "Nanda", "Oki", "Panji", "Rudi", "Sandi", "Toni",
        "Rina", "Siti", "Dewi", "Ayu", "Putri", "Nurul", "Fitri", "Wulan",
        "Indah", "Lestari", "Sari", "Maya", "Nita", "Ratna", "Yanti", "Zahra",
        "Amelia", "Bella", "Citra", "Dina", "Elsa", "Fiona", "Gita", "Hana",
        "Intan", "Jasmine", "Kartika", "Laila", "Mega", "Nadia", "Olivia",
        "Putri", "Queen", "Rani", "Siska", "Tara", "Umi", "Vera", "Winda",
}

var lastNames = []string{
        "Santoso", "Wijaya", "Pratama", "Putra", "Hidayat", "Kurniawan",
        "Setiawan", "Hartono", "Suharto", "Wibowo", "Susanto", "Salim",
        "Nugroho", "Purnomo", "Wicaksono", "Prasetya", "Saputra", "Harahap",
        "Nasution", "Siregar", "Pangestu", "Budiman", "Rahardjo", "Suryadi",
        "Hakim", "Ismail", "Abdullah", "Rahman", "Hasan", "Syahputra",
        "Lubis", "Simatupang", "Sinaga", "Manurung", "Tampubolon", "Ginting",
        "Wulandari", "Anggraini", "Kusuma", "Permata", "Handayani", "Maharani",
        "Safitri", "Utami", "Nirmala", "Hartati", "Suryani", "Dewanti",
}

// ─── WRISTBAND COLOR MAPPING ────────────────────────────────────────────

type wristbandColorDef struct {
        Color    string
        ColorHex string
}

var wristbandColorMap = map[string]wristbandColorDef{
        "VVIP PIT": {Color: "Gold", ColorHex: "#FFD700"},
        "VIP ZONE": {Color: "Teal", ColorHex: "#00A39D"},
        "FESTIVAL": {Color: "Orange", ColorHex: "#F8AD3C"},
        "CAT 1":    {Color: "Merah", ColorHex: "#EF4444"},
        "CAT 2":    {Color: "Biru", ColorHex: "#3B82F6"},
        "CAT 3":    {Color: "Hijau", ColorHex: "#22C55E"},
        "CAT 4":    {Color: "Ungu", ColorHex: "#A855F7"},
        "CAT 5":    {Color: "Putih", ColorHex: "#F8FAFC"},
        "CAT 6":    {Color: "Kuning", ColorHex: "#EAB308"},
}

// ─── PAYMENT METHOD DEFINITIONS ─────────────────────────────────────────

type paymentMethodDef struct {
        PaymentType   string
        PaymentMethod string
        PaymentChannel string
}

// weightedPaymentMethods returns a payment method based on weighted random selection:
// VA=40%, E-Wallet=25%, QRIS=20%, CC=10%, CStore=5%
func weightedPaymentMethod(rng *rand.Rand) paymentMethodDef {
        vas := []paymentMethodDef{
                {"VA", "VIRTUAL_ACCOUNT", "BCA"},
                {"VA", "VIRTUAL_ACCOUNT", "BNI"},
                {"VA", "VIRTUAL_ACCOUNT", "BRI"},
                {"VA", "VIRTUAL_ACCOUNT", "Mandiri"},
                {"VA", "VIRTUAL_ACCOUNT", "Permata"},
                {"VA", "VIRTUAL_ACCOUNT", "CIMB"},
                {"VA", "VIRTUAL_ACCOUNT", "Danamon"},
                {"VA", "VIRTUAL_ACCOUNT", "BSI"},
        }
        ewallets := []paymentMethodDef{
                {"E-Wallet", "E_WALLET", "OVO"},
                {"E-Wallet", "E_WALLET", "DANA"},
                {"E-Wallet", "E_WALLET", "GoPay"},
                {"E-Wallet", "E_WALLET", "ShopeePay"},
                {"E-Wallet", "E_WALLET", "LinkAja"},
        }
        qris := paymentMethodDef{"QRIS", "QRIS", "QRIS"}
        ccs := []paymentMethodDef{
                {"CC", "CREDIT_CARD", "VISA"},
                {"CC", "CREDIT_CARD", "Mastercard"},
                {"CC", "CREDIT_CARD", "JCB"},
        }
        cstores := []paymentMethodDef{
                {"CStore", "CONVENIENCE_STORE", "Alfamart"},
                {"CStore", "CONVENIENCE_STORE", "Indomaret"},
        }

        r := rng.Intn(100)
        switch {
        case r < 40:
                return vas[rng.Intn(len(vas))]
        case r < 65:
                return ewallets[rng.Intn(len(ewallets))]
        case r < 85:
                return qris
        case r < 95:
                return ccs[rng.Intn(len(ccs))]
        default:
                return cstores[rng.Intn(len(cstores))]
        }
}

// ─── EVENT + TICKET TYPE DEFINITIONS ────────────────────────────────────

type eventDef struct {
        Slug     string
        Title    string
        Subtitle string
        Date     time.Time
        Venue    string
        City     string
        Address  string
        Capacity int
}

var eventDefs = []eventDef{
        {
                Slug: "sheila-on7-bandung", Title: "Sheila On 7 — BANDUNG",
                Subtitle: "Melompat Lebih Tinggi Tour 2026",
                Date:     time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC),
                Venue:    "Baros Field", City: "Bandung",
                Address: "Jl. Baros No.1, Cimahi, Jawa Barat 40511", Capacity: 12000,
        },
        {
                Slug: "sheila-on7-makassar", Title: "Sheila On 7 — MAKASSAR",
                Subtitle: "Melompat Lebih Tinggi Tour 2026",
                Date:     time.Date(2026, 6, 8, 12, 0, 0, 0, time.UTC),
                Venue:    "Pantai Losari Arena", City: "Makassar",
                Address: "Jl. Penghibur, Pantai Losari, Makassar 90173", Capacity: 12000,
        },
        {
                Slug: "sheila-on7-medan", Title: "Sheila On 7 — MEDAN",
                Subtitle: "Melompat Lebih Tinggi Tour 2026",
                Date:     time.Date(2026, 6, 15, 12, 0, 0, 0, time.UTC),
                Venue:    "Lapangan Merdeka Medan", City: "Medan",
                Address: "Jl. Balai Kota, Medan Bar., Kota Medan 20112", Capacity: 12000,
        },
        {
                Slug: "sheila-on7-jakarta", Title: "Sheila On 7 — JAKARTA",
                Subtitle: "Melompat Lebih Tinggi Tour 2026",
                Date:     time.Date(2026, 6, 22, 12, 0, 0, 0, time.UTC),
                Venue:    "GBK Madya Stadium", City: "Jakarta",
                Address: "Jl. Gatot Subroto, Senayan, Jakarta Pusat 10270", Capacity: 11950,
        },
        {
                Slug: "sheila-on7-balikpapan", Title: "Sheila On 7 — BALIKPAPAN",
                Subtitle: "Melompat Lebih Tinggi Tour 2026",
                Date:     time.Date(2026, 6, 29, 12, 0, 0, 0, time.UTC),
                Venue:    "Lapangan Merdeka BPN", City: "Balikpapan",
                Address: "Jl. Jend. Sudirman, Balikpapan Kota, Kaltim 76113", Capacity: 12000,
        },
}

// Ticket type base definitions (prices vary per event)
var ticketTypeNames = []string{"VVIP PIT", "VIP ZONE", "FESTIVAL", "CAT 1", "CAT 2", "CAT 3", "CAT 4", "CAT 5", "CAT 6"}
var ticketTypeQuotas = []int{170, 280, 1700, 1100, 1700, 1700, 2200, 1700, 1450}
var ticketTypeTiers = []string{"floor", "floor", "floor", "tribun", "tribun", "tribun", "tribun", "tribun", "tribun"}
var ticketTypeZones = []string{"PIT", "VIP", "Festival", "West", "East", "North", "South", "Corner-NW", "Corner-SE"}
var ticketTypeEmojis = []string{"👑", "⭐", "🎵", "🎟️", "🎫", "🎫", "🎟️", "🎟️", "🎫"}

// Prices per event city (matches seed-data.sql)
var eventTicketPrices = map[string][]int{
        "Bandung":     {3250000, 2600000, 2000000, 1600000, 1300000, 1000000, 750000, 500000, 300000},
        "Makassar":    {3000000, 2400000, 1850000, 1450000, 1150000, 900000, 700000, 450000, 275000},
        "Medan":       {3000000, 2400000, 1850000, 1450000, 1150000, 900000, 700000, 450000, 275000},
        "Jakarta":     {3500000, 2800000, 2200000, 1750000, 1400000, 1100000, 850000, 550000, 350000},
        "Balikpapan":  {2750000, 2200000, 1700000, 1350000, 1050000, 850000, 650000, 400000, 250000},
}

var ticketTypeDescriptions = []string{
        "Standing paling depan — barisan depan panggung",
        "Standing VIP — di belakang VVIP Pit",
        "General admission standing — bebas pilih posisi",
        "Tribun Bawah Kiri — kursi bernomor",
        "Tribun Tengah Kiri — kursi bernomor",
        "Tribun Tengah Kanan — kursi bernomor",
        "Tribun Atas Kanan — kursi bernomor",
        "Tribun Ujung Belakang — kursi bernomor",
        "Tribun Belakang — kursi bernomor",
}

var ticketTypeBenefits = []string{
        `["Standing paling depan (barrier VVIP)","Welcome drink + F&B gratis","Exclusive merchandise pack","Early entry 30 menit","Wristband premium (gold embossed)","Meet & Greet session","Photobooth area eksklusif","Lounge area dengan sofa dan AC"]`,
        `["Standing zone VIP","Dedicated bar & food stall","Merchandise discount 20%","Early entry 15 menit","Wristband VIP (teal embossed)"]`,
        `["General admission standing area","Bebas pilih posisi dalam area festival","Akses food court & merchandise area"]`,
        `["Kursi bernomor (assigned seating)","Tribun bawah kiri — view premium","Pemandangan stage jelas","Akses food court & merchandise"]`,
        `["Kursi bernomor (assigned seating)","Tribun tengah kiri — view baik","Akses food court & merchandise"]`,
        `["Kursi bernomor (assigned seating)","Tribun tengah kanan — view baik","Akses food court & merchandise"]`,
        `["Kursi bernomor (assigned seating)","Tribun atas kanan","Akses food court & merchandise"]`,
        `["Kursi bernomor (assigned seating)","Tribun ujung belakang","Akses food court & merchandise"]`,
        `["Kursi bernomor (assigned seating)","Tribun belakang","Akses food court & merchandise"]`,
}

// ─── HELPER TYPES ───────────────────────────────────────────────────────

type eventInfo struct {
        ID   string
        City string
        Date time.Time
}

type ticketTypeInfo struct {
        ID    string
        Name  string
        Price int
}

type counterInfo struct {
        ID      string
        EventID string
}

type gateInfo struct {
        ID      string
        EventID string
}

type orderResult struct {
        ID             string
        OrderCode      string
        EventID        string
        Status         string
        TotalAmount    int
        PaymentType    string
        PaymentMethod  string
        PaymentChannel string
        PaidAt         *time.Time
}

type ticketResult struct {
        ID             string
        OrderID        string
        TicketTypeID   string
        EventID        string
        Status         string
        WristbandCode  string
        TicketTypeName string
        AttendeeName   string
        AttendeeEmail  string
        EventDate      time.Time
}

// ─── MAIN ───────────────────────────────────────────────────────────────

func main() {
        config.Load()
        database.Connect()
        db := database.DB

        log.Println("Seeder starting...")

        // ── Phase 1: Base data ─────────────────────────────────────────────
        seedTenant(db)
        tenantID := getTenantID(db)
        users := seedUsers(db)
        seedTenantUsers(db, tenantID, users)
        seedSubscription(db, tenantID)

        // ── Phase 2: Events + related data ─────────────────────────────────
        events := seedAllEvents(db, tenantID)
        ttByEvent := seedAllTicketTypes(db, tenantID, events)
        counters := seedAllCounters(db, tenantID, events)
        gates := seedAllGates(db, tenantID, events)
        seedAllStaffAssignments(db, tenantID, counters, gates, users)
        seedAllWristbandInventory(db, tenantID, events)

        // ── Phase 3: Organizer (needed for coupons) ────────────────────────
        organizerID := seedOrganizer(db, tenantID, users)

        // ── Phase 4: Bulk data ─────────────────────────────────────────────
        var participantCount int64
        db.Model(&models.User{}).Where("role = ? AND google_id LIKE ?", "PARTICIPANT", "fake-%").Count(&participantCount)
        if participantCount > 1000 {
                log.Println("⏭️  Bulk participant data already exists, skipping bulk seeding")
                log.Println("✅ Seeding completed successfully!")
                return
        }

        rng := rand.New(rand.NewSource(42))

        participantIDs := seedBulkUsers(db, tenantID, rng)

        paidOrders, allTickets := seedBulkOrdersAndTickets(db, tenantID, events, ttByEvent, participantIDs, rng)

        // Get staff user IDs for redemptions and gate logs
        var rina models.User
        db.Where("google_id = ?", "google-counter").First(&rina)
        var bayu models.User
        db.Where("google_id = ?", "google-gate").First(&bayu)

        seedBulkRedemptions(db, tenantID, allTickets, counters, rina.ID, rng)
        seedBulkGateLogs(db, tenantID, allTickets, gates, bayu.ID, rng)
        seedBulkPaymentLogs(db, tenantID, paidOrders, rng)
        seedCoupons(db, tenantID, organizerID, events, rng)

        log.Println("✅ Seeding completed successfully!")
}

// ─── TENANT ─────────────────────────────────────────────────────────────

func seedTenant(db *gorm.DB) {
        var count int64
        db.Model(&models.Tenant{}).Where("slug = ?", "seleevent").Count(&count)
        if count > 0 {
                log.Println("⏭️  Tenant 'SeleEvent' already exists, skipping")
                return
        }
        tenant := models.Tenant{
                Name:           "SeleEvent",
                Slug:           "seleevent",
                PrimaryColor:   "#00A39D",
                SecondaryColor: "#F8AD3C",
                IsActive:       true,
                MaxEvents:      10,
                MaxTickets:     100000,
        }
        if err := db.Create(&tenant).Error; err != nil {
                log.Fatalf("Failed to seed tenant: %v", err)
        }
        log.Println("✅ Seeded tenant: SeleEvent")
}

func getTenantID(db *gorm.DB) string {
        var tenant models.Tenant
        if err := db.Where("slug = ?", "seleevent").First(&tenant).Error; err != nil {
                log.Fatalf("Failed to find tenant: %v", err)
        }
        return tenant.ID
}

// ─── USERS (base 6) ────────────────────────────────────────────────────

type seedUser struct {
        Role     string
        GoogleID string
}

func seedUsers(db *gorm.DB) map[string]seedUser {
        var count int64
        db.Model(&models.User{}).Where("email LIKE ?", "%@seleevent.id").Count(&count)
        if count > 0 {
                log.Println("⏭️  Base users already exist, skipping")
                existing := make(map[string]seedUser)
                var users []models.User
                db.Where("google_id LIKE ?", "google-%").Find(&users)
                for _, u := range users {
                        existing[u.Email] = seedUser{Role: u.Role, GoogleID: u.GoogleID}
                }
                return existing
        }

        userDefs := []struct {
                Name     string
                Email    string
                GoogleID string
                Role     string
                Status   string
        }{
                {"Bukdan Admin", "bukdan@seleevent.id", "google-superadmin", "SUPER_ADMIN", "active"},
                {"Rizky Pratama", "rizky@seleevent.id", "google-admin", "ADMIN", "active"},
                {"Andi Wijaya", "andi.wijaya@gmail.com", "google-organizer", "ORGANIZER", "active"},
                {"Rina Wulandari", "rina.w@gmail.com", "google-counter", "COUNTER_STAFF", "active"},
                {"Bayu Aditya", "bayu.a@gmail.com", "google-gate", "GATE_STAFF", "active"},
                {"Budi Santoso", "budi.santoso@gmail.com", "google-participant", "PARTICIPANT", "active"},
        }

        result := make(map[string]seedUser)
        for _, def := range userDefs {
                user := models.User{
                        Name:     def.Name,
                        Email:    def.Email,
                        GoogleID: def.GoogleID,
                        Role:     def.Role,
                        Status:   def.Status,
                }
                if err := db.Create(&user).Error; err != nil {
                        log.Fatalf("Failed to seed user %s: %v", def.Email, err)
                }
                result[def.Email] = seedUser{Role: def.Role, GoogleID: def.GoogleID}
        }
        log.Printf("✅ Seeded %d base users", len(userDefs))
        return result
}

// ─── TENANT USERS ───────────────────────────────────────────────────────

func seedTenantUsers(db *gorm.DB, tenantID string, users map[string]seedUser) {
        var count int64
        db.Model(&models.TenantUser{}).Where("tenant_id = ?", tenantID).Count(&count)
        if count > 0 {
                log.Println("⏭️  TenantUsers already exist, skipping")
                return
        }
        for email, info := range users {
                var user models.User
                if err := db.Where("email = ?", email).First(&user).Error; err != nil {
                        log.Fatalf("Failed to find user %s: %v", email, err)
                }
                tu := models.TenantUser{
                        UserID:   user.ID,
                        TenantID: tenantID,
                        Role:     info.Role,
                        IsActive: true,
                }
                if err := db.Create(&tu).Error; err != nil {
                        log.Fatalf("Failed to seed TenantUser for %s: %v", email, err)
                }
        }
        log.Printf("✅ Seeded %d tenant_users", len(users))
}

// ─── SUBSCRIPTION ───────────────────────────────────────────────────────

func seedSubscription(db *gorm.DB, tenantID string) {
        var count int64
        db.Model(&models.Subscription{}).Where("tenant_id = ?", tenantID).Count(&count)
        if count > 0 {
                log.Println("⏭️  Subscription already exists, skipping")
                return
        }
        now := time.Now()
        sub := models.Subscription{
                TenantID:           tenantID,
                Plan:               "enterprise",
                Status:             "active",
                CurrentPeriodStart: now,
                CurrentPeriodEnd:   now.AddDate(1, 0, 0),
        }
        if err := db.Create(&sub).Error; err != nil {
                log.Fatalf("Failed to seed subscription: %v", err)
        }
        log.Println("✅ Seeded subscription: enterprise (active)")
}

// ─── ALL EVENTS (5 cities) ──────────────────────────────────────────────

func seedAllEvents(db *gorm.DB, tenantID string) []eventInfo {
        var existing int64
        db.Model(&models.Event{}).Where("tenant_id = ?", tenantID).Count(&existing)
        if existing >= int64(len(eventDefs)) {
                log.Println("⏭️  All events already exist, skipping")
                var events []models.Event
                db.Where("tenant_id = ?", tenantID).Find(&events)
                var result []eventInfo
                for _, e := range events {
                        result = append(result, eventInfo{ID: e.ID, City: e.City, Date: e.Date})
                }
                return result
        }

        var result []eventInfo
        for _, def := range eventDefs {
                var count int64
                db.Model(&models.Event{}).Where("slug = ?", def.Slug).Count(&count)
                if count > 0 {
                        var ev models.Event
                        db.Where("slug = ?", def.Slug).First(&ev)
                        result = append(result, eventInfo{ID: ev.ID, City: ev.City, Date: ev.Date})
                        continue
                }
                doorsOpen := def.Date.Add(-7 * time.Hour) // doors open 7h before event (16:00 WIB if event is 19:00 WIB)
                ev := models.Event{
                        TenantID:  tenantID,
                        Slug:      def.Slug,
                        Title:     def.Title,
                        Subtitle:  &def.Subtitle,
                        Date:      def.Date,
                        DoorsOpen: &doorsOpen,
                        Venue:     def.Venue,
                        City:      def.City,
                        Address:   &def.Address,
                        Capacity:  def.Capacity,
                        Status:    "published",
                }
                if err := db.Create(&ev).Error; err != nil {
                        log.Fatalf("Failed to seed event %s: %v", def.Title, err)
                }
                result = append(result, eventInfo{ID: ev.ID, City: def.City, Date: def.Date})
                log.Printf("✅ Seeded event: %s", def.Title)
        }
        log.Printf("✅ Seeded %d events total", len(result))
        return result
}

// ─── ALL TICKET TYPES (9 per event = 45 total) ─────────────────────────

func seedAllTicketTypes(db *gorm.DB, tenantID string, events []eventInfo) map[string][]ticketTypeInfo {
        // Check total count
        var count int64
        db.Model(&models.TicketType{}).Count(&count)
        if count >= int64(len(eventDefs)*9) {
                log.Println("⏭️  All ticket types already exist, skipping")
                return loadTicketTypesFromDB(db, events)
        }

        result := make(map[string][]ticketTypeInfo)
        for _, ev := range events {
                prices, ok := eventTicketPrices[ev.City]
                if !ok {
                        log.Printf("⚠️  No prices defined for city %s, skipping", ev.City)
                        continue
                }
                for i, name := range ticketTypeNames {
                        var existing int64
                        db.Model(&models.TicketType{}).Where("event_id = ? AND name = ?", ev.ID, name).Count(&existing)
                        if existing > 0 {
                                continue
                        }
                        desc := ticketTypeDescriptions[i]
                        zone := ticketTypeZones[i]
                        emoji := ticketTypeEmojis[i]
                        benefits := ticketTypeBenefits[i]
                        tt := models.TicketType{
                                TenantID:    tenantID,
                                EventID:     ev.ID,
                                Name:        name,
                                Description: &desc,
                                Price:       prices[i],
                                Quota:       ticketTypeQuotas[i],
                                Sold:        0,
                                Tier:        ticketTypeTiers[i],
                                Zone:        &zone,
                                Emoji:       &emoji,
                                Benefits:    &benefits,
                                PlatformFee: 5.0,
                        }
                        if err := db.Create(&tt).Error; err != nil {
                                log.Fatalf("Failed to seed ticket type %s for %s: %v", name, ev.City, err)
                        }
                        result[ev.ID] = append(result[ev.ID], ticketTypeInfo{ID: tt.ID, Name: name, Price: prices[i]})
                }
        }
        log.Printf("✅ Seeded ticket types for %d events", len(events))
        return result
}

func loadTicketTypesFromDB(db *gorm.DB, events []eventInfo) map[string][]ticketTypeInfo {
        result := make(map[string][]ticketTypeInfo)
        for _, ev := range events {
                var tts []models.TicketType
                db.Where("event_id = ?", ev.ID).Find(&tts)
                for _, tt := range tts {
                        result[ev.ID] = append(result[ev.ID], ticketTypeInfo{ID: tt.ID, Name: tt.Name, Price: tt.Price})
                }
        }
        return result
}

// ─── ALL COUNTERS (3 per event = 15 total) ──────────────────────────────

func seedAllCounters(db *gorm.DB, tenantID string, events []eventInfo) []counterInfo {
        var count int64
        db.Model(&models.Counter{}).Count(&count)
        if count >= int64(len(events)*3) {
                log.Println("⏭️  All counters already exist, skipping")
                return loadCountersFromDB(db, events)
        }

        var result []counterInfo
        counterNames := []string{"Counter A", "Counter B", "Counter C"}
        counterLocations := []string{"Gate 1", "Gate 3", "Gate 5"}

        for _, ev := range events {
                for i, name := range counterNames {
                        loc := counterLocations[i]
                        c := models.Counter{
                                TenantID: tenantID,
                                EventID:  ev.ID,
                                Name:     name,
                                Location: &loc,
                                Capacity: 500,
                                Status:   "active",
                        }
                        if err := db.Create(&c).Error; err != nil {
                                log.Fatalf("Failed to seed counter %s for %s: %v", name, ev.City, err)
                        }
                        result = append(result, counterInfo{ID: c.ID, EventID: ev.ID})
                }
        }
        log.Printf("✅ Seeded %d counters", len(result))
        return result
}

func loadCountersFromDB(db *gorm.DB, events []eventInfo) []counterInfo {
        var result []counterInfo
        for _, ev := range events {
                var counters []models.Counter
                db.Where("event_id = ?", ev.ID).Find(&counters)
                for _, c := range counters {
                        result = append(result, counterInfo{ID: c.ID, EventID: ev.ID})
                }
        }
        return result
}

// ─── ALL GATES (4 per event = 20 total) ─────────────────────────────────

func seedAllGates(db *gorm.DB, tenantID string, events []eventInfo) []gateInfo {
        var count int64
        db.Model(&models.Gate{}).Count(&count)
        if count >= int64(len(events)*4) {
                log.Println("⏭️  All gates already exist, skipping")
                return loadGatesFromDB(db, events)
        }

        var result []gateInfo
        gateDefs := []struct {
                Name           string
                Type           string
                Location       string
                MinAccessLevel *string
        }{
                {"Gate 1", "entry", "North Entrance", nil},
                {"Gate 2", "entry", "South Entrance", nil},
                {"Gate 3", "exit", "North Exit", nil},
                {"Gate 4", "both", "VIP Entrance/Exit", strPtr("VIP")},
        }

        for _, ev := range events {
                for _, def := range gateDefs {
                        g := models.Gate{
                                TenantID:       tenantID,
                                EventID:        ev.ID,
                                Name:           def.Name,
                                Type:           def.Type,
                                Location:       &def.Location,
                                MinAccessLevel: def.MinAccessLevel,
                                CapacityPerMin: 30,
                                Status:         "active",
                        }
                        if err := db.Create(&g).Error; err != nil {
                                log.Fatalf("Failed to seed gate %s for %s: %v", def.Name, ev.City, err)
                        }
                        result = append(result, gateInfo{ID: g.ID, EventID: ev.ID})
                }
        }
        log.Printf("✅ Seeded %d gates", len(result))
        return result
}

func loadGatesFromDB(db *gorm.DB, events []eventInfo) []gateInfo {
        var result []gateInfo
        for _, ev := range events {
                var gates []models.Gate
                db.Where("event_id = ?", ev.ID).Find(&gates)
                for _, g := range gates {
                        result = append(result, gateInfo{ID: g.ID, EventID: ev.ID})
                }
        }
        return result
}

// ─── STAFF ASSIGNMENTS ──────────────────────────────────────────────────

func seedAllStaffAssignments(db *gorm.DB, tenantID string, counters []counterInfo, gates []gateInfo, users map[string]seedUser) {
        // Counter staff: assign Rina to first counter of each event
        var countCS int64
        db.Model(&models.CounterStaff{}).Count(&countCS)
        if countCS == 0 {
                var rina models.User
                if err := db.Where("google_id = ?", "google-counter").First(&rina).Error; err != nil {
                        log.Fatalf("Failed to find Rina: %v", err)
                }
                // Find Counter A for each event
                added := 0
                for _, c := range counters {
                        var counter models.Counter
                        if err := db.Where("id = ? AND name = ?", c.ID, "Counter A").First(&counter).Error; err != nil {
                                continue
                        }
                        cs := models.CounterStaff{
                                TenantID:  tenantID,
                                UserID:    rina.ID,
                                CounterID: counter.ID,
                                Status:    "active",
                        }
                        if err := db.Create(&cs).Error; err != nil {
                                log.Fatalf("Failed to seed CounterStaff: %v", err)
                        }
                        added++
                }
                log.Printf("✅ Seeded %d counter staff assignments", added)
        }

        // Gate staff: assign Bayu to first gate of each event
        var countGS int64
        db.Model(&models.GateStaff{}).Count(&countGS)
        if countGS == 0 {
                var bayu models.User
                if err := db.Where("google_id = ?", "google-gate").First(&bayu).Error; err != nil {
                        log.Fatalf("Failed to find Bayu: %v", err)
                }
                added := 0
                for _, g := range gates {
                        var gate models.Gate
                        if err := db.Where("id = ? AND name = ?", g.ID, "Gate 1").First(&gate).Error; err != nil {
                                continue
                        }
                        gs := models.GateStaff{
                                TenantID: tenantID,
                                UserID:   bayu.ID,
                                GateID:   gate.ID,
                                Status:   "active",
                        }
                        if err := db.Create(&gs).Error; err != nil {
                                log.Fatalf("Failed to seed GateStaff: %v", err)
                        }
                        added++
                }
                log.Printf("✅ Seeded %d gate staff assignments", added)
        }
}

// ─── ALL WRISTBAND INVENTORY (9 per event = 45 total) ──────────────────

func seedAllWristbandInventory(db *gorm.DB, tenantID string, events []eventInfo) {
        var count int64
        db.Model(&models.WristbandInventory{}).Count(&count)
        if count >= int64(len(events)*9) {
                log.Println("⏭️  WristbandInventory already exists, skipping")
                return
        }

        for _, ev := range events {
                for i, name := range ticketTypeNames {
                        var existing int64
                        db.Model(&models.WristbandInventory{}).Where("event_id = ? AND type = ?", ev.ID, name).Count(&existing)
                        if existing > 0 {
                                continue
                        }
                        wc := wristbandColorMap[name]
                        wi := models.WristbandInventory{
                                TenantID:       tenantID,
                                EventID:        ev.ID,
                                Color:          wc.Color,
                                ColorHex:       wc.ColorHex,
                                Type:           name,
                                TotalStock:     ticketTypeQuotas[i],
                                UsedStock:      0,
                                RemainingStock: ticketTypeQuotas[i],
                        }
                        if err := db.Create(&wi).Error; err != nil {
                                log.Fatalf("Failed to seed wristband inventory %s-%s: %v", ev.City, name, err)
                        }
                }
        }
        log.Printf("✅ Seeded wristband inventory for %d events", len(events))
}

// ─── ORGANIZER ──────────────────────────────────────────────────────────

func seedOrganizer(db *gorm.DB, tenantID string, users map[string]seedUser) string {
        var existing models.Organizer
        if err := db.Where("tenant_id = ?", tenantID).First(&existing).Error; err == nil {
                return existing.ID
        }

        var andi models.User
        if err := db.Where("google_id = ?", "google-organizer").First(&andi).Error; err != nil {
                log.Fatalf("Failed to find organizer user: %v", err)
        }

        org := models.Organizer{
                TenantID: tenantID,
                UserID:   andi.ID,
                Status:   "approved",
        }
        if err := db.Create(&org).Error; err != nil {
                log.Fatalf("Failed to seed organizer: %v", err)
        }
        log.Println("✅ Seeded organizer: Andi Wijaya")
        return org.ID
}

// ═══════════════════════════════════════════════════════════════════════
// BULK DATA SEEDING
// ═══════════════════════════════════════════════════════════════════════

// ─── 12,000 PARTICIPANT USERS ──────────────────────────────────────────

func seedBulkUsers(db *gorm.DB, tenantID string, rng *rand.Rand) []string {
        totalUsers := 12000
        log.Printf("Creating %d users...", totalUsers)

        // Check if bulk users already exist
        var existingCount int64
        db.Model(&models.User{}).Where("role = ? AND google_id LIKE ?", "PARTICIPANT", "fake-%").Count(&existingCount)
        if existingCount >= int64(totalUsers) {
                log.Println("⏭️  Bulk participant users already exist, loading from DB")
                var existingUsers []models.User
                db.Where("role = ? AND google_id LIKE ?", "PARTICIPANT", "fake-%").Select("id").Find(&existingUsers)
                ids := make([]string, len(existingUsers))
                for i, u := range existingUsers {
                        ids[i] = u.ID
                }
                return ids
        }

        userIDs := make([]string, 0, totalUsers)
        emailSet := make(map[string]bool)

        // Also create TenantUser entries in batches
        var tenantUserBatch []models.TenantUser

        created := 0
        for created < totalUsers {
                batchSize := min(batchSize, totalUsers-created)
                var userBatch []models.User

                for len(userBatch) < batchSize {
                        fn := firstNames[rng.Intn(len(firstNames))]
                        ln := lastNames[rng.Intn(len(lastNames))]
                        email := fmt.Sprintf("%s.%s%d@gmail.com",
                                strings.ToLower(fn),
                                strings.ReplaceAll(strings.ToLower(ln), " ", ""),
                                rng.Intn(900)+100,
                        )
                        if emailSet[email] {
                                continue
                        }
                        emailSet[email] = true

                        name := fn + " " + ln
                        googleID := fmt.Sprintf("fake-%s", uuid.New().String()[:8])

                        userBatch = append(userBatch, models.User{
                                Name:     name,
                                Email:    email,
                                GoogleID: googleID,
                                Role:     "PARTICIPANT",
                                Status:   "active",
                        })
                }

                if err := db.CreateInBatches(&userBatch, batchSize).Error; err != nil {
                        log.Fatalf("Failed to seed user batch: %v", err)
                }

                for i, u := range userBatch {
                        userIDs = append(userIDs, u.ID)
                        tenantUserBatch = append(tenantUserBatch, models.TenantUser{
                                UserID:   u.ID,
                                TenantID: tenantID,
                                Role:     "PARTICIPANT",
                                IsActive: true,
                        })
                        _ = i
                }

                created += len(userBatch)
                log.Printf("Creating %d users... (%d/%d)", totalUsers, created, totalUsers)

                // Flush tenant users in batches
                if len(tenantUserBatch) >= batchSize {
                        if err := db.CreateInBatches(&tenantUserBatch, batchSize).Error; err != nil {
                                log.Fatalf("Failed to seed tenant_user batch: %v", err)
                        }
                        tenantUserBatch = tenantUserBatch[:0]
                }
        }

        // Flush remaining tenant users
        if len(tenantUserBatch) > 0 {
                if err := db.CreateInBatches(&tenantUserBatch, batchSize).Error; err != nil {
                        log.Fatalf("Failed to seed remaining tenant_users: %v", err)
                }
        }

        log.Printf("✅ Seeded %d participant users + tenant_users", totalUsers)
        return userIDs
}

// ─── ORDERS + ORDER ITEMS + TICKETS ────────────────────────────────────

// savedItem stores the ticket type details for an order, saved during order
// creation so that order items and tickets can be generated consistently.
type savedItem struct {
        ttID  string
        name  string
        price int
        qty   int
}

// orderMeta stores metadata alongside each order for downstream generation.
type orderMeta struct {
        orderCode      string
        eventID        string
        status         string
        totalAmount    int
        paymentType    string
        paymentMethod  string
        paymentChannel string
        paidAt         *time.Time
        items          []savedItem
}

func seedBulkOrdersAndTickets(
        db *gorm.DB,
        tenantID string,
        events []eventInfo,
        ttByEvent map[string][]ticketTypeInfo,
        userIDs []string,
        rng *rand.Rand,
) ([]orderResult, []ticketResult) {
        // Order distribution across events
        ordersPerEvent := map[string]int{
                events[0].ID: 2000, // Bandung
                events[1].ID: 2000, // Makassar
                events[2].ID: 2200, // Medan
                events[3].ID: 3000, // Jakarta
                events[4].ID: 2300, // Balikpapan
        }

        // Build event date lookup
        eventDateMap := make(map[string]time.Time)
        eventCityMap := make(map[string]string)
        for _, ev := range events {
                eventDateMap[ev.ID] = ev.Date
                eventCityMap[ev.ID] = ev.City
        }

        // Status distribution: 90% paid, 5% pending, 3% cancelled, 2% expired
        orderStatusFn := func() string {
                r := rng.Intn(100)
                switch {
                case r < 90:
                        return "paid"
                case r < 95:
                        return "pending"
                case r < 98:
                        return "cancelled"
                default:
                        return "expired"
                }
        }

        // Ticket status based on order status
        ticketStatusFn := func(orderStatus string) string {
                switch orderStatus {
                case "paid":
                        if rng.Intn(100) < 20 {
                                return "redeemed"
                        }
                        return "active"
                case "pending":
                        return "pending"
                case "cancelled":
                        return "cancelled"
                case "expired":
                        return "expired"
                }
                return "active"
        }

        // pickItems selects random ticket types and quantities for an order
        pickItems := func(ttList []ticketTypeInfo) []savedItem {
                numItems := 1 + rng.Intn(3) // 1, 2, or 3 items
                if numItems > len(ttList) {
                        numItems = len(ttList)
                }
                pickedIndices := rng.Perm(len(ttList))[:numItems]

                var items []savedItem
                for _, idx := range pickedIndices {
                        tt := ttList[idx]
                        qty := 1 + rng.Intn(2) // 1 or 2
                        totalQty := 0
                        for _, it := range items {
                                totalQty += it.qty
                        }
                        if totalQty+qty > 3 {
                                qty = 1
                        }
                        if totalQty >= 3 {
                                break
                        }
                        items = append(items, savedItem{ttID: tt.ID, name: tt.Name, price: tt.Price, qty: qty})
                }
                return items
        }

        var allPaidOrders []orderResult
        var allTickets []ticketResult

        ticketCodeCounter := 100000
        wristbandCounters := make(map[string]int) // color -> counter

        totalOrders := 0
        for _, ev := range events {
                totalOrders += ordersPerEvent[ev.ID]
        }

        log.Printf("Creating ~%d orders + tickets...", totalOrders)

        created := 0
        for _, ev := range events {
                numOrders := ordersPerEvent[ev.ID]
                ttList := ttByEvent[ev.ID]
                if len(ttList) == 0 {
                        log.Printf("⚠️  No ticket types for event %s, skipping orders", ev.City)
                        continue
                }

                eventDate := eventDateMap[ev.ID]
                // Order dates: within 30 days before event
                orderStartDate := eventDate.Add(-30 * 24 * time.Hour)

                for batchStart := 0; batchStart < numOrders; batchStart += batchSize {
                        batchEnd := min(batchStart+batchSize, numOrders)
                        batchSizeActual := batchEnd - batchStart

                        var orderBatch []models.Order
                        var metas []orderMeta

                        // ── Step 1: Generate orders with their items ──────────
                        for i := 0; i < batchSizeActual; i++ {
                                // Pick random user
                                userID := userIDs[rng.Intn(len(userIDs))]

                                // Random order date within 30 days before event
                                daysOffset := rng.Intn(30)
                                hoursOffset := rng.Intn(24)
                                minutesOffset := rng.Intn(60)
                                orderDate := orderStartDate.AddDate(0, 0, daysOffset).Add(time.Duration(hoursOffset)*time.Hour + time.Duration(minutesOffset)*time.Minute)

                                // Order code: SEL-YYYYMMDD-XXXXX
                                dateStr := orderDate.Format("20060102")
                                seqNum := created + i + 1
                                orderCode := fmt.Sprintf("SEL-%s-%05d", dateStr, seqNum)

                                status := orderStatusFn()
                                pm := weightedPaymentMethod(rng)

                                var paidAt *time.Time
                                if status == "paid" {
                                        paidTime := orderDate.Add(time.Duration(rng.Intn(24)) * time.Hour)
                                        paidAt = &paidTime
                                }

                                // Pick items and calculate amounts
                                items := pickItems(ttList)
                                subTotal := 0
                                for _, it := range items {
                                        subTotal += it.qty * it.price
                                }

                                adminFee := int(float64(subTotal) * 0.02)
                                taxAmount := int(float64(subTotal) * 0.11)
                                totalAmount := subTotal + adminFee + taxAmount

                                order := models.Order{
                                        TenantID:             tenantID,
                                        OrderCode:            orderCode,
                                        UserID:               userID,
                                        EventID:              ev.ID,
                                        TotalAmount:          totalAmount,
                                        Status:               status,
                                        PaymentType:          &pm.PaymentType,
                                        PaymentMethod:        &pm.PaymentMethod,
                                        PaymentChannel:       &pm.PaymentChannel,
                                        DokuTransactionID:    strPtr(fmt.Sprintf("DOKU-%d-%05d", rng.Intn(100000), seqNum)),
                                        PaymentTransactionID: strPtr(fmt.Sprintf("TXN-%d-%05d", rng.Intn(100000), seqNum)),
                                        PaidAt:               paidAt,
                                }
                                orderBatch = append(orderBatch, order)
                                metas = append(metas, orderMeta{
                                        orderCode: orderCode, eventID: ev.ID, status: status,
                                        totalAmount: totalAmount, paymentType: pm.PaymentType,
                                        paymentMethod: pm.PaymentMethod, paymentChannel: pm.PaymentChannel,
                                        paidAt: paidAt, items: items,
                                })
                        }

                        // ── Step 2: Insert orders into DB ─────────────────────
                        if err := db.CreateInBatches(&orderBatch, batchSize).Error; err != nil {
                                log.Fatalf("Failed to seed order batch: %v", err)
                        }

                        // ── Step 3: Generate order items + tickets using saved items ──
                        var orderItemBatch []models.OrderItem
                        var ticketBatch []models.Ticket

                        for oi, order := range orderBatch {
                                meta := metas[oi]

                                // Create order items
                                for _, item := range meta.items {
                                        orderItemBatch = append(orderItemBatch, models.OrderItem{
                                                TenantID:       tenantID,
                                                OrderID:        order.ID,
                                                TicketTypeID:   item.ttID,
                                                Quantity:       item.qty,
                                                PricePerTicket: item.price,
                                                Subtotal:       item.qty * item.price,
                                        })
                                }

                                // Create tickets
                                for _, item := range meta.items {
                                        wc := wristbandColorMap[item.name]
                                        for t := 0; t < item.qty; t++ {
                                                ticketCode := fmt.Sprintf("TK-%06d", ticketCodeCounter)
                                                ticketCodeCounter++

                                                wristbandCounters[wc.Color]++
                                                wbCode := fmt.Sprintf("WB-%s-%06d", wc.Color, wristbandCounters[wc.Color])

                                                ticketStatus := ticketStatusFn(meta.status)

                                                attendeeName := fmt.Sprintf("%s %s", firstNames[rng.Intn(len(firstNames))], lastNames[rng.Intn(len(lastNames))])
                                                attendeeEmail := fmt.Sprintf("%s.%s%d@gmail.com",
                                                        strings.ToLower(strings.SplitN(attendeeName, " ", 2)[0]),
                                                        strings.ReplaceAll(strings.ToLower(strings.SplitN(attendeeName, " ", 2)[1]), " ", ""),
                                                        rng.Intn(900)+100,
                                                )

                                                eventTitle := "Sheila On 7 — " + eventCityMap[meta.eventID]
                                                qrData := uuid.New().String()

                                                var redeemedAt *time.Time
                                                if ticketStatus == "redeemed" && meta.paidAt != nil {
                                                        daysBetween := int(eventDate.Sub(*meta.paidAt).Hours() / 24)
                                                        if daysBetween > 0 {
                                                                redeemOffset := rng.Intn(daysBetween)
                                                                rt := meta.paidAt.AddDate(0, 0, redeemOffset)
                                                                redeemedAt = &rt
                                                        } else {
                                                                redeemedAt = meta.paidAt
                                                        }
                                                }

                                                ticket := models.Ticket{
                                                        TenantID:       tenantID,
                                                        OrderID:        order.ID,
                                                        TicketTypeID:   item.ttID,
                                                        EventID:        meta.eventID,
                                                        TicketCode:     ticketCode,
                                                        AttendeeName:   attendeeName,
                                                        AttendeeEmail:  attendeeEmail,
                                                        QrData:         qrData,
                                                        WristbandCode:  &wbCode,
                                                        EventTitle:     eventTitle,
                                                        TicketTypeName: item.name,
                                                        Status:         ticketStatus,
                                                        RedeemedAt:     redeemedAt,
                                                }
                                                ticketBatch = append(ticketBatch, ticket)

                                                allTickets = append(allTickets, ticketResult{
                                                        ID: "", // populated after insert
                                                        OrderID: order.ID, TicketTypeID: item.ttID,
                                                        EventID: meta.eventID, Status: ticketStatus,
                                                        WristbandCode: wbCode, TicketTypeName: item.name,
                                                        AttendeeName: attendeeName, AttendeeEmail: attendeeEmail,
                                                        EventDate: eventDate,
                                                })
                                        }
                                }

                                // Track paid orders for payment logs
                                if meta.status == "paid" {
                                        allPaidOrders = append(allPaidOrders, orderResult{
                                                ID: order.ID, OrderCode: meta.orderCode, EventID: meta.eventID,
                                                Status: meta.status, TotalAmount: meta.totalAmount,
                                                PaymentType: meta.paymentType, PaymentMethod: meta.paymentMethod,
                                                PaymentChannel: meta.paymentChannel, PaidAt: meta.paidAt,
                                        })
                                }
                        }

                        // ── Step 4: Insert order items and tickets ────────────
                        if len(orderItemBatch) > 0 {
                                if err := db.CreateInBatches(&orderItemBatch, batchSize).Error; err != nil {
                                        log.Fatalf("Failed to seed order_item batch: %v", err)
                                }
                        }

                        if len(ticketBatch) > 0 {
                                if err := db.CreateInBatches(&ticketBatch, batchSize).Error; err != nil {
                                        log.Fatalf("Failed to seed ticket batch: %v", err)
                                }
                                // Populate ticket IDs in allTickets
                                startIdx := len(allTickets) - len(ticketBatch)
                                for i := range ticketBatch {
                                        if startIdx+i < len(allTickets) {
                                                allTickets[startIdx+i].ID = ticketBatch[i].ID
                                        }
                                }
                        }

                        created += batchSizeActual
                        log.Printf("Creating %d orders + tickets... (%d/%d)", totalOrders, created, totalOrders)
                }
        }

        log.Printf("✅ Seeded ~%d orders with items and ~%d tickets", created, len(allTickets))
        return allPaidOrders, allTickets
}

// ─── ~10,000 REDEMPTIONS ───────────────────────────────────────────────

func seedBulkRedemptions(db *gorm.DB, tenantID string, tickets []ticketResult, counters []counterInfo, staffID string, rng *rand.Rand) {
        // Filter redeemed tickets
        var redeemedTickets []ticketResult
        for _, t := range tickets {
                if t.Status == "redeemed" {
                        redeemedTickets = append(redeemedTickets, t)
                }
        }

        totalRedemptions := len(redeemedTickets)
        if totalRedemptions == 0 {
                log.Println("⏭️  No redeemed tickets, skipping redemptions")
                return
        }

        log.Printf("Creating %d redemptions...", totalRedemptions)

        // Build counter lookup by event
        countersByEvent := make(map[string][]counterInfo)
        for _, c := range counters {
                countersByEvent[c.EventID] = append(countersByEvent[c.EventID], c)
        }

        created := 0
        for batchStart := 0; batchStart < totalRedemptions; batchStart += batchSize {
                batchEnd := min(batchStart+batchSize, totalRedemptions)
                batchSizeActual := batchEnd - batchStart

                var batch []models.Redemption
                for i := 0; i < batchSizeActual; i++ {
                        t := redeemedTickets[batchStart+i]
                        wc := wristbandColorMap[t.TicketTypeName]

                        // Pick random counter from same event
                        eventCounters := countersByEvent[t.EventID]
                        var counterID string
                        if len(eventCounters) > 0 {
                                counterID = eventCounters[rng.Intn(len(eventCounters))].ID
                        } else {
                                counterID = counters[rng.Intn(len(counters))].ID
                        }

                        // RedeemedAt: random time between order date and event date
                        redeemedAt := t.EventDate.Add(-time.Duration(rng.Intn(72)+1) * time.Hour)

                        batch = append(batch, models.Redemption{
                                TenantID:       tenantID,
                                TicketID:       t.ID,
                                CounterID:      counterID,
                                StaffID:        staffID,
                                WristbandCode:  t.WristbandCode,
                                WristbandColor: wc.Color,
                                WristbandType:  t.TicketTypeName,
                                RedeemedAt:     redeemedAt,
                        })
                }

                if err := db.CreateInBatches(&batch, batchSize).Error; err != nil {
                        log.Fatalf("Failed to seed redemption batch: %v", err)
                }

                created += batchSizeActual
                log.Printf("Creating %d redemptions... (%d/%d)", totalRedemptions, created, totalRedemptions)
        }

        log.Printf("✅ Seeded %d redemptions", created)
}

// ─── ~8,000 GATE LOGS ──────────────────────────────────────────────────

func seedBulkGateLogs(db *gorm.DB, tenantID string, tickets []ticketResult, gates []gateInfo, staffID string, rng *rand.Rand) {
        // Filter active + redeemed tickets
        var eligibleTickets []ticketResult
        for _, t := range tickets {
                if t.Status == "active" || t.Status == "redeemed" {
                        eligibleTickets = append(eligibleTickets, t)
                }
        }

        // Pick ~8,000 random tickets from eligible
        totalGateLogs := min(8000, len(eligibleTickets))
        if totalGateLogs == 0 {
                log.Println("⏭️  No eligible tickets, skipping gate logs")
                return
        }

        log.Printf("Creating %d gate logs...", totalGateLogs)

        // Build gate lookup by event
        gatesByEvent := make(map[string][]gateInfo)
        for _, g := range gates {
                gatesByEvent[g.EventID] = append(gatesByEvent[g.EventID], g)
        }

        // Shuffle eligible tickets and pick first totalGateLogs
        rng.Shuffle(len(eligibleTickets), func(i, j int) {
                eligibleTickets[i], eligibleTickets[j] = eligibleTickets[j], eligibleTickets[i]
        })
        selectedTickets := eligibleTickets[:totalGateLogs]

        created := 0
        for batchStart := 0; batchStart < totalGateLogs; batchStart += batchSize {
                batchEnd := min(batchStart+batchSize, totalGateLogs)
                batchSizeActual := batchEnd - batchStart

                var batch []models.GateLog
                for i := 0; i < batchSizeActual; i++ {
                        t := selectedTickets[batchStart+i]

                        // Pick random gate from same event
                        eventGates := gatesByEvent[t.EventID]
                        var gateID string
                        if len(eventGates) > 0 {
                                gateID = eventGates[rng.Intn(len(eventGates))].ID
                        } else {
                                gateID = gates[rng.Intn(len(gates))].ID
                        }

                        // Action: IN (70%), OUT (25%), denied (5%)
                        var action string
                        r := rng.Intn(100)
                        switch {
                        case r < 70:
                                action = "IN"
                        case r < 95:
                                action = "OUT"
                        default:
                                action = "denied"
                        }

                        // ScannedAt: random time on event day (16:00-23:00 WIB = 09:00-16:00 UTC)
                        hour := 9 + rng.Intn(8)  // 9-16 UTC
                        minute := rng.Intn(60)
                        scannedAt := t.EventDate.Add(time.Duration(hour)*time.Hour + time.Duration(minute)*time.Minute)
                        // Adjust to same day as event
                        scannedAt = time.Date(t.EventDate.Year(), t.EventDate.Month(), t.EventDate.Day(), hour, minute, 0, 0, time.UTC)

                        batch = append(batch, models.GateLog{
                                TenantID:  tenantID,
                                TicketID:  t.ID,
                                GateID:    gateID,
                                StaffID:   staffID,
                                EventID:   t.EventID,
                                Action:    action,
                                ScannedAt: scannedAt,
                        })
                }

                if err := db.CreateInBatches(&batch, batchSize).Error; err != nil {
                        log.Fatalf("Failed to seed gate_log batch: %v", err)
                }

                created += batchSizeActual
                log.Printf("Creating %d gate logs... (%d/%d)", totalGateLogs, created, totalGateLogs)
        }

        log.Printf("✅ Seeded %d gate logs", created)
}

// ─── ~10,000 PAYMENT LOGS ──────────────────────────────────────────────

func seedBulkPaymentLogs(db *gorm.DB, tenantID string, paidOrders []orderResult, rng *rand.Rand) {
        totalLogs := len(paidOrders)
        if totalLogs == 0 {
                log.Println("⏭️  No paid orders, skipping payment logs")
                return
        }

        log.Printf("Creating %d payment logs...", totalLogs)

        created := 0
        for batchStart := 0; batchStart < totalLogs; batchStart += batchSize {
                batchEnd := min(batchStart+batchSize, totalLogs)
                batchSizeActual := batchEnd - batchStart

                var batch []models.PaymentLog
                for i := 0; i < batchSizeActual; i++ {
                        o := paidOrders[batchStart+i]

                        transactionID := fmt.Sprintf("DOKU-TXN-%05d-%06d", rng.Intn(10000), batchStart+i+1)

                        batch = append(batch, models.PaymentLog{
                                EventID:        o.EventID,
                                OrderID:        o.ID,
                                OrderCode:      o.OrderCode,
                                TransactionID:  transactionID,
                                PaymentMethod:  o.PaymentMethod,
                                PaymentChannel: o.PaymentChannel,
                                Amount:         float64(o.TotalAmount),
                                Currency:       "IDR",
                                Status:         "success",
                                PaidAt:         o.PaidAt,
                                DokuResponseCode: strPtr("00"),
                        })
                }

                if err := db.CreateInBatches(&batch, batchSize).Error; err != nil {
                        log.Fatalf("Failed to seed payment_log batch: %v", err)
                }

                created += batchSizeActual
                log.Printf("Creating %d payment logs... (%d/%d)", totalLogs, created, totalLogs)
        }

        log.Printf("✅ Seeded %d payment logs", created)
}

// ─── 3 SAMPLE COUPONS ──────────────────────────────────────────────────

func seedCoupons(db *gorm.DB, tenantID string, organizerID string, events []eventInfo, rng *rand.Rand) {
        var count int64
        db.Model(&models.Coupon{}).Where("tenant_id = ?", tenantID).Count(&count)
        if count >= 3 {
                log.Println("⏭️  Coupons already exist, skipping")
                return
        }

        now := time.Now()
        expiresAt := now.Add(30 * 24 * time.Hour)

        // Find Jakarta event ID for TRENDSHEILA coupon
        var jakartaEventID *string
        for _, ev := range events {
                if ev.City == "Jakarta" {
                        jakartaEventID = &ev.ID
                        break
                }
        }

        coupons := []models.Coupon{
                {
                        TenantID:          tenantID,
                        OrganizerID:       organizerID,
                        Code:              "SAHABATDUTA",
                        Name:              "Sahabat Duta Discount",
                        Description:       strPtr("Diskon Rp 50.000 untuk sahabat setia Sheila On 7"),
                        DiscountType:      "nominal",
                        DiscountValue:     50000,
                        Scope:             "global",
                        UsageLimit:        1000,
                        UsageLimitPerUser: 1,
                        UsedCount:         0,
                        Status:            "active",
                        StartsAt:          now,
                        ExpiresAt:         expiresAt,
                },
                {
                        TenantID:          tenantID,
                        OrganizerID:       organizerID,
                        Code:              "EARLYBIRD50",
                        Name:              "Early Bird 10% Off",
                        Description:       strPtr("Diskon 10% max Rp 100.000 untuk early bird"),
                        DiscountType:      "percentage",
                        DiscountValue:     10,
                        MaxDiscount:       float64Ptr(100000),
                        Scope:             "global",
                        UsageLimit:        500,
                        UsageLimitPerUser: 1,
                        UsedCount:         0,
                        Status:            "active",
                        StartsAt:          now,
                        ExpiresAt:         expiresAt,
                },
                {
                        TenantID:          tenantID,
                        OrganizerID:       organizerID,
                        Code:              "TRENDSHEILA",
                        Name:              "Trend Sheila Jakarta Special",
                        Description:       strPtr("Diskon Rp 75.000 khusus konser Jakarta"),
                        DiscountType:      "nominal",
                        DiscountValue:     75000,
                        Scope:             "event",
                        EventID:           jakartaEventID,
                        UsageLimit:        200,
                        UsageLimitPerUser: 1,
                        UsedCount:         0,
                        Status:            "active",
                        StartsAt:          now,
                        ExpiresAt:         expiresAt,
                },
        }

        for _, c := range coupons {
                if err := db.Create(&c).Error; err != nil {
                        log.Fatalf("Failed to seed coupon %s: %v", c.Code, err)
                }
        }
        log.Printf("✅ Seeded %d coupons", len(coupons))
}

// ─── HELPERS ────────────────────────────────────────────────────────────

func strPtr(s string) *string { return &s }

func float64Ptr(f float64) *float64 { return &f }

func min(a, b int) int {
        if a < b {
                return a
        }
        return b
}
