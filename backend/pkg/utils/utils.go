package utils

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"time"
)

const (
	alphanumericChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	digitChars        = "0123456789"
)

// randomString generates a random string of the given length from the character set.
func randomString(length int, charset string) string {
	result := make([]byte, length)
	for i := 0; i < length; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			// Fallback to timestamp-based pseudo-random if crypto/rand fails
			n = big.NewInt(int64(time.Now().UnixNano()+int64(i)) % int64(len(charset)))
		}
		result[i] = charset[n.Int64()]
	}
	return string(result)
}

// GenerateTicketCode generates a ticket code in format "SEL-XXXX-XXXX-XXXX"
// where X is an uppercase alphanumeric character.
func GenerateTicketCode() string {
	return fmt.Sprintf("SEL-%s-%s-%s",
		randomString(4, alphanumericChars),
		randomString(4, alphanumericChars),
		randomString(4, alphanumericChars),
	)
}

// GenerateOrderCode generates an order code in format "ORD-XXXXXXXX"
// where X is a digit, based on the current timestamp.
func GenerateOrderCode() string {
	ts := time.Now().Unix()
	// Use timestamp as base, add random digits for uniqueness
	base := fmt.Sprintf("%08d", ts%100000000)
	// Replace last 3 digits with random for uniqueness in concurrent scenarios
	randomPart := randomString(3, digitChars)
	return fmt.Sprintf("ORD-%s%s", base[:5], randomPart)
}

// GenerateWristbandCode generates a wristband code in format "WB-XXXXX"
// where X is an uppercase alphanumeric character.
func GenerateWristbandCode() string {
	return fmt.Sprintf("WB-%s", randomString(5, alphanumericChars))
}

// ContainsString checks if a string exists in a slice of strings.
func ContainsString(slice []string, s string) bool {
	for _, item := range slice {
		if item == s {
			return true
		}
	}
	return false
}

// StringInArray checks if a target string exists in an array of strings (alias for ContainsString).
func StringInArray(arr []string, target string) bool {
	return ContainsString(arr, target)
}

// StringPtr returns a pointer to the given string.
// Useful for setting nullable string fields.
func StringPtr(s string) *string {
	return &s
}

// StringValue safely dereferences a string pointer, returning empty string if nil.
func StringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// SanitizeSlug converts a string to a URL-friendly slug.
func SanitizeSlug(input string) string {
	slug := strings.ToLower(input)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, "_", "-")
	// Remove non-alphanumeric characters except hyphens
	var result strings.Builder
	for _, r := range slug {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}
	return strings.Trim(result.String(), "-")
}
