export interface ValidateUser {
  userPassword: string
  id: number
  email: string
  firstName: string
  lastName: string
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
  id: number
  firstName: string
  lastName: string
  email: string
}
