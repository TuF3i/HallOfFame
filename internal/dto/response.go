package dto

type Response[T any] struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data T      `json:"data"`
}

const (
	Success       = 10200
	ErrBadRequest = 40000
	ErrUnauthorized = 40100
	ErrForbidden    = 40300
	ErrNotFound     = 40400
	ErrConflict     = 40900
	ErrInternal     = 50000
)

func SuccessResp(data any) *Response[any] {
	return &Response[any]{Code: Success, Msg: "Operation Success", Data: data}
}

func SuccessMsg(msg string, data any) *Response[any] {
	return &Response[any]{Code: Success, Msg: msg, Data: data}
}

func Error(code int, msg string) *Response[any] {
	return &Response[any]{Code: code, Msg: msg, Data: nil}
}
