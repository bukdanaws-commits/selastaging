// ─── SELEEVENT MOCK DATA GENERATOR ──────────────────────────────────────────
// Generates all seed data for Sheila On 7 concert at GBK Jakarta
// ~15,000 tickets sold across 9 ticket types
// ────────────────────────────────────────────────────────────────────────────

import type {
  IUser,
  IEvent,
  ITicketType,
  IOrder,
  IOrderItem,
  ITicket,
  ICounter,
  IGate,
  IWristbandInventory,
  INotification,
  IRedemption,
  IGateLog,
  IOrganizerBankAccount,
  IWithdrawalRequest,
  IOrganizerBalance,
  IOrganizerFeeConfig,
  IPaymentLog,
  OrderStatus,
  TicketStatus,
  TicketTier,
  CounterStatus,
  GateType,
  NotificationType,
  NotificationCategory,
  WithdrawalStatus,
} from '@/lib/types'

// ─── MOCK DATA BUNDLE INTERFACE ─────────────────────────────────────────────

export interface MockDataBundle {
  users: IUser[]
  event: IEvent
  ticketTypes: ITicketType[]
  orders: IOrder[]
  orderItems: IOrderItem[]
  tickets: ITicket[]
  counters: ICounter[]
  gates: IGate[]
  wristbandInventory: IWristbandInventory[]
  notifications: INotification[]
  redemptions: IRedemption[]
  gateLogs: IGateLog[]
  bankAccounts: IOrganizerBankAccount[]
  withdrawals: IWithdrawalRequest[]
  balances: IOrganizerBalance[]
  organizerFeeConfigs: IOrganizerFeeConfig[]
  paymentLogs: IPaymentLog[]
}

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-seleevent-001'
const EVENT_ID = 'evt-sheila-on7-jakarta-001'
const EVENT_DATE = '2026-06-22'
const DOORS_OPEN = '16:00'
const WIB_OFFSET = '+07:00'
const ORGANIZER_ID = 'user-organizer-001'
const ORGANIZER_NAME = 'Andi Wijaya'
const EVENT_CODE = 'SHL-JKT'

// ─── INDONESIAN NAMES ───────────────────────────────────────────────────────

const MALE_FIRST_NAMES: string[] = [
  'Ahmad','Andi','Arief','Budi','Cahyo','Dimas','Eko','Fajar','Galih','Hadi',
  'Irfan','Joko','Kevin','Lukman','Mulyadi','Nur','Oscar','Prasetyo','Rahmat','Surya',
  'Taufik','Umar','Vino','Wahyu','Yusuf','Zainal','Agus','Bayu','Candra','Deni',
  'Fandi','Gilang','Hendra','Ivan','Joni','Kurniawan','Lukas','Muhammad','Nanda','Oki',
  'Putra','Ridwan','Sandi','Teguh','Udin','Vicky','Wawan','Yoga','Zaenal','Arif',
  'Bambang','Cipto','Dani','Endro','Firman','Gunawan','Haris','Indra','Jefri','Krisna',
  'Lutfi','Maman','Novan','Omar','Pandu','Rendra','Slamet','Tono','Ujang','Wisnu',
  'Yanto','Zaki','Adi','Bagus','Chandra','Dedi','Erwin','Farid','Gibran','Hasan',
  'Ismail','Junaidi','Kemal','Luki','Mochammad','Naufal','Okta','Prasetya','Rizky','Satria',
  'Tommy','Uba','Wira','Zulfikar','Asep','Bonar','Cahyadi','Dwi','Eko Saputro',
  'Fajar Nugroho','Gilang Ramadhan','Hardi','Irfan Hakim','Kurnia','Lukman Hakim','Maulana',
  'Nasir','Oki Setiawan','Prabowo','Rangga','Surya Darma','Tri Wahyudi','Usman','Vandika',
  'Wahyu Nugroho','Yusron','Zainul','Abdul','Budi Santoso','Cahya','Darmawan','Eka Putra',
  'Firhan','Guntur','Hendra Saputra','Ilham','Kunto','Lukmanul','Mahesa','Narendra','Oka',
  'Pramudya','Rafli','Surya Adi','Taufik Hidayat','Ulum','Widi','Yudha','Zidane','Aldi',
  'Bima','Dewa','Elang','Fachri','Galang','Hasbi','Iqbal','Jarot','Latif','Mustofa',
  'Nabil','Panji','Rasyid','Senja','Taufan','Valen','Wira Buana','Yoga Mahendra','Zahran',
  'Arda','Bagas','Candra Kusuma','Dian Pratama','Evan','Fathan','Gading','Hamzah','Ilyas',
  'Kemal Faruq','Luthfi','Makmur','Nashir','Ozy','Pradipta','Raihan','Sulaiman','Tasdik',
  'Umay','Vira','Wardana','Yudistira','Zidan','Akbar','Bintang','Chairil','Dzaky','Elzan',
  'Farhan','Ghani','Haikal','Ikhsan','Javan','Khairul','Lanang','Marwan','Najib','Ozan',
  'Permana','Rabbani','Syahputra','Thoriq','Verdi','Wahyudi','Yusuf Mansur','Zubair',
]

const FEMALE_FIRST_NAMES: string[] = [
  'Anisa','Bunga','Citra','Dewi','Eka','Fitri','Gita','Hana','Indah','Juli',
  'Kartika','Lestari','Maya','Nadia','Olivia','Putri','Ratna','Sari','Tuti','Utami',
  'Vera','Wulan','Yanti','Zahra','Ayu','Bela','Cinta','Dina','Endah','Fina',
  'Hesti','Irma','Jasmine','Kiki','Lina','Mega','Nisa','Olla','Puspita','Rini',
  'Sinta','Tina','Umi','Vina','Widi','Yuni','Zelda','Amel','Cahaya','Dara',
  'Elisa','Farah','Gina','Hana Safira','Intan','Jihan','Kania','Laras','Mira','Novi',
  'Oktavia','Pipa','Rahma','Shinta','Tania','Ulfah','Vani','Winda','Xena','Yasmin',
  'Zulfa','Adel','Cantika','Della','Elin','Firda','Galuh','Hilda','Ina','Jelita',
  'Kinanti','Melati','Nadia Putri','Padma','Rika','Sari Indah','Tari','Uli','Wulandari','Yessi',
  'Zaskia','Aisyah','Bunga Citra','Cicilia','Dian Sastro','Elsa','Flora','Griselda','Helena','Ira',
  'Juliana','Krisdayanti','Laila','Mulyani','Naura','Ophelia','Paramita','Ratna Dewi','Sephia','Thalita',
  'Urmila','Venessa','Wulan Sari','Yuliana','Zahra Amelia','Alma','Belinda','Charlene','Desy','Evalina',
  'Fatimah','Georgina','Hafsha','Ismi','Jannah','Kania Putri','Lailatul','Muthia','Nadhira','Osha',
  'Pritta','Raudha','Shafira','Thalita Zahra','Umi Kulsum','Vania','Wardah','Yasinta','Zahrah','Alya',
  'Bulan','Canting','Dwi Rahayu','Elsa Maharani','Fanesha','Ghina','Halima','Icha','Jelita Putri','Kirana',
  'Lubna','Mona','Nadira','Olin','Puspita Dewi','Ratih','Selvi','Tiara','Ulfa','Viony',
  'Wening','Yara','Ziya','Amara','Benazir','Chintya','Dwi Ayu','Ernika','Fadhilah','Ghaliyati',
  'Hamidah','Istiqomah','Jamilah','Khadijah','Layla','Mazinah','Najwa','Oksi','Puspitasari','Rizkia',
  'Syifa','Tasya','Ummu','Vania Aulia','Wirda','Yunita','Zahrotun','Afifah','Bunga Lestari','Cahyani',
  'Deswinta','Elsa Novita','Fitriani','Gita Savitri','Hesti Wulandari','Ismah','Julia','Karina',
  'Lestari Ningsih','Mutiara','Natalia','Oktaviani','Pricilia','Rahayu','Shabrina','Tri Wulandari',
  'Ulin','Viona','Wulandini','Yoshinta','Zulfia',
]

