package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

// StringArray stores as JSON text in database but serializes as JSON array in API.
type StringArray []string

// Scan implements sql.Scanner for GORM (DB -> Go)
func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = nil
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case string:
		bytes = []byte(v)
	case []byte:
		bytes = v
	default:
		return fmt.Errorf("failed to scan StringArray: %v", value)
	}
	if len(bytes) == 0 {
		*s = nil
		return nil
	}
	return json.Unmarshal(bytes, s)
}

// Value implements driver.Valuer for GORM (Go -> DB)
func (s StringArray) Value() (driver.Value, error) {
	if s == nil {
		return nil, nil
	}
	bytes, err := json.Marshal([]string(s))
	return string(bytes), err
}

// MarshalJSON implements json.Marshaler (Go -> API response)
func (s StringArray) MarshalJSON() ([]byte, error) {
	if s == nil {
		return []byte("[]"), nil
	}
	return json.Marshal([]string(s))
}

// UnmarshalJSON implements json.Unmarshaler (API request -> Go)
func (s *StringArray) UnmarshalJSON(data []byte) error {
	if string(data) == "null" || string(data) == `""` {
		*s = nil
		return nil
	}
	var arr []string
	if err := json.Unmarshal(data, &arr); err != nil {
		return err
	}
	*s = arr
	return nil
}
