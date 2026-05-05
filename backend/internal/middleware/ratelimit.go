package middleware

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/time/rate"
)

// visitor tracks the rate limiter and last-seen time for a single client IP.
type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// rateLimiter manages in-memory rate limiting for multiple visitors.
type rateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	rate     rate.Limit
	burst    int
}

// newRateLimiter creates a rate limiter that allows `r` events per second
// with a burst of `burst` tokens.
func newRateLimiter(r rate.Limit, burst int) *rateLimiter {
	rl := &rateLimiter{
		visitors: make(map[string]*visitor),
		rate:     r,
		burst:    burst,
	}

	// Periodically clean up stale visitors so the map doesn't grow unbounded.
	go rl.cleanupStaleVisitors()

	return rl
}

// getVisitor returns the rate limiter for the given IP, creating one if
// necessary.
func (rl *rateLimiter) getVisitor(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		v = &visitor{
			limiter: rate.NewLimiter(rl.rate, rl.burst),
		}
		rl.visitors[ip] = v
	}
	v.lastSeen = time.Now()

	return v.limiter
}

// cleanupStaleVisitors removes visitors that haven't been seen in the last
// 3 minutes.
func (rl *rateLimiter) cleanupStaleVisitors() {
	for {
		time.Sleep(1 * time.Minute)

		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > 3*time.Minute {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimit returns a Fiber middleware that rate-limits requests per client IP
// using a token bucket algorithm.
//
// Default recommended values:
//   - Gate scan endpoints: RateLimit(rate.Limit(100), 50)
//   - General API:         RateLimit(rate.Limit(30), 30)
func RateLimit(r rate.Limit, burst int) fiber.Handler {
	limiter := newRateLimiter(r, burst)

	return func(c *fiber.Ctx) error {
		ip := c.IP()
		lim := limiter.getVisitor(ip)

		if !lim.Allow() {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Too many requests. Please try again later.",
			})
		}

		return c.Next()
	}
}