const LAST_NAMES: string[] = [
  'Saputra','Pratama','Wijaya','Kusuma','Hidayat','Nugraha','Setiawan','Santoso',
  'Wibowo','Rahardjo','Suryadi','Purnama','Suharto','Gunawan','Haryanto','Susanto',
  'Widodo','Putra','Siregar','Simanjuntak','Nasution','Simatupang','Harahap','Sihotang',
  'Tampubolon','Lumbantoruan','Manurung','Purba','Simbolon','Ginting','Tarigan','Sembring',
  'Sembiring','Karo','Sipayung','Surbakti','Kaban','Sitepu','Depari','Sinaga',
  'Panggabean','Sihombing','Simarmata','Tambunan','Rajagukguk','Nainggolan','Hutapea','Hutajulu',
  'Sibuea','Sianipar','Manik','Damanik','Permadi','Kurniawan','Prasetyo','Ramadhan',
  'Susilo','Hakim','Firmansyah','Abdillah','Maulana','Rizki','Fahrezi','Suryana',
  'Prabowo','Wibisono','Kartawijaya','Mulyadi','Pradipta','Arya','Permana','Nugroho',
  'Sidiq','Hamdani','Fauzan','Ramadhani','Alamsyah','Yudistira','Wijaksono','Cahyadi',
  'Putranto','Suryanto','Handoko','Pangestu','Anggraeni','Wulandari','Kusumawardani','Rahayu',
  'Lestari','Permata Sari','Savitri','Anggraini','Hartono','Kusumo','Raharjo','Wicaksono',
  'Nugrahanto','Suyanto','Supriyadi','Harjono','Mulyono','Prasetyadi','Kurniawati','Handayani',
  'Nirmala','Shanti','Dewanti','Anggriani','Puspita','Wardani','Sari Dewi','Utami Putri',
  'Cahyani','Maharani','Rahmawati','Pratiwi','Hidayatullah','Surya Pratama','Aditya','Rizal',
  'Setiabudi','Gunarto','Hardianto','Purnawan','Prasetya','Sumantri','Wijayanti',
]

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(start: string, end: string): string {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const d = new Date(s + Math.random() * (e - s))
  return d.toISOString()
}

