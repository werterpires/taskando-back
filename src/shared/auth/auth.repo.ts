import { Injectable } from '@nestjs/common'
import { Knex } from 'knex'
import { InjectConnection } from 'nest-knexjs'
import {
  Tables,
  Users,
  UsersRoles,
  TermsSignatures,
  Terms
} from 'src/constants/db-schema.enum'
import { Logon, UserToLogon, ValidateUser as ValidateUser } from './types'
import { ERoles } from 'src/constants/roles.const'
import { Term } from 'src/terms/types'

@Injectable()
export class AuthRepo {
  constructor(@InjectConnection('knexx') private readonly knex: Knex) {}

  async updateUserToLogon(userLogon: Logon) {
    const { userId, passwordHash, userNameHash, cpfHash, signedTerms } =
      userLogon

    await this.knex.transaction(async (trx) => {
      await trx(Tables.USERS)
        .update({
          [Users.USER_PASSWORD]: passwordHash,
          [Users.USER_NAME]: userNameHash,
          [Users.USER_CPF]: cpfHash,
          [Users.USER_INVITE_CODE]: 'done' + userId
        })
        .where(Users.USER_ID, userId)

      for (const termId of signedTerms) {
        await trx(Tables.TERMS_SIGNATURES).insert({
          [TermsSignatures.USER_ID]: userId,
          [TermsSignatures.TERM_ID]: termId
        })
      }
    })
  }

  async findUserByEmailForLogin(
    email: string
  ): Promise<ValidateUser | undefined> {
    const user = await this.knex<ValidateUser>(Tables.USERS)
      .select(
        Users.USER_PASSWORD,
        Users.USER_ID,
        Users.USER_EMAIL,
        Users.USER_ACTIVE,
        Users.USER_NAME
      )
      .where(Users.USER_EMAIL, email)
      .first()

    const userRoles = await this.knex<ValidateUser>(Tables.USERS_ROLES)
      .select(UsersRoles.ROLE_ID)
      .where(UsersRoles.USER_ID, user.userId)

    user.userRoles = userRoles.map((role) => role.roleId)

    return user as ValidateUser
  }

  async findUserToLogonByInvitationCode(
    invitationCode: string
  ): Promise<UserToLogon | undefined> {
    const userConsult = await this.knex(Tables.USERS)
      .select(Users.USER_NAME, Users.USER_ID)
      .where(Users.USER_INVITE_CODE, invitationCode)
      .first()

    if (!userConsult) {
      return undefined
    }

    const rolesConsult = await this.knex(Tables.USERS_ROLES)
      .select(UsersRoles.ROLE_ID)
      .where(UsersRoles.USER_ID, userConsult.userId)

    const userRoles = rolesConsult.map((role) => role.roleId)

    const noSignedTermsConsult = await this.knex(Tables.TERMS)
      .select(
        `${Tables.TERMS}.${Terms.TERM_ID}`,
        `${Tables.TERMS}.${Terms.TERM_TEXT}`,
        `${Tables.TERMS}.${Terms.TERM_TYPE_ID}`,
        `${Tables.TERMS}.${Terms.ROLE_ID}`,
        `${Tables.TERMS}.${Terms.BEGIN_DATE}`,
        `${Tables.TERMS}.${Terms.END_DATE}`
      )
      .where(Terms.ROLE_ID, 'in', userRoles)
      .andWhere(function () {
        this.where(Terms.END_DATE, '>', new Date()).orWhereNull(Terms.END_DATE)
      })
      .whereNotExists(function () {
        this.select(TermsSignatures.TERM_ID)
          .from(Tables.TERMS_SIGNATURES)
          .where(
            Tables.TERMS_SIGNATURES + '.' + TermsSignatures.TERM_ID,
            Tables.TERMS + '.' + Terms.TERM_ID
          )
          .where(TermsSignatures.USER_ID, userConsult.userId)
          .where(TermsSignatures.TERM_UNSIGNED_TIME, null)
      })

    const user: UserToLogon | undefined = {
      userId: userConsult.userId,
      noSignedTerms: noSignedTermsConsult,
      userRoles,
      userName: userConsult.userName
    }

    return user
  }

  async findActiveTermsNotSigned(userRoles: ERoles[], userId: number) {
    const noSignedTermsConsult: Term[] = await this.knex(Tables.TERMS)
      .select(
        `${Tables.TERMS}.${Terms.TERM_ID}`,
        `${Tables.TERMS}.${Terms.TERM_TEXT}`,
        `${Tables.TERMS}.${Terms.TERM_TYPE_ID}`,
        `${Tables.TERMS}.${Terms.ROLE_ID}`,
        `${Tables.TERMS}.${Terms.BEGIN_DATE}`,
        `${Tables.TERMS}.${Terms.END_DATE}`
      )
      .where(Terms.ROLE_ID, 'in', userRoles)
      .andWhere(Terms.BEGIN_DATE, '<=', new Date())
      .andWhere(function () {
        this.where(Terms.END_DATE, '>=', new Date()).orWhereNull(Terms.END_DATE)
      })

    const termIds = noSignedTermsConsult.map((term) => term.termId)

    const signatures = await this.knex(Tables.TERMS_SIGNATURES)
      .select(TermsSignatures.TERM_ID)
      .where(TermsSignatures.TERM_ID, 'in', termIds)
      .andWhere(TermsSignatures.USER_ID, userId)
      .andWhere(TermsSignatures.TERM_UNSIGNED_TIME, null)

    const thermsFiltered = noSignedTermsConsult.filter(
      (term) =>
        !signatures.find((signature) => signature.termId === term.termId)
    )

    return thermsFiltered
  }

  async signTerms(userId: number, termIds: number[]) {
    await this.knex.transaction(async (trx) => {
      for (const termId of termIds) {
        await trx(Tables.TERMS_SIGNATURES).insert({
          [TermsSignatures.USER_ID]: userId,
          [TermsSignatures.TERM_ID]: termId
        })
      }
    })
  }
}
