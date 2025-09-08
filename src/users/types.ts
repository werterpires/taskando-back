export interface CreateUserData {
  email: string
  password: string
  firstName?: string
  lastName?: string
}

export interface User {
  userId: number
  email: string
  firstName?: string
  lastName?: string
}
