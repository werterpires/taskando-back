import { ERoles } from 'src/constants/roles.const'
import { Term } from 'src/terms/types'

export interface ValidateUser {
  userPassword: string
  userId: number
  userEmail: string
  userActive: boolean
  userName: string
  userRoles: number[]
}

export interface UserToLogon {
  userId: number
  userName: string
  userRoles: ERoles[]
  noSignedTerms: Term[]
}

export interface UserToken {
  accessToken: string
}

export interface UserPayload {
  userEmail: string
  sub: number
  userName: string
  userActive: boolean
  usersRoles: number[]
  iat?: number
  exp?: number
}

export interface AuthRequest extends Request {
  user: ValidateUser
}

export interface Logon {
  userId: number
  userNameHash: string
  cpfHash: string
  passwordHash: string
  signedTerms: number[]
}

export interface UserFromJwt {
  userId: number
  userName: string
  userEmail: string
  userRoles: number[]
  userActive: boolean
}
