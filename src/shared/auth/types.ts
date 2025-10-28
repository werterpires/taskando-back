export interface ValidateUser {
  password: string
  userId: number
  email: string
  firstName: string | null
  lastName: string | null
}

export interface UserToken {
  accessToken: string
}

export interface UserPayload {
  email: string
  sub: number
  firstName: string
  lastName: string
  iat?: number
  exp?: number
}

export interface AuthRequest extends Request {
  user: ValidateUser
}

export interface UserFromJwt {
  userId: number
  firstName: string
  lastName: string
  email: string
}
