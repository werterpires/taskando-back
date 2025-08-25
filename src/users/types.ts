export interface CreateUserData {
  email: string
  password: string
  firstName?: string
  lastName?: string
}

export interface User extends CreateUserData {
  userId: number
}