function generateId(prefix: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  for (let i = 0; i < 12; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${prefix}-${suffix}`
}

function generateOrderCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `SHL-JKT-${code}`
}

function generateTicketCode(tierCode: string, seq: number): string {
  const num = String(seq).padStart(4, '0')
  return `SHL-JKT-${tierCode}-${num}`
}

function generatePhone(): string {
  const prefixes = ['0812','0813','0821','0822','0852','0853','0811','0857','0858']
  const prefix = pickRandom(prefixes)
  let num = prefix
  for (let i = 0; i < 8; i++) {
    num += String(Math.floor(Math.random() * 10))
  }
  return num
}

function generatePerson(): { name: string; email: string; phone: string } {
  const firstName = pickRandom([...MALE_FIRST_NAMES, ...FEMALE_FIRST_NAMES])
  const lastName = pickRandom(LAST_NAMES)
  const fullName = `${firstName} ${lastName}`
  const emailBase = `${firstName.toLowerCase().replace(/[^a-z]/g, '')}${lastName.toLowerCase().replace(/[^a-z]/g, '')}`
  return {
    name: fullName,
    email: `${emailBase}@gmail.com`,
    phone: generatePhone(),
  }
}

// ─── TICKET TYPE DEFINITIONS ────────────────────────────────────────────────

interface TicketTypeDef {
  id: string
  name: string
  description: string
  price: number
  quota: number
  sold: number
  tier: TicketTier
  emoji: string
  tierCode: string
  benefits: string[]
  platformFee: number
}

const TICKET_TYPE_DEFS: readonly TicketTypeDef[] = [
  {
    id: 'tt-vvip-pit-001',
    name: 'VVIP PIT',
    description: 'Experiencia VIP exclusiva junto al escenario con acceso a zona PIT premium',
    price: 3500000,
    quota: 300,
    sold: 247,
    tier: 'floor',
    emoji: '👑',
    tierCode: 'VVIPIP',
    benefits: [
      'Akses zona PIT depan panggung',
      'Welcome drink premium',
      'Goodie bag eksklusif',
      'Meet & Greet Sheila On 7',
      'Fotobooth VIP',
      'Lounge eksklusif dengan catering',
    ],
    platformFee: 5,
  },
  {
    id: 'tt-vip-zone-001',
    name: 'VIP ZONE',
    description: 'Zona premium dengan view terbaik dan fasilitas lengkap',
    price: 2800000,
    quota: 500,
    sold: 412,
    tier: 'floor',
    emoji: '⭐',
    tierCode: 'VIPZNE',
    benefits: [
      'Akses zona VIP depan',
      'Welcome drink',
      'Goodie bag eksklusif',
      'Fotobooth VIP',
      'Lounge eksklusif',
    ],
    platformFee: 5,
  },
  {
    id: 'tt-festival-001',
    name: 'FESTIVAL',
    description: 'Zona festival dengan view panggung yang luar biasa',
    price: 2200000,
    quota: 3000,
    sold: 2150,
    tier: 'floor',
    emoji: '🎵',
    tierCode: 'FESTVL',
    benefits: [
      'Akses zona festival',
      'Welcome drink',
      'Merchandise discount 20%',
    ],
    platformFee: 5,
  },
  {
    id: 'tt-cat1-001',
    name: 'CAT 1',
    description: 'Tribun kategori 1 dengan view excellent ke panggung utama',
    price: 1750000,
    quota: 2000,
    sold: 1780,
    tier: 'tribun',
    emoji: '🎫',
    tierCode: 'CAT001',
    benefits: [
      'Tribun terdepan',
      'Welcome drink',
    ],
    platformFee: 5,
  },
  {
    id: 'tt-cat2-001',
    name: 'CAT 2',
    description: 'Tribun kategori 2 dengan view sangat baik ke panggung',
    price: 1400000,
    quota: 3000,
    sold: 2410,
    tier: 'tribun',
    emoji: '🎟️',
    tierCode: 'CAT002',
    benefits: [
      'Tribun kategori premium',
    ],
    platformFee: 5,
  },
  {
    id: 'tt-cat3-001',
    name: 'CAT 3',
    description: 'Tribun kategori 3 dengan view yang nyaman',
    price: 1100000,
    quota: 3000,
    sold: 1950,
    tier: 'tribun',
    emoji: '🎫',
    tierCode: 'CAT003',
    benefits: [
      'Tribun nyaman',
    ],
    platformFee: 5,
  },
  {
    id: 'tt-cat4-001',
    name: 'CAT 4',
    description: 'Tribun kategori 4 dengan view yang tetap memuaskan',
    price: 850000,
    quota: 4000,
    sold: 2680,
    tier: 'tribun',
    emoji: '🎟️',
    tierCode: 'CAT004',
    benefits: [
      'Tribun standar',
    ],
    platformFee: 5,
  },
  {
    id: 'tt-cat5-001',
    name: 'CAT 5',
    description: 'Tribun kategori 5 pilihan ekonomis untuk menikmati konser',
    price: 550000,
    quota: 3000,
    sold: 1520,
    tier: 'tribun',
    emoji: '🎫',
    tierCode: 'CAT005',
    benefits: [
      'Akses area tribun',
    ],
    platformFee: 5,
  },
  {
    id: 'tt-cat6-001',
    name: 'CAT 6',
    description: 'Tribun kategori 6 - harga terjangkau untuk semua kalangan',
    price: 350000,
    quota: 2500,
    sold: 890,
    tier: 'tribun',
    emoji: '🎟️',
    tierCode: 'CAT006',
    benefits: [
      'Akses area konser',
    ],
    platformFee: 5,
  },
]

// ─── DOKU PAYMENT METHODS ──────────────────────────────────────────────────

const DOKU_PAYMENT_METHODS: readonly { method: string; channel: string; weight: number }[] = [
  { method: 'VA-BCA', channel: 'VIRTUAL_ACCOUNT_BCA', weight: 25 },
  { method: 'VA-Mandiri', channel: 'VIRTUAL_ACCOUNT_BANK_MANDIRI', weight: 15 },
  { method: 'VA-BSI', channel: 'VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI', weight: 10 },
  { method: 'QRIS-DANA', channel: 'QRIS', weight: 15 },
  { method: 'QRIS-OVO', channel: 'QRIS', weight: 10 },
  { method: 'QRIS-ShopeePay', channel: 'QRIS', weight: 10 },
  { method: 'EWALLET-DANA', channel: 'EMONEY_DANA', weight: 5 },
  { method: 'CC-Visa', channel: 'CREDIT_CARD', weight: 5 },
  { method: 'ALFAMART', channel: 'ONLINE_TO_OFFLINE_ALFA', weight: 5 },
]

function pickDokuPayment(): { method: string; channel: string } {
  const totalWeight = DOKU_PAYMENT_METHODS.reduce((sum, p) => sum + p.weight, 0)
  let r = Math.random() * totalWeight
  for (const pm of DOKU_PAYMENT_METHODS) {
    r -= pm.weight
    if (r <= 0) return { method: pm.method, channel: pm.channel }
  }
  return { method: DOKU_PAYMENT_METHODS[0].method, channel: DOKU_PAYMENT_METHODS[0].channel }
}

// ─── STATIC COUNTER & GATE DATA ────────────────────────────────────────────

function createCounters(now: string, baseDate: string): ICounter[] {
  const ts = '2026-03-01T00:00:00.000+07:00'
  const openAt = `${EVENT_DATE}T${DOORS_OPEN}:00.000${WIB_OFFSET}`
  return [
    { id: 'counter-a-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Counter A', location: 'Lobby Utara', capacity: 80, status: 'active', openAt, createdAt: ts, updatedAt: now },
    { id: 'counter-b-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Counter B', location: 'Lobby Utara', capacity: 80, status: 'active', openAt, createdAt: ts, updatedAt: now },
    { id: 'counter-c-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Counter C', location: 'Lobby Selatan', capacity: 75, status: 'active', openAt, createdAt: ts, updatedAt: now },
    { id: 'counter-d-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Counter D', location: 'Lobby Selatan', capacity: 75, status: 'active', openAt, createdAt: ts, updatedAt: now },
    { id: 'counter-e-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Counter E', location: 'Gate A', capacity: 60, status: 'active', openAt, createdAt: ts, updatedAt: now },
    { id: 'counter-f-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Counter F', location: 'Gate B', capacity: 60, status: 'active', openAt, createdAt: ts, updatedAt: now },
    { id: 'counter-g-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Counter G', location: 'Gate VIP', capacity: 50, status: 'active', openAt, createdAt: ts, updatedAt: now },
    { id: 'counter-h-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Counter H', location: 'Gate Festival', capacity: 100, status: 'active', openAt, createdAt: ts, updatedAt: now },
    { id: 'counter-i-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Counter I', location: 'Lobby Timur', capacity: 70, status: 'inactive', createdAt: ts, updatedAt: now },
    { id: 'counter-j-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Counter J', location: 'Lobby Barat', capacity: 65, status: 'closed', createdAt: ts, updatedAt: now },
  ] as ICounter[]
}

function createGates(now: string, baseDate: string): IGate[] {
  const ts = '2026-03-01T00:00:00.000+07:00'
  return [
    { id: 'gate-utara-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Gate Utara', type: 'entry' as GateType, location: 'Lobby Utara', minAccessLevel: 'festival', capacityPerMin: 30, status: 'active' as CounterStatus, createdAt: ts, updatedAt: now },
    { id: 'gate-selatan-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Gate Selatan', type: 'entry' as GateType, location: 'Lobby Selatan', minAccessLevel: 'festival', capacityPerMin: 30, status: 'active' as CounterStatus, createdAt: ts, updatedAt: now },
    { id: 'gate-timur-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Gate Timur', type: 'entry' as GateType, location: 'Sisi Timur Stadion', minAccessLevel: 'cat1', capacityPerMin: 25, status: 'active' as CounterStatus, createdAt: ts, updatedAt: now },
    { id: 'gate-barat-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Gate Barat', type: 'exit' as GateType, location: 'Sisi Barat Stadion', minAccessLevel: 'cat1', capacityPerMin: 25, status: 'active' as CounterStatus, createdAt: ts, updatedAt: now },
    { id: 'gate-vip-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Gate VIP', type: 'entry' as GateType, location: 'Area VIP', minAccessLevel: 'vip', capacityPerMin: 15, status: 'active' as CounterStatus, createdAt: ts, updatedAt: now },
    { id: 'gate-festival-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Gate Festival', type: 'entry' as GateType, location: 'Area Festival', minAccessLevel: 'festival', capacityPerMin: 35, status: 'active' as CounterStatus, createdAt: ts, updatedAt: now },
    { id: 'gate-tribun-a-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Gate Tribun A', type: 'entry' as GateType, location: 'Tribun A-B', minAccessLevel: 'cat1', capacityPerMin: 40, status: 'active' as CounterStatus, createdAt: ts, updatedAt: now },
    { id: 'gate-tribun-b-001', tenantId: TENANT_ID, eventId: EVENT_ID, name: 'Gate Tribun B', type: 'both' as GateType, location: 'Tribun C-F', minAccessLevel: 'cat1', capacityPerMin: 40, status: 'active' as CounterStatus, createdAt: ts, updatedAt: now },
  ] as IGate[]
}

function createNotifications(): INotification[] {
  return [
    {
      id: 'notif-001', tenantId: TENANT_ID, userId: ORGANIZER_ID, eventId: EVENT_ID,
      title: 'Tiket Terjual Melebihi 10.000!',
      message: 'Selamat! Penjualan tiket konser Sheila On 7 telah melampaui angka 10.000 tiket.',
      type: 'success' as NotificationType, category: 'order' as NotificationCategory, isRead: true,
      createdAt: '2026-05-15T10:00:00.000+07:00',
    },
    {
      id: 'notif-002', tenantId: TENANT_ID, userId: 'user-super-admin-001', eventId: EVENT_ID,
      title: 'VVIP PIT Hampir Habis',
      message: 'Sisa tiket VVIP PIT hanya tinggal 53 dari 300 kuota. Pertimbangkan untuk menambah kuota atau menutup penjualan.',
      type: 'warning' as NotificationType, category: 'order' as NotificationCategory, isRead: true,
      createdAt: '2026-05-20T14:30:00.000+07:00',
    },
    {
      id: 'notif-003', tenantId: TENANT_ID, userId: 'user-super-admin-001',
      title: 'Staff Counter Baru Terdaftar',
      message: 'Lina Puspita telah berhasil mendaftar sebagai Counter Staff.',
      type: 'info' as NotificationType, category: 'system' as NotificationCategory, isRead: true,
      createdAt: '2026-03-10T09:00:00.000+07:00',
    },
    {
      id: 'notif-004', tenantId: TENANT_ID, userId: ORGANIZER_ID, eventId: EVENT_ID,
      title: 'Gate Festival Siap Dioperasikan',
      message: 'Gate Festival telah dikonfigurasi dengan kapasitas 35 orang/menit. Siap untuk digunakan pada hari H.',
      type: 'success' as NotificationType, category: 'gate' as NotificationCategory, isRead: false,
      createdAt: '2026-06-21T08:00:00.000+07:00',
    },
    {
      id: 'notif-005', tenantId: TENANT_ID, userId: 'user-super-admin-001', eventId: EVENT_ID,
      title: 'Counter I Tidak Aktif',
      message: 'Counter I di Lobby Timur belum diaktifkan. Harap aktifkan sebelum hari H atau set status ke closed.',
      type: 'warning' as NotificationType, category: 'system' as NotificationCategory, isRead: false,
      createdAt: '2026-06-21T10:00:00.000+07:00',
    },
    {
      id: 'notif-006', tenantId: TENANT_ID, userId: ORGANIZER_ID, eventId: EVENT_ID,
      title: 'Pembayaran Berhasil Dikonfirmasi',
      message: 'Pembayaran untuk order SHL-JKT-AX3K2MNP sebesar Rp 3.500.000 telah berhasil dikonfirmasi via DOKU VA-BCA.',
      type: 'success' as NotificationType, category: 'payment' as NotificationCategory, isRead: true,
      createdAt: '2026-06-18T16:45:00.000+07:00',
    },
    {
      id: 'notif-007', tenantId: TENANT_ID, userId: 'user-counter-001', eventId: EVENT_ID,
      title: 'Shift Malam Dimulai',
      message: 'Shift malam Anda telah dimulai. Counter A siap melayani penukaran gelang.',
      type: 'info' as NotificationType, category: 'redemption' as NotificationCategory, isRead: true,
      createdAt: '2026-06-22T18:00:00.000+07:00',
    },
    {
      id: 'notif-008', tenantId: TENANT_ID, userId: 'user-gate-001', eventId: EVENT_ID,
      title: 'Antrian Tinggi di Gate Utara',
      message: 'Gate Utara mengalami antrian tinggi dengan throughput 30 orang/menit. Pertimbangkan membuka Gate Tambahan.',
      type: 'warning' as NotificationType, category: 'gate' as NotificationCategory, isRead: false,
      createdAt: '2026-06-22T17:15:00.000+07:00',
    },
    {
      id: 'notif-009', tenantId: TENANT_ID, userId: 'user-super-admin-001', eventId: EVENT_ID,
      title: 'Stok Gelang Gold Menipis',
      message: 'Stok gelang Gold (VVIP PIT) tinggal 15% dari total. Segera restok untuk mengantisipasi kebutuhan.',
      type: 'error' as NotificationType, category: 'redemption' as NotificationCategory, isRead: false,
      createdAt: '2026-06-22T17:30:00.000+07:00',
    },
    {
      id: 'notif-010', tenantId: TENANT_ID, userId: 'user-super-admin-001',
      title: 'Backup Database Selesai',
      message: 'Backup database harian telah berhasil dilakukan. Ukuran backup: 245MB.',
      type: 'success' as NotificationType, category: 'system' as NotificationCategory, isRead: true,
      createdAt: '2026-06-22T03:00:00.000+07:00',
    },
    {
      id: 'notif-011', tenantId: TENANT_ID, userId: ORGANIZER_ID, eventId: EVENT_ID,
      title: 'Update Waktu Doors Open',
      message: 'Waktu buka pintu telah diperbarui menjadi 16:00 WIB sesuai permintaan pihak GBK.',
      type: 'info' as NotificationType, category: 'system' as NotificationCategory, isRead: true,
      createdAt: '2026-06-15T11:00:00.000+07:00',
    },
    {
      id: 'notif-012', tenantId: TENANT_ID, userId: 'user-super-admin-001', eventId: EVENT_ID,
      title: 'Gelang Duplikat Terdeteksi',
      message: 'Sistem mendeteksi percobaan scan gelang duplikat (WB-VVIPIP-45231) di Gate VIP. Akses ditolak.',
      type: 'error' as NotificationType, category: 'gate' as NotificationCategory, isRead: false,
      createdAt: '2026-06-22T18:45:00.000+07:00',
    },
    {
      id: 'notif-013', tenantId: TENANT_ID, userId: ORGANIZER_ID, eventId: EVENT_ID,
      title: 'Penjualan Tiket Cat 4 Melonjak',
      message: 'Cat 4 terjual 500 tiket dalam 24 jam terakhir. Kuota tersisa: 1.320 tiket.',
      type: 'info' as NotificationType, category: 'order' as NotificationCategory, isRead: true,
      createdAt: '2026-06-01T09:30:00.000+07:00',
    },
    {
      id: 'notif-014', tenantId: TENANT_ID, userId: 'user-counter-003', eventId: EVENT_ID,
      title: 'Tiket Berhasil Ditebus',
      message: 'Tiket SHL-JKT-FESTVL-0421 berhasil ditebus dan gelang Teal telah dikeluarkan.',
      type: 'success' as NotificationType, category: 'redemption' as NotificationCategory, isRead: true,
      createdAt: '2026-06-22T16:45:00.000+07:00',
    },
    {
      id: 'notif-015', tenantId: TENANT_ID, userId: 'user-gate-003', eventId: EVENT_ID,
      title: 'Gate Scan Berhasil',
      message: 'Pengunjung dengan tiket SHL-JKT-CAT002-1890 berhasil masuk melalui Gate Tribun A.',
      type: 'success' as NotificationType, category: 'gate' as NotificationCategory, isRead: true,
      createdAt: '2026-06-22T17:20:00.000+07:00',
    },
    {
      id: 'notif-016', tenantId: TENANT_ID, userId: 'user-super-admin-001',
      title: 'Pembaruan Sistem v2.5.0',
      message: 'Sistem telah diperbarui ke versi 2.5.0 dengan peningkatan performa SSE dan perbaikan bug.',
      type: 'info' as NotificationType, category: 'system' as NotificationCategory, isRead: true,
      createdAt: '2026-06-10T08:00:00.000+07:00',
    },
    {
      id: 'notif-017', tenantId: TENANT_ID, userId: ORGANIZER_ID, eventId: EVENT_ID,
      title: 'Target 15.000 Tiket Tercapai!',
      message: 'Selamat! Total tiket yang telah terjual telah mencapai 15.000 tiket dari total kuota 21.300.',
      type: 'success' as NotificationType, category: 'order' as NotificationCategory, isRead: false,
      createdAt: '2026-06-19T20:00:00.000+07:00',
    },
    {
      id: 'notif-018', tenantId: TENANT_ID, userId: 'user-super-admin-001', eventId: EVENT_ID,
      title: 'Koneksi SSE Terputus',
      message: 'Koneksi SSE dengan Gate Timur terputus selama 30 detik. Koneksi telah dipulihkan otomatis.',
      type: 'error' as NotificationType, category: 'system' as NotificationCategory, isRead: true,
      createdAt: '2026-06-22T16:20:00.000+07:00',
    },
    {
      id: 'notif-019', tenantId: TENANT_ID, userId: 'user-gate-005', eventId: EVENT_ID,
      title: 'Tiket Tidak Valid',
      message: 'Percobaan scan tiket SHL-JKT-CAT006-0456 ditolak. Status tiket: cancelled.',
      type: 'error' as NotificationType, category: 'gate' as NotificationCategory, isRead: true,
      createdAt: '2026-06-22T17:50:00.000+07:00',
    },
    {
      id: 'notif-020', tenantId: TENANT_ID, userId: ORGANIZER_ID, eventId: EVENT_ID,
      title: 'Laporan Harian - H-1',
      message: 'Ringkasan H-1: 15.039 tiket terjual, Rp 22.4 Miliar pendapatan kotor, 12.000 peserta terdaftar.',
      type: 'info' as NotificationType, category: 'system' as NotificationCategory, isRead: false,
      createdAt: '2026-06-21T23:59:00.000+07:00',
    },
  ]
}

// ─── WRISTBAND COLORS ───────────────────────────────────────────────────────

const WRISTBAND_COLORS: readonly { color: string; hex: string }[] = [
  { color: 'Gold', hex: '#FFD700' },
  { color: 'Teal', hex: '#00A39D' },
  { color: 'Orange', hex: '#F8AD3C' },
  { color: 'Red', hex: '#EF4444' },
  { color: 'Blue', hex: '#3B82F6' },
  { color: 'Green', hex: '#22C55E' },
  { color: 'Purple', hex: '#A855F7' },
  { color: 'White', hex: '#F8FAFC' },
  { color: 'Yellow', hex: '#EAB308' },
]

// ─── MAIN GENERATOR FUNCTION ────────────────────────────────────────────────

export function generateAllMockData(): MockDataBundle {
  const now = new Date().toISOString()
  const baseDate = '2026-03-01T00:00:00.000+07:00'

  // ── 1. EVENT ─────────────────────────────────────────────────────────────
  const event: IEvent = {
    id: EVENT_ID,
    tenantId: TENANT_ID,
    slug: 'sheila-on-7-melompat-lebih-tinggi-jakarta-2026',
    title: 'Sheila On 7 "Melompat Lebih Tinggi"',
    subtitle: 'Konser Spesial 25 Tahun Sheila On 7',
    date: `${EVENT_DATE}T19:00:00.000${WIB_OFFSET}`,
    doorsOpen: DOORS_OPEN,
    venue: 'GBK Madya Stadium',
    city: 'Jakarta',
    address: 'Jl. Pintu Senayan, Gelora Bung Karno, Senayan, Kebayoran Baru, Jakarta Selatan',
    capacity: 18800,
    status: 'published',
    createdAt: baseDate,
    updatedAt: now,
  }

  // ── 2. TICKET TYPES ──────────────────────────────────────────────────────
  const ticketTypes: ITicketType[] = TICKET_TYPE_DEFS.map((def) => ({
    id: def.id,
    tenantId: TENANT_ID,
    eventId: EVENT_ID,
    name: def.name,
    description: def.description,
    price: def.price,
    quota: def.quota,
    sold: def.sold,
    tier: def.tier,
    emoji: def.emoji,
    benefits: def.benefits,
    platformFee: def.platformFee,
    createdAt: baseDate,
    updatedAt: now,
  }))

  // ── 3. COUNTERS & GATES ──────────────────────────────────────────────────
  const counters = createCounters(now, baseDate)
  const gates = createGates(now, baseDate)
  const activeCounters = counters.filter(c => c.status === 'active')
  const entryGates = gates.filter(g => g.type === 'entry' || g.type === 'both')

  // ── 4. STAFF USERS (NO ADMIN — only SUPER_ADMIN + ORGANIZER + staff) ────
  const staffUsers: IUser[] = [
    {
      id: 'user-super-admin-001', googleId: 'google-super-admin-001',
      email: 'bukdan@seleevent.id', name: 'Bukdan Admin',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=BukdanAdmin',
      phone: '081200000001', role: 'SUPER_ADMIN', status: 'active',
      lastLoginAt: '2026-06-21T08:00:00.000+07:00',
      createdAt: '2026-01-01T00:00:00.000+07:00', updatedAt: now,
    },
    {
      id: ORGANIZER_ID, googleId: 'google-organizer-001',
      email: 'andi.wijaya@gmail.com', name: ORGANIZER_NAME,
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=AndiWijaya',
      phone: '081300000001', role: 'ORGANIZER', status: 'active',
      lastLoginAt: '2026-06-20T14:00:00.000+07:00',
      createdAt: '2026-02-01T00:00:00.000+07:00', updatedAt: now,
    },
    // Counter Staff (5)
    {
      id: 'user-counter-001', googleId: 'google-counter-001',
      email: 'siti.nurhaliza@gmail.com', name: 'Siti Nurhaliza',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=SitiNurhaliza',
      phone: '081200000010', role: 'COUNTER_STAFF', status: 'active',
      lastLoginAt: '2026-06-21T15:00:00.000+07:00',
      createdAt: '2026-03-01T00:00:00.000+07:00', updatedAt: now,
    },
    {
      id: 'user-counter-002', googleId: 'google-counter-002',
      email: 'dewi.sartika@gmail.com', name: 'Dewi Sartika',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=DewiSartika',
      phone: '081200000011', role: 'COUNTER_STAFF', status: 'active',
      lastLoginAt: '2026-06-21T15:10:00.000+07:00',
      createdAt: '2026-03-01T00:00:00.000+07:00', updatedAt: now,
    },
    {
      id: 'user-counter-003', googleId: 'google-counter-003',
      email: 'rini.wulandari@gmail.com', name: 'Rini Wulandari',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=RiniWulandari',
      phone: '081300000010', role: 'COUNTER_STAFF', status: 'active',
      lastLoginAt: '2026-06-21T15:20:00.000+07:00',
      createdAt: '2026-03-05T00:00:00.000+07:00', updatedAt: now,
    },
    {
      id: 'user-counter-004', googleId: 'google-counter-004',
      email: 'maya.anggraeni@gmail.com', name: 'Maya Anggraeni',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=MayaAnggraeni',
      phone: '081200000012', role: 'COUNTER_STAFF', status: 'active',
      lastLoginAt: '2026-06-22T10:00:00.000+07:00',
      createdAt: '2026-03-10T00:00:00.000+07:00', updatedAt: now,
    },
    {
      id: 'user-counter-005', googleId: 'google-counter-005',
      email: 'lina.puspita@gmail.com', name: 'Lina Puspita',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=LinaPuspita',
      phone: '081300000011', role: 'COUNTER_STAFF', status: 'active',
      lastLoginAt: '2026-06-22T10:05:00.000+07:00',
      createdAt: '2026-03-10T00:00:00.000+07:00', updatedAt: now,
    },
    // Gate Staff (5)
    {
      id: 'user-gate-001', googleId: 'google-gate-001',
      email: 'agung.ridwan@gmail.com', name: 'Agung Ridwan',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=AgungRidwan',
      phone: '081200000020', role: 'GATE_STAFF', status: 'active',
      lastLoginAt: '2026-06-21T16:00:00.000+07:00',
      createdAt: '2026-03-15T00:00:00.000+07:00', updatedAt: now,
    },
    {
      id: 'user-gate-002', googleId: 'google-gate-002',
      email: 'bagus.hermawan@gmail.com', name: 'Bagus Hermawan',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=BagusHermawan',
      phone: '081300000020', role: 'GATE_STAFF', status: 'active',
      lastLoginAt: '2026-06-21T16:10:00.000+07:00',
      createdAt: '2026-03-15T00:00:00.000+07:00', updatedAt: now,
    },
    {
      id: 'user-gate-003', googleId: 'google-gate-003',
      email: 'cahya.putra@gmail.com', name: 'Cahya Putra',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=CahyaPutra',
      phone: '081200000021', role: 'GATE_STAFF', status: 'active',
      lastLoginAt: '2026-06-21T16:15:00.000+07:00',
      createdAt: '2026-03-20T00:00:00.000+07:00', updatedAt: now,
    },
    {
      id: 'user-gate-004', googleId: 'google-gate-004',
      email: 'deni.kurniawan@gmail.com', name: 'Deni Kurniawan',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=DeniKurniawan',
      phone: '081300000021', role: 'GATE_STAFF', status: 'active',
      lastLoginAt: '2026-06-22T15:30:00.000+07:00',
      createdAt: '2026-03-20T00:00:00.000+07:00', updatedAt: now,
    },
    {
      id: 'user-gate-005', googleId: 'google-gate-005',
      email: 'eko.prasetyo.gate@gmail.com', name: 'Eko Prasetyo',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=EkoPrasetyoGate',
      phone: '081200000022', role: 'GATE_STAFF', status: 'active',
      lastLoginAt: '2026-06-22T15:35:00.000+07:00',
      createdAt: '2026-03-25T00:00:00.000+07:00', updatedAt: now,
    },
  ]

  const counterStaffUsers = staffUsers.filter(u => u.role === 'COUNTER_STAFF')
  const gateStaffUsers = staffUsers.filter(u => u.role === 'GATE_STAFF')

  // ── 5. PARTICIPANT USERS (~12,000) ───────────────────────────────────────
  const participantCount = 12000
  const participants: IUser[] = []
  const usedEmails = new Set<string>()

  for (let i = 0; i < participantCount; i++) {
    const person = generatePerson()
    let uniqueEmail = person.email
    let counter = 1
    while (usedEmails.has(uniqueEmail)) {
      const base = person.email.split('@')[0]
      uniqueEmail = `${base}${counter}@gmail.com`
      counter++
    }
    usedEmails.add(uniqueEmail)

    const nameSlug = person.name.replace(/\s+/g, '')
    participants.push({
      id: `user-participant-${String(i + 1).padStart(6, '0')}`,
      googleId: `google-participant-${String(i + 1).padStart(6, '0')}`,
      email: uniqueEmail,
      name: person.name,
      avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(nameSlug)}`,
      phone: person.phone,
      role: 'PARTICIPANT',
      status: 'active',
      createdAt: randomDate('2026-03-15T00:00:00.000+07:00', '2026-06-20T23:59:59.000+07:00'),
      updatedAt: now,
    })
  }

  const allUsers: IUser[] = [...staffUsers, ...participants]

  // ── 6. BUILD TICKET ASSIGNMENTS ──────────────────────────────────────────
  interface TicketAssignment {
    ticketTypeId: string
    def: TicketTypeDef
  }

  const allAssignments: TicketAssignment[] = []
  for (const ttDef of TICKET_TYPE_DEFS) {
    for (let i = 0; i < ttDef.sold; i++) {
      allAssignments.push({ ticketTypeId: ttDef.id, def: ttDef })
    }
  }

  // Shuffle assignments
  for (let i = allAssignments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[allAssignments[i], allAssignments[j]] = [allAssignments[j], allAssignments[i]]
  }

  // ── 7. GENERATE ORDERS & TICKETS ─────────────────────────────────────────
  const orders: IOrder[] = []
  const orderItems: IOrderItem[] = []
  const tickets: ITicket[] = []

  let assignIdx = 0
  let ticketSeq = 1

  const targetOrders = 11500
  const totalAssignments = allAssignments.length

  for (let o = 0; o < targetOrders && assignIdx < totalAssignments; o++) {
    const remainingAssign = totalAssignments - assignIdx
    const remainingOrders = targetOrders - o
    let ticketCount = 1
    const r = Math.random()
    if (r < 0.22 && remainingAssign >= 2) {
      ticketCount = 2
    } else if (r < 0.32 && remainingAssign >= 3) {
      ticketCount = 3
    }

    const maxPerOrder = Math.max(1, Math.ceil(remainingAssign / remainingOrders) + 1)
    ticketCount = Math.min(ticketCount, maxPerOrder)
    ticketCount = Math.min(ticketCount, remainingAssign)

    const orderTickets: TicketAssignment[] = []

    if (Math.random() < 0.8 && assignIdx < totalAssignments) {
      const targetType = allAssignments[assignIdx].ticketTypeId
      for (let t = 0; t < ticketCount && assignIdx < totalAssignments; t++) {
        let found = false
        for (let k = assignIdx; k < Math.min(assignIdx + 10, totalAssignments); k++) {
          if (allAssignments[k].ticketTypeId === targetType) {
            ;[allAssignments[assignIdx], allAssignments[k]] = [allAssignments[k], allAssignments[assignIdx]]
            orderTickets.push(allAssignments[assignIdx])
            assignIdx++
            found = true
            break
          }
        }
        if (!found && assignIdx < totalAssignments) {
          orderTickets.push(allAssignments[assignIdx])
          assignIdx++
        }
      }
    } else {
      for (let t = 0; t < ticketCount && assignIdx < totalAssignments; t++) {
        orderTickets.push(allAssignments[assignIdx])
        assignIdx++
      }
    }

    if (orderTickets.length === 0) continue

    const statusRoll = Math.random()
    let orderStatus: OrderStatus
    if (statusRoll < 0.95) {
      orderStatus = 'paid'
    } else if (statusRoll < 0.975) {
      orderStatus = 'pending'
    } else if (statusRoll < 0.985) {
      orderStatus = 'cancelled'
    } else {
      orderStatus = 'expired'
    }

    const buyer = pickRandom(participants)
    const totalAmount = orderTickets.reduce((sum, t) => sum + t.def.price, 0)
    const orderCode = generateOrderCode()
    const orderId = `order-${String(o + 1).padStart(7, '0')}`
    const orderCreatedAt = randomDate('2026-04-01T00:00:00.000+07:00', '2026-06-21T23:59:59.000+07:00')

    // DOKU payment fields
    const paymentInfo = orderStatus === 'paid' ? pickDokuPayment() : undefined
    const paymentMethod = paymentInfo?.method
    const paymentChannel = paymentInfo?.channel
    const paidAt = orderStatus === 'paid'
      ? randomDate('2026-04-15T00:00:00.000+07:00', '2026-06-20T23:59:59.000+07:00')
      : undefined
    const expiresAt = orderStatus === 'pending'
      ? randomDate('2026-06-22T18:00:00.000+07:00', '2026-06-25T23:59:59.000+07:00')
      : undefined

    orders.push({
      id: orderId,
      tenantId: TENANT_ID,
      orderCode,
      userId: buyer.id,
      eventId: EVENT_ID,
      totalAmount,
      status: orderStatus,
      paymentMethod,
      paymentChannel,
      dokuTransactionId: orderStatus === 'paid' ? `DKU-TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` : undefined,
      paidAt,
      expiresAt,
      createdAt: orderCreatedAt,
      updatedAt: now,
    })

    const ttCountMap = new Map<string, { def: TicketTypeDef; count: number }>()
    for (const t of orderTickets) {
      const existing = ttCountMap.get(t.ticketTypeId)
      if (existing) {
        existing.count++
      } else {
        ttCountMap.set(t.ticketTypeId, { def: t.def, count: 1 })
      }
    }

    let itemIdx = 0
    for (const [ticketTypeId, info] of ttCountMap) {
      orderItems.push({
        id: `item-${orderId}-${itemIdx++}`,
        tenantId: TENANT_ID,
        orderId,
        ticketTypeId,
        quantity: info.count,
        pricePerTicket: info.def.price,
        subtotal: info.def.price * info.count,
      })
    }

    for (const t of orderTickets) {
      let ticketStatus: TicketStatus
      const tsRoll = Math.random()

      if (orderStatus === 'cancelled' || orderStatus === 'expired') {
        ticketStatus = 'cancelled'
      } else if (orderStatus === 'pending') {
        ticketStatus = 'pending'
      } else {
        if (tsRoll < 0.73) {
          ticketStatus = 'active'
        } else if (tsRoll < 0.90) {
          ticketStatus = 'redeemed'
        } else if (tsRoll < 0.965) {
          ticketStatus = 'inside'
        } else {
          ticketStatus = 'outside'
        }
      }

      const code = generateTicketCode(t.def.tierCode, ticketSeq++)
      const seatLabel = t.def.tier === 'tribun' ? `${String.fromCharCode(65 + Math.floor(Math.random() * 8))}-${Math.floor(Math.random() * 50) + 1}` : undefined

      tickets.push({
        id: `ticket-${orderId}-${itemIdx}`,
        tenantId: TENANT_ID,
        eventId: EVENT_ID,
        ticketCode: code,
        orderId,
        ticketTypeId: t.ticketTypeId,
        attendeeName: buyer.name,
        attendeeEmail: buyer.email,
        seatLabel,
        qrData: code,
        status: ticketStatus,
        wristbandCode: (ticketStatus === 'redeemed' || ticketStatus === 'inside' || ticketStatus === 'outside')
          ? `WB-${t.def.tierCode}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`
          : undefined,
        eventTitle: event.title,
        ticketTypeName: t.def.name,
        createdAt: orderCreatedAt,
        updatedAt: now,
      })
    }
  }

  // ── 8. REDEMPTIONS ───────────────────────────────────────────────────────
  const redemptions: IRedemption[] = []
  const redeemedTickets = tickets.filter(t => t.status === 'redeemed' || t.status === 'inside' || t.status === 'outside')
  let redSeq = 1

  for (const ticket of redeemedTickets) {
    const wbColor = WRISTBAND_COLORS.find(w => ticket.wristbandCode?.includes(w.color.toUpperCase().slice(0, 3))) || WRISTBAND_COLORS[0]
    const counter = activeCounters[Math.floor(Math.random() * activeCounters.length)]
    const staff = counterStaffUsers[Math.floor(Math.random() * counterStaffUsers.length)]

    redemptions.push({
      id: `redemption-${String(redSeq++).padStart(6, '0')}`,
      tenantId: TENANT_ID,
      ticketId: ticket.id,
      counterId: counter.id,
      staffId: staff.id,
      wristbandCode: ticket.wristbandCode || '',
      wristbandColor: wbColor.color,
      wristbandType: ticket.ticketTypeName.includes('VVIP') ? 'VVIP' : ticket.ticketTypeName.includes('VIP') ? 'VIP' : 'Regular',
      redeemedAt: randomDate('2026-06-22T16:00:00.000+07:00', '2026-06-22T19:00:00.000+07:00'),
    })
  }

  // ── 9. GATE LOGS ─────────────────────────────────────────────────────────
  const gateLogs: IGateLog[] = []
  const insideTickets = tickets.filter(t => t.status === 'inside')
  const outsideTickets = tickets.filter(t => t.status === 'outside')
  let glSeq = 1

  for (const ticket of insideTickets) {
    const gate = entryGates[Math.floor(Math.random() * entryGates.length)]
    const staff = gateStaffUsers[Math.floor(Math.random() * gateStaffUsers.length)]

    gateLogs.push({
      id: `gatelog-${String(glSeq++).padStart(6, '0')}`,
      tenantId: TENANT_ID,
      eventId: EVENT_ID,
      ticketId: ticket.id,
      gateId: gate.id,
      staffId: staff.id,
      action: 'entry',
      scannedAt: randomDate('2026-06-22T17:00:00.000+07:00', '2026-06-22T20:00:00.000+07:00'),
    })
  }

  for (const ticket of outsideTickets) {
    const gate = entryGates[Math.floor(Math.random() * entryGates.length)]
    const exitGate = gates.find(g => g.type === 'exit' || g.type === 'both') || entryGates[0]
    const staff = gateStaffUsers[Math.floor(Math.random() * gateStaffUsers.length)]

    // Entry log
    gateLogs.push({
      id: `gatelog-${String(glSeq++).padStart(6, '0')}`,
      tenantId: TENANT_ID,
      eventId: EVENT_ID,
      ticketId: ticket.id,
      gateId: gate.id,
      staffId: staff.id,
      action: 'entry',
      scannedAt: randomDate('2026-06-22T17:00:00.000+07:00', '2026-06-22T19:00:00.000+07:00'),
    })
    // Exit log
    gateLogs.push({
      id: `gatelog-${String(glSeq++).padStart(6, '0')}`,
      tenantId: TENANT_ID,
      eventId: EVENT_ID,
      ticketId: ticket.id,
      gateId: exitGate.id,
      staffId: gateStaffUsers[Math.floor(Math.random() * gateStaffUsers.length)].id,
      action: 'exit',
      scannedAt: randomDate('2026-06-22T19:00:00.000+07:00', '2026-06-22T22:00:00.000+07:00'),
    })
  }

  // ── 10. WRISTBAND INVENTORY ──────────────────────────────────────────────
  const wristbandInventory: IWristbandInventory[] = TICKET_TYPE_DEFS.map((def) => {
    const wbColor = WRISTBAND_COLORS[TICKET_TYPE_DEFS.indexOf(def)]
    const usedStock = tickets.filter(t =>
      t.ticketTypeId === def.id && (t.status === 'redeemed' || t.status === 'inside' || t.status === 'outside')
    ).length
    const totalStock = Math.floor(def.quota * 1.05)
    return {
      id: `wb-inv-${def.tierCode.toLowerCase()}`,
      tenantId: TENANT_ID,
      eventId: EVENT_ID,
      color: wbColor.color,
      colorHex: wbColor.hex,
      type: def.name.includes('VVIP') ? 'VVIP' : def.name.includes('VIP') ? 'VIP' : 'Regular',
      totalStock,
      usedStock,
      remainingStock: totalStock - usedStock,
      createdAt: baseDate,
      updatedAt: now,
    }
  })

  // ── 11. NOTIFICATIONS ───────────────────────────────────────────────────
  const notifications = createNotifications()

  // ── 12. ORGANIZER BANK ACCOUNTS ─────────────────────────────────────────
  const bankAccounts: IOrganizerBankAccount[] = [
    {
      id: 'bank-acct-001',
      organizerId: ORGANIZER_ID,
      bankName: 'BCA',
      accountNumber: '8800123456',
      accountHolder: ORGANIZER_NAME,
      isVerified: true,
      status: 'active',
      createdAt: '2026-02-15T10:00:00.000+07:00',
      updatedAt: now,
    },
  ]

  // ── 13. ORGANIZER FEE CONFIGS ──────────────────────────────────────────
  const organizerFeeConfigs: IOrganizerFeeConfig[] = [
    {
      organizerId: ORGANIZER_ID,
      organizerName: ORGANIZER_NAME,
      feePercent: 5,
      isApproved: true,
      createdAt: '2026-02-01T00:00:00.000+07:00',
    },
  ]

  // ── 14. ORGANIZER BALANCE ──────────────────────────────────────────────
  const paidOrders = orders.filter(o => o.status === 'paid')
  const grossRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0)
  const feePercent = organizerFeeConfigs[0].feePercent
  const platformFeeAmount = Math.round(grossRevenue * feePercent / 100)
  const netRevenue = grossRevenue - platformFeeAmount

  const balances: IOrganizerBalance[] = [
    {
      organizerId: ORGANIZER_ID,
      eventId: EVENT_ID,
      grossRevenue,
      platformFeePercent: feePercent,
      platformFeeAmount,
      netRevenue,
      totalWithdrawn: 0,
      availableBalance: netRevenue,
      isSettled: false,
    },
  ]

  // ── 15. WITHDRAWAL REQUESTS ─────────────────────────────────────────────
  const withdrawalStatuses: WithdrawalStatus[] = ['pending', 'pending', 'approved', 'transferred', 'completed', 'completed', 'rejected', 'cancelled']
  const withdrawals: IWithdrawalRequest[] = withdrawalStatuses.map((status, idx) => {
    const amount = randomInt(5_000_000, 50_000_000)
    const fee = Math.round(amount * feePercent / 100)
    const net = amount - fee
    const requestedAt = randomDate('2026-06-15T00:00:00.000+07:00', '2026-06-28T23:59:59.000+07:00')
    const wd: IWithdrawalRequest = {
      id: `mock-withdrawal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${idx}`,
      organizerId: ORGANIZER_ID,
      organizerName: ORGANIZER_NAME,
      eventId: EVENT_ID,
      eventCode: EVENT_CODE,
      eventName: event.title,
      amount,
      fee,
      netAmount: net,
      bankAccountId: bankAccounts[0].id,
      bankName: bankAccounts[0].bankName,
      accountNumber: bankAccounts[0].accountNumber,
      accountHolder: bankAccounts[0].accountHolder,
      status,
      requestedAt,
    }
    if (status === 'approved' || status === 'transferred' || status === 'completed') {
      wd.approvedAt = randomDate(requestedAt, now)
      wd.approvedBy = 'user-super-admin-001'
    }
    if (status === 'transferred' || status === 'completed') {
      wd.transferredAt = randomDate(wd.approvedAt || requestedAt, now)
      wd.transferProof = 'https://example.com/bukti-tf-mock.jpg'
      wd.transferNote = 'Transfer via BCA mobile'
    }
    if (status === 'completed') {
      wd.completedAt = randomDate(wd.transferredAt || now, now)
    }
    if (status === 'rejected') {
      wd.rejectedAt = randomDate(requestedAt, now)
      wd.rejectedBy = 'user-super-admin-001'
      wd.rejectedReason = 'Saldo tidak mencukupi setelah penyesuaian fee'
    }
    return wd
  })

  // Update balance totalWithdrawn
  const totalWithdrawn = withdrawals
    .filter(w => ['completed', 'transferred'].includes(w.status))
    .reduce((sum, w) => sum + w.netAmount, 0)
  balances[0].totalWithdrawn = totalWithdrawn
  balances[0].availableBalance = netRevenue - totalWithdrawn

  // ── 16. PAYMENT LOGS (sample from paid orders) ──────────────────────────
  const paymentLogs: IPaymentLog[] = paidOrders.slice(0, 200).map((order) => {
    const logStatus = Math.random() < 0.98 ? 'success' as const : Math.random() < 0.5 ? 'pending' as const : 'failed' as const
    return {
      id: `mock-plog-${order.id}`,
      eventId: EVENT_ID,
      orderId: order.id,
      orderCode: order.orderCode,
      transactionId: order.dokuTransactionId || `DKU-TXN-${order.id}`,
      paymentMethod: order.paymentType || 'unknown',
      paymentChannel: order.paymentChannel || 'unknown',
      amount: order.totalAmount,
      currency: 'IDR',
      status: logStatus,
      paidAt: order.paidAt,
      dokuResponseCode: logStatus === 'success' ? '2002700' : logStatus === 'pending' ? '03' : '4007300',
      notificationReceivedAt: order.paidAt,
      createdAt: order.createdAt,
    }
  })

  return {
    users: allUsers,
    event,
    ticketTypes,
    orders,
    orderItems,
    tickets,
    counters,
    gates,
    wristbandInventory,
    notifications,
    redemptions,
    gateLogs,
    bankAccounts,
    withdrawals,
    balances,
    organizerFeeConfigs,
    paymentLogs,
  }
}
