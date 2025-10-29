export const users: DbTable = {
  name: 'users',
  columns: {
    id: {
      name: 'userId',
      completeName: 'users.userId',
      type: 'number',
      primary: true,
      nullable: false
    },
    email: {
      name: 'email',
      completeName: 'users.email',
      type: 'string',
      length: 255,
      nullable: false,
      unique: true
    },
    password: {
      name: 'password',
      completeName: 'users.password',
      type: 'string',
      length: 255,
      nullable: false
    },
    firstName: {
      name: 'firstName',
      completeName: 'users.firstName',
      type: 'string',
      length: 100,
      nullable: true
    },
    lastName: {
      name: 'lastName',
      completeName: 'users.lastName',
      type: 'string',
      length: 100,
      nullable: true
    },
    inviteCode: {
      name: 'inviteCode',
      completeName: 'users.inviteCode',
      type: 'string',
      length: 255,
      nullable: true
    }
  }
}

export const subscriptions: DbTable = {
  name: 'subscriptions',
  columns: {
    id: {
      name: 'subscriptionId',
      completeName: 'subscriptions.subscriptionId',
      type: 'number',
      primary: true,
      nullable: false
    },
    userId: {
      name: 'userId',
      completeName: 'subscriptions.userId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    plan: {
      name: 'plan',
      completeName: 'subscriptions.plan',
      type: 'string',
      length: 255,
      nullable: false
    },
    startDate: {
      name: 'startDate',
      completeName: 'subscriptions.startDate',
      type: 'date',
      nullable: true
    },
    endDate: {
      name: 'endDate',
      completeName: 'subscriptions.endDate',
      type: 'date',
      nullable: true
    },
    status: {
      name: 'status',
      completeName: 'subscriptions.status',
      type: 'string',
      length: 255,
      nullable: false
    },
    date: {
      name: 'date',
      completeName: 'subscriptions.date',
      type: 'date',
      nullable: false
    }
  }
}

export const payments: DbTable = {
  name: 'payments',
  columns: {
    id: {
      name: 'paymentId',
      completeName: 'payments.paymentId',
      type: 'number',
      primary: true,
      nullable: false
    },
    subscriptionId: {
      name: 'subscriptionId',
      completeName: 'payments.subscriptionId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'subscriptions',
        column: 'subscriptionId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    amount: {
      name: 'amount',
      completeName: 'payments.amount',
      type: 'number',
      nullable: false
    },
    date: {
      name: 'date',
      completeName: 'payments.date',
      type: 'date',
      nullable: false
    },
    status: {
      name: 'status',
      completeName: 'payments.status',
      type: 'string',
      length: 255,
      nullable: false
    },
    paymentMethod: {
      name: 'paymentMethod',
      completeName: 'payments.paymentMethod',
      type: 'string',
      length: 255,
      nullable: false
    },
    paymentCode: {
      name: 'paymentCode',
      completeName: 'payments.paymentCode',
      type: 'string',
      length: 255,
      nullable: false
    }
  }
}

export const organizations: DbTable = {
  name: 'organizations',
  columns: {
    id: {
      name: 'orgId',
      completeName: 'organizations.org_id',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'organizations.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    cnpj: {
      name: 'cnpj',
      completeName: 'organizations.cnpj',
      type: 'string',
      length: 14,
      nullable: true,
      unique: true
    },
    address: {
      name: 'address',
      completeName: 'organizations.address',
      type: 'string',
      length: 255,
      nullable: true
    },
    phone: {
      name: 'phone',
      completeName: 'organizations.phone',
      type: 'string',
      length: 15,
      nullable: true
    },
    owner: {
      name: 'ownerId',
      completeName: 'organizations.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const organizationMembers: DbTable = {
  name: 'organizationMembers',
  columns: {
    userId: {
      name: 'userId',
      completeName: 'organizationMembers.userId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    orgId: {
      name: 'orgId',
      completeName: 'organization_members.org_id',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'organizations',
        column: 'orgId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    role: {
      name: 'role',
      completeName: 'organizationMembers.role',
      type: 'string',
      length: 255,
      nullable: false
    },
    active: {
      name: 'active',
      completeName: 'organizationMembers.active',
      type: 'boolean',
      nullable: false,
      default: true
    }
  }
}

export const departments: DbTable = {
  name: 'departments',
  columns: {
    id: {
      name: 'deptId',
      completeName: 'departments.dept_id',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'departments.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    organization: {
      name: 'orgId',
      completeName: 'departments.org_id',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'organizations',
        column: 'orgId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    owner: {
      name: 'ownerId',
      completeName: 'departments.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const departmentMembers: DbTable = {
  name: 'departmentMembers',
  columns: {
    userId: {
      name: 'userId',
      completeName: 'departmentMembers.userId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    departmentId: {
      name: 'deptId',
      completeName: 'department_members.dept_id',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'departments',
        column: 'deptId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    role: {
      name: 'role',
      completeName: 'departmentMembers.role',
      type: 'string',
      length: 100,
      nullable: false
    },
    active: {
      name: 'active',
      completeName: 'departmentMembers.active',
      type: 'boolean',
      nullable: false,
      default: true
    }
  }
}

export const teams: DbTable = {
  name: 'teams',
  columns: {
    id: {
      name: 'teamId',
      completeName: 'teams.teamId',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'teams.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    department: {
      name: 'deptId',
      completeName: 'teams.deptId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'departments',
        column: 'deptId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    organization: {
      name: 'orgId',
      completeName: 'teams.orgId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'organizations',
        column: 'orgId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    owner: {
      name: 'ownerId',
      completeName: 'teams.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const teamMembers: DbTable = {
  name: 'teamMembers',
  columns: {
    userId: {
      name: 'userId',
      completeName: 'teamMembers.userId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    teamId: {
      name: 'teamId',
      completeName: 'teamMembers.teamId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'teams',
        column: 'teamId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    role: {
      name: 'role',
      completeName: 'teamMembers.role',
      type: 'string',
      length: 100,
      nullable: false
    },
    active: {
      name: 'active',
      completeName: 'teamMembers.active',
      type: 'boolean',
      nullable: false,
      default: true
    }
  }
}

export const squads: DbTable = {
  name: 'squads',
  columns: {
    id: {
      name: 'squadId',
      completeName: 'squads.squadId',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'squads.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    leader: {
      name: 'leaderId',
      completeName: 'squads.leaderId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    team: {
      name: 'teamId',
      completeName: 'squads.teamId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'teams',
        column: 'teamId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    department: {
      name: 'deptId',
      completeName: 'squads.deptId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'departments',
        column: 'deptId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    organization: {
      name: 'orgId',
      completeName: 'squads.orgId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'organizations',
        column: 'orgId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    owner: {
      name: 'ownerId',
      completeName: 'squads.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const squadMembers: DbTable = {
  name: 'squadMembers',
  columns: {
    userId: {
      name: 'userId',
      completeName: 'squadMembers.userId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    squadId: {
      name: 'squadId',
      completeName: 'squadMembers.squadId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'squads',
        column: 'squadId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    role: {
      name: 'role',
      completeName: 'squadMembers.role',
      type: 'string',
      length: 100,
      nullable: true
    },
    active: {
      name: 'active',
      completeName: 'squadMembers.active',
      type: 'boolean',
      nullable: false,
      default: true
    }
  }
}

export const areas: DbTable = {
  name: 'areas',
  columns: {
    id: {
      name: 'areaId',
      completeName: 'areas.areaId',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'areas.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    organization: {
      name: 'orgId',
      completeName: 'areas.orgId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'organizations',
        column: 'orgId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    department: {
      name: 'deptId',
      completeName: 'areas.deptId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'departments',
        column: 'deptId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    team: {
      name: 'teamId',
      completeName: 'areas.teamId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'teams',
        column: 'teamId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    squad: {
      name: 'squadId',
      completeName: 'areas.squadId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'squads',
        column: 'squadId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    percentual: {
      name: 'percentual',
      completeName: 'areas.percentual',
      type: 'number',
      nullable: false,
      default: 0
    },
    owner: {
      name: 'ownerId',
      completeName: 'areas.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const projects: DbTable = {
  name: 'projects',
  columns: {
    id: {
      name: 'projectId',
      completeName: 'projects.projectId',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'projects.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    description: {
      name: 'description',
      completeName: 'projects.description',
      type: 'string',
      length: 1000,
      nullable: true
    },
    startDate: {
      name: 'startDate',
      completeName: 'projects.startDate',
      type: 'date',
      nullable: true
    },
    endDate: {
      name: 'endDate',
      completeName: 'projects.endDate',
      type: 'date',
      nullable: true
    },
    status: {
      name: 'status',
      completeName: 'projects.status',
      type: 'string',
      length: 50,
      nullable: false,
      default: 'PENDING'
    },
    deadline: {
      name: 'deadline',
      completeName: 'projects.deadline',
      type: 'date',
      nullable: false
    },
    organization: {
      name: 'orgId',
      completeName: 'projects.orgId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'organizations',
        column: 'orgId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    department: {
      name: 'deptId',
      completeName: 'projects.deptId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'departments',
        column: 'deptId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    team: {
      name: 'teamId',
      completeName: 'projects.teamId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'teams',
        column: 'teamId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    squad: {
      name: 'squadId',
      completeName: 'projects.squadId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'squads',
        column: 'squadId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    area: {
      name: 'areaId',
      completeName: 'projects.areaId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'areas',
        column: 'areaId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    owner: {
      name: 'ownerId',
      completeName: 'projects.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    leader: {
      name: 'leaderId',
      completeName: 'projects.leaderId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const membersOnProjects: DbTable = {
  name: 'membersOnProjects',
  columns: {
    userId: {
      name: 'userId',
      completeName: 'membersOnProjects.userId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    projectId: {
      name: 'projectId',
      completeName: 'membersOnProjects.projectId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'projects',
        column: 'projectId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    role: {
      name: 'role',
      completeName: 'membersOnProjects.role',
      type: 'string',
      length: 100,
      nullable: true
    }
  }
}

export const projectsTemplates: DbTable = {
  name: 'projectsTemplates',
  columns: {
    id: {
      name: 'templateId',
      completeName: 'projectsTemplates.templateId',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'projectsTemplates.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    description: {
      name: 'description',
      completeName: 'projectsTemplates.description',
      type: 'string',
      length: 1000,
      nullable: true
    },
    startDate: {
      name: 'startDate',
      completeName: 'projectsTemplates.startDate',
      type: 'date',
      nullable: true
    },
    endDate: {
      name: 'endDate',
      completeName: 'projectsTemplates.endDate',
      type: 'date',
      nullable: true
    },
    status: {
      name: 'status',
      completeName: 'projectsTemplates.status',
      type: 'string',
      length: 50,
      nullable: false,
      default: 'PENDING'
    },
    deadline: {
      name: 'deadline',
      completeName: 'projectsTemplates.deadline',
      type: 'date',
      nullable: false
    },
    organization: {
      name: 'orgId',
      completeName: 'projectsTemplates.orgId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'organizations',
        column: 'orgId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    department: {
      name: 'deptId',
      completeName: 'projectsTemplates.deptId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'departments',
        column: 'deptId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    team: {
      name: 'teamId',
      completeName: 'projectsTemplates.teamId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'teams',
        column: 'teamId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    squad: {
      name: 'squadId',
      completeName: 'projectsTemplates.squadId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'squads',
        column: 'squadId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    area: {
      name: 'areaId',
      completeName: 'projectsTemplates.areaId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'areas',
        column: 'areaId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    owner: {
      name: 'ownerId',
      completeName: 'projectsTemplates.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const domains: DbTable = {
  name: 'domains',
  columns: {
    id: {
      name: 'domainId',
      completeName: 'domains.domainId',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'domains.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    description: {
      name: 'description',
      completeName: 'domains.description',
      type: 'string',
      length: 1000,
      nullable: true
    },
    leader: {
      name: 'leaderId',
      completeName: 'domains.leaderId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    project: {
      name: 'projectId',
      completeName: 'domains.projectId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'projects',
        column: 'projectId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    owner: {
      name: 'ownerId',
      completeName: 'domains.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const domainMembers: DbTable = {
  name: 'domainMembers',
  columns: {
    userId: {
      name: 'userId',
      completeName: 'domainMembers.userId',
      type: 'number',

      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    domainId: {
      name: 'domainId',
      completeName: 'domainMembers.domainId',
      type: 'number',

      nullable: false,
      foreignKey: {
        table: 'domains',
        column: 'domainId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    role: {
      name: 'role',
      completeName: 'domainMembers.role',
      type: 'string',
      length: 100,
      nullable: true
    },
    active: {
      name: 'active',
      completeName: 'domainMembers.active',
      type: 'boolean',
      nullable: false
    }
  }
}

export const domainTemplates: DbTable = {
  name: 'domainTemplates',
  columns: {
    id: {
      name: 'domainTemplateId',
      completeName: 'domainTemplates.domainTemplateId',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'domainTemplates.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    description: {
      name: 'description',
      completeName: 'domainTemplates.description',
      type: 'string',
      length: 1000,
      nullable: true
    },
    projectTemplate: {
      name: 'projectId',
      completeName: 'domainTemplates.projectId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'projects',
        column: 'projectId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const products: DbTable = {
  name: 'products',
  columns: {
    id: {
      name: 'productId',
      completeName: 'products.productId',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'products.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    description: {
      name: 'description',
      completeName: 'products.description',
      type: 'string',
      length: 1000,
      nullable: true
    },
    startDate: {
      name: 'startDate',
      completeName: 'products.startDate',
      type: 'date',
      nullable: true
    },
    endDate: {
      name: 'endDate',
      completeName: 'products.endDate',
      type: 'date',
      nullable: true
    },
    status: {
      name: 'status',
      completeName: 'products.status',
      type: 'string',
      length: 50,
      nullable: false
    },
    deadline: {
      name: 'deadline',
      completeName: 'products.deadline',
      type: 'date',
      nullable: false
    },
    owner: {
      name: 'ownerId',
      completeName: 'products.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    project: {
      name: 'projectId',
      completeName: 'products.projectId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'projects',
        column: 'projectId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    domain: {
      name: 'domainId',
      completeName: 'products.domainId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'domains',
        column: 'domainId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    organization: {
      name: 'orgId',
      completeName: 'products.orgId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'organizations',
        column: 'orgId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    department: {
      name: 'deptId',
      completeName: 'products.deptId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'departments',
        column: 'deptId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    team: {
      name: 'teamId',
      completeName: 'products.teamId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'teams',
        column: 'teamId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    squad: {
      name: 'squadId',
      completeName: 'products.squadId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'squads',
        column: 'squadId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    leader: {
      name: 'leaderId',
      completeName: 'products.leaderId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    area: {
      name: 'areaId',
      completeName: 'products.areaId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'areas',
        column: 'areaId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const productsTemplates: DbTable = {
  name: 'productsTemplates',
  columns: {
    id: {
      name: 'templateId',
      completeName: 'productsTemplates.templateId',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'productsTemplates.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    description: {
      name: 'description',
      completeName: 'productsTemplates.description',
      type: 'string',
      length: 1000,
      nullable: true
    },
    startDate: {
      name: 'startDate',
      completeName: 'productsTemplates.startDate',
      type: 'date',
      nullable: true
    },
    endDate: {
      name: 'endDate',
      completeName: 'productsTemplates.endDate',
      type: 'date',
      nullable: true
    },
    status: {
      name: 'status',
      completeName: 'productsTemplates.status',
      type: 'string',
      length: 50,
      nullable: false
    },
    deadline: {
      name: 'deadline',
      completeName: 'productsTemplates.deadline',
      type: 'date',
      nullable: false
    },
    owner: {
      name: 'ownerId',
      completeName: 'productsTemplates.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    project: {
      name: 'projectId',
      completeName: 'productsTemplates.projectId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'projects',
        column: 'projectId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    domain: {
      name: 'domainId',
      completeName: 'productsTemplates.domainId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'domains',
        column: 'domainId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    organization: {
      name: 'orgId',
      completeName: 'productsTemplates.orgId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'organizations',
        column: 'orgId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    department: {
      name: 'deptId',
      completeName: 'productsTemplates.deptId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'departments',
        column: 'deptId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    team: {
      name: 'teamId',
      completeName: 'productsTemplates.teamId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'teams',
        column: 'teamId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    squad: {
      name: 'squadId',
      completeName: 'productsTemplates.squadId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'squads',
        column: 'squadId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const productMembers: DbTable = {
  name: 'productMembers',
  columns: {
    userId: {
      name: 'userId',
      completeName: 'productMembers.userId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    productId: {
      name: 'productId',
      completeName: 'productMembers.productId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'products',
        column: 'productId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    role: {
      name: 'role',
      completeName: 'productMembers.role',
      type: 'string',
      length: 100,
      nullable: true
    },
    active: {
      name: 'active',
      completeName: 'productMembers.active',
      type: 'boolean',
      nullable: false
    }
  }
}

export const processes: DbTable = {
  name: 'processes',
  columns: {
    id: {
      name: 'processId',
      completeName: 'processes.processId',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'processes.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    description: {
      name: 'description',
      completeName: 'processes.description',
      type: 'string',
      length: 1000,
      nullable: true
    },
    startDate: {
      name: 'startDate',
      completeName: 'processes.startDate',
      type: 'date',
      nullable: true
    },
    endDate: {
      name: 'endDate',
      completeName: 'processes.endDate',
      type: 'date',
      nullable: true
    },
    organization: {
      name: 'orgId',
      completeName: 'processes.orgId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'organizations',
        column: 'orgId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    department: {
      name: 'deptId',
      completeName: 'processes.deptId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'departments',
        column: 'deptId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    team: {
      name: 'teamId',
      completeName: 'processes.teamId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'teams',
        column: 'teamId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    squad: {
      name: 'squadId',
      completeName: 'processes.squadId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'squads',
        column: 'squadId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    product: {
      name: 'productId',
      completeName: 'processes.productId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'products',
        column: 'productId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    domain: {
      name: 'domainId',
      completeName: 'processes.domainId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'domains',
        column: 'domainId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    project: {
      name: 'projectId',
      completeName: 'processes.projectId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'projects',
        column: 'projectId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    owner: {
      name: 'ownerId',
      completeName: 'processes.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    status: {
      name: 'status',
      completeName: 'processes.status',
      type: 'string',
      length: 50,
      nullable: false,
      default: 'PENDING'
    },
    deadline: {
      name: 'deadline',
      completeName: 'processes.deadline',
      type: 'date',
      nullable: false
    },
    leader: {
      name: 'leaderId',
      completeName: 'processes.leaderId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const phases: DbTable = {
  name: 'phases',
  columns: {
    id: {
      name: 'phaseId',
      completeName: 'phases.phaseId',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'phases.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    description: {
      name: 'description',
      completeName: 'phases.description',
      type: 'string',
      length: 1000,
      nullable: true
    },
    startDate: {
      name: 'startDate',
      completeName: 'phases.startDate',
      type: 'date',
      nullable: true
    },
    endDate: {
      name: 'endDate',
      completeName: 'phases.endDate',
      type: 'date',
      nullable: true
    },
    deadline: {
      name: 'deadline',
      completeName: 'phases.deadline',
      type: 'date',
      nullable: false
    },
    processId: {
      name: 'processId',
      completeName: 'phases.processId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'processes',
        column: 'processId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const phaseMembers: DbTable = {
  name: 'phaseMembers',
  columns: {
    userId: {
      name: 'userId',
      completeName: 'phaseMembers.userId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    phaseId: {
      name: 'phaseId',
      completeName: 'phaseMembers.phaseId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'phases',
        column: 'phaseId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    role: {
      name: 'role',
      completeName: 'phaseMembers.role',
      type: 'string',
      length: 100,
      nullable: true
    },
    active: {
      name: 'active',
      completeName: 'phaseMembers.active',
      type: 'boolean',
      nullable: false,
      default: true
    }
  }
}

export const processMembers: DbTable = {
  name: 'processMembers',
  columns: {
    userId: {
      name: 'userId',
      completeName: 'processMembers.userId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    processId: {
      name: 'processId',
      completeName: 'processMembers.processId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'processes',
        column: 'processId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    role: {
      name: 'role',
      completeName: 'processMembers.role',
      type: 'string',
      length: 100,
      nullable: true
    },
    active: {
      name: 'active',
      completeName: 'processMembers.active',
      type: 'boolean',
      nullable: false,
      default: true
    }
  }
}

export const processTemplates: DbTable = {
  name: 'processTemplates',
  columns: {
    processId: {
      name: 'templateId',
      completeName: 'processTemplates.templateId',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'processTemplates.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    description: {
      name: 'description',
      completeName: 'processTemplates.description',
      type: 'string',
      length: 1000,
      nullable: true
    },

    startDate: {
      name: 'startDate',
      completeName: 'processTemplates.startDate',
      type: 'date',
      nullable: true
    },
    endDate: {
      name: 'endDate',
      completeName: 'processTemplates.endDate',
      type: 'date',
      nullable: true
    },
    organization: {
      name: 'orgId',
      completeName: 'processTemplates.orgId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'organizations',
        column: 'orgId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    department: {
      name: 'deptId',
      completeName: 'processTemplates.deptId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'departments',
        column: 'deptId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    team: {
      name: 'teamId',
      completeName: 'processTemplates.teamId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'teams',
        column: 'teamId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    squad: {
      name: 'squadId',
      completeName: 'processTemplates.squadId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'squads',
        column: 'squadId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    owner: {
      name: 'ownerId',
      completeName: 'processTemplates.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    productTemplate: {
      name: 'productTemplateId',
      completeName: 'processTemplates.productTemplateId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'productsTemplates',
        column: 'templateId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    projectTemplate: {
      name: 'projectTemplateId',
      completeName: 'processTemplates.projectTemplateId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'projectsTemplates',
        column: 'templateId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const phsesTemplates: DbTable = {
  name: 'phasesTemplates',
  columns: {
    templateId: {
      name: 'templateId',
      completeName: 'phasesTemplates.templateId',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'phasesTemplates.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    description: {
      name: 'description',
      completeName: 'phasesTemplates.description',
      type: 'string',
      length: 1000,
      nullable: true
    },
    startDate: {
      name: 'startDate',
      completeName: 'phasesTemplates.startDate',
      type: 'date',
      nullable: true
    },
    endDate: {
      name: 'endDate',
      completeName: 'phasesTemplates.endDate',
      type: 'date',
      nullable: true
    },
    processTemplate: {
      name: 'processTemplateId',
      completeName: 'phasesTemplates.processTemplateId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'processTemplates',
        column: 'templateId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    owner: {
      name: 'ownerId',
      completeName: 'phasesTemplates.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const phasesDependencies: DbTable = {
  name: 'phasesDependencies',
  columns: {
    fromPhase: {
      name: 'fromPhaseId',
      completeName: 'phasesDependencies.fromPhaseId',
      type: 'number',
      nullable: false
    },
    toPhase: {
      name: 'toPhaseId',
      completeName: 'phasesDependencies.toPhaseId',
      type: 'number',
      nullable: false
    }
  }
}

export const phasesTemplatesDependencies: DbTable = {
  name: 'phasesTemplatesDependencies',
  columns: {
    fromPhaseTemplate: {
      name: 'fromPhaseTemplateId',
      completeName: 'phasesTemplatesDependencies.fromPhaseTemplateId',
      type: 'number',
      nullable: false
    },
    toPhaseTemplate: {
      name: 'toPhaseTemplateId',
      completeName: 'phasesTemplatesDependencies.toPhaseTemplateId',
      type: 'number',
      nullable: false
    }
  }
}

export const tasks: DbTable = {
  name: 'tasks',
  columns: {
    id: {
      name: 'taskId',
      completeName: 'tasks.taskId',
      type: 'number',
      primary: true,
      nullable: false
    },
    name: {
      name: 'name',
      completeName: 'tasks.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    description: {
      name: 'description',
      completeName: 'tasks.description',
      type: 'string',
      length: 1000,
      nullable: true
    },
    startDate: {
      name: 'startDate',
      completeName: 'tasks.startDate',
      type: 'date',
      nullable: true
    },
    endDate: {
      name: 'endDate',
      completeName: 'tasks.endDate',
      type: 'date',
      nullable: true
    },
    deadline: {
      name: 'deadline',
      completeName: 'tasks.deadline',
      type: 'date',
      nullable: false
    },
    status: {
      name: 'status',
      completeName: 'tasks.status',
      type: 'string',
      length: 50,
      nullable: false,
      default: 'PENDING'
    },
    priority: {
      name: 'priority',
      completeName: 'tasks.priority',
      type: 'string',
      length: 50,
      nullable: false,
      default: 'MEDIUM'
    },
    owner: {
      name: 'ownerId',
      completeName: 'tasks.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    size: {
      name: 'size',
      completeName: 'tasks.size',
      type: 'number',
      nullable: true,
      default: 0
    },
    taskType: {
      name: 'taskType',
      completeName: 'tasks.taskType',
      type: 'string',
      length: 50,
      nullable: false,
      default: 'GENERAL'
    },
    showInCalendar: {
      name: 'showInCalendar',
      completeName: 'tasks.showInCalendar',
      type: 'boolean',
      nullable: false,
      default: true
    },
    process: {
      name: 'processId',
      completeName: 'tasks.processId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'processes',
        column: 'processId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    project: {
      name: 'projectId',
      completeName: 'tasks.projectId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'projects',
        column: 'projectId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    domain: {
      name: 'domainId',
      completeName: 'tasks.domainId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'domains',
        column: 'domainId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    product: {
      name: 'productId',
      completeName: 'tasks.productId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'products',
        column: 'productId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    team: {
      name: 'teamId',
      completeName: 'tasks.teamId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'teams',
        column: 'teamId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    squad: {
      name: 'squadId',
      completeName: 'tasks.squadId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'squads',
        column: 'squadId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    area: {
      name: 'areaId',
      completeName: 'tasks.areaId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'areas',
        column: 'areaId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    organization: {
      name: 'orgId',
      completeName: 'tasks.orgId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'organizations',
        column: 'orgId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    department: {
      name: 'deptId',
      completeName: 'tasks.deptId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'departments',
        column: 'deptId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    phase: {
      name: 'phaseId',
      completeName: 'tasks.phaseId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'phases',
        column: 'phaseId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const taskMembers: DbTable = {
  name: 'taskMembers',
  columns: {
    userId: {
      name: 'userId',
      completeName: 'taskMembers.userId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    taskId: {
      name: 'taskId',
      completeName: 'taskMembers.taskId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'tasks',
        column: 'taskId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    role: {
      name: 'role',
      completeName: 'taskMembers.role',
      type: 'string',
      length: 100,
      nullable: true
    },
    active: {
      name: 'active',
      completeName: 'taskMembers.active',
      type: 'boolean',
      nullable: false,
      default: true
    }
  }
}

export const tasksDependencies: DbTable = {
  name: 'tasksDependencies',
  columns: {
    taskId: {
      name: 'taskId',
      completeName: 'tasksDependencies.taskId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'tasks',
        column: 'taskId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    dependencyId: {
      name: 'dependencyId',
      completeName: 'tasksDependencies.dependencyId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'tasks',
        column: 'taskId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const tasksTemplates: DbTable = {
  name: 'tasksTemplates',
  columns: {
    id: {
      name: 'templateId',
      completeName: 'tasksTemplates.templateId',
      type: 'number',
      primary: true,
      nullable: false,
      unique: true
    },
    name: {
      name: 'name',
      completeName: 'tasks.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    description: {
      name: 'description',
      completeName: 'tasks.description',
      type: 'string',
      length: 1000,
      nullable: true
    },
    startDate: {
      name: 'startDate',
      completeName: 'tasks.startDate',
      type: 'date',
      nullable: true
    },
    endDate: {
      name: 'endDate',
      completeName: 'tasks.endDate',
      type: 'date',
      nullable: true
    },
    deadline: {
      name: 'deadline',
      completeName: 'tasks.deadline',
      type: 'date',
      nullable: false
    },
    status: {
      name: 'status',
      completeName: 'tasks.status',
      type: 'string',
      length: 50,
      nullable: true,
      default: 'PENDING'
    },
    priority: {
      name: 'priority',
      completeName: 'tasks.priority',
      type: 'string',
      length: 50,
      nullable: false,
      default: 'MEDIUM'
    },
    owner: {
      name: 'ownerId',
      completeName: 'tasks.ownerId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'users',
        column: 'userId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    size: {
      name: 'size',
      completeName: 'tasks.size',
      type: 'number',
      nullable: false,
      default: 0
    },
    taskType: {
      name: 'taskType',
      completeName: 'tasks.taskType',
      type: 'string',
      length: 50,
      nullable: false,
      default: 'GENERAL'
    },
    showInCalendar: {
      name: 'showInCalendar',
      completeName: 'tasks.showInCalendar',
      type: 'boolean',
      nullable: false,
      default: true
    },
    repetitions: {
      name: 'repetitions',
      completeName: 'tasks.repetitions',
      type: 'number',
      nullable: true,
      default: 0
    },
    repetitionType: {
      name: 'repetitionType',
      completeName: 'tasks.repetitionType',
      type: 'string',
      length: 50,
      nullable: true,
      default: null
    },
    repetitionInterval: {
      name: 'repetitionInterval',
      completeName: 'tasks.repetitionInterval',
      type: 'number',
      nullable: true,
      default: null
    },
    repetitionIntervalType: {
      name: 'repetitionIntervalType',
      completeName: 'tasks.repetitionIntervalType',
      type: 'string',
      length: 50,
      nullable: true,
      default: null
    },
    repetitionEndDate: {
      name: 'repetitionEndDate',
      completeName: 'tasks.repetitionEndDate',
      type: 'date',
      nullable: true,
      default: null
    },
    repetitionStartDate: {
      name: 'repetitionStartDate',
      completeName: 'tasks.repetitionStartDate',
      type: 'date',
      nullable: true,
      default: null
    },

    team: {
      name: 'teamId',
      completeName: 'tasks.teamId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'teams',
        column: 'teamId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    squad: {
      name: 'squadId',
      completeName: 'tasks.squadId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'squads',
        column: 'squadId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    area: {
      name: 'areaId',
      completeName: 'tasks.areaId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'areas',
        column: 'areaId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    organization: {
      name: 'orgId',
      completeName: 'tasks.orgId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'organizations',
        column: 'orgId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    department: {
      name: 'deptId',
      completeName: 'tasks.deptId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'departments',
        column: 'deptId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    projectTemplate: {
      name: 'projectTemplateId',
      completeName: 'tasks.projectTemplateId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'projectsTemplates',
        column: 'templateId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    productTemplate: {
      name: 'productTemplateId',
      completeName: 'tasks.productTemplateId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'productsTemplates',
        column: 'templateId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    processTemplate: {
      name: 'processTemplateId',
      completeName: 'tasks.processTemplateId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'processTemplates',
        column: 'templateId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    },
    phaseTemplate: {
      name: 'phaseTemplateId',
      completeName: 'tasks.phaseTemplateId',
      type: 'number',
      nullable: true,
      foreignKey: {
        table: 'phasesTemplates',
        column: 'templateId',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const tasksTemplatesDependencies: DbTable = {
  name: 'tasksTemplatesDependencies',
  columns: {
    taskTemplateId: {
      name: 'taskTemplateId',
      completeName: 'tasksTemplatesDependencies.taskTemplateId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'tasksTemplates',
        column: 'templateId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    dependencyTemplateId: {
      name: 'dependencyTemplateId',
      completeName: 'tasksTemplatesDependencies.dependencyTemplateId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'tasksTemplates',
        column: 'templateId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    }
  }
}

export const tasksChecklistsItems: DbTable = {
  name: 'tasksChecklistsItems',
  columns: {
    id: {
      name: 'checklistId',
      completeName: 'tasksChecklistsItems.checklistId',
      type: 'number',
      primary: true,
      nullable: false
    },
    taskId: {
      name: 'taskId',
      completeName: 'tasksChecklistsItems.taskId',
      type: 'number',
      nullable: false,
      foreignKey: {
        table: 'tasks',
        column: 'taskId',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    },
    name: {
      name: 'name',
      completeName: 'tasksChecklistsItems.name',
      type: 'string',
      length: 255,
      nullable: false
    },
    description: {
      name: 'description',
      completeName: 'tasksChecklistsItems.description',
      type: 'string',
      length: 1000,
      nullable: true
    },
    checked: {
      name: 'checked',
      completeName: 'tasksChecklistsItems.checked',
      type: 'boolean',
      nullable: false,
      default: false
    }
  }
}

export const dbTables: DbTable[] = [
  users,
  subscriptions,
  payments,
  organizations,
  organizationMembers,
  departments,
  departmentMembers,
  teams,
  teamMembers,
  squads,
  squadMembers,
  areas,
  projects,
  membersOnProjects,
  projectsTemplates,
  domains,
  domainMembers,
  products,
  productsTemplates,
  productMembers,
  processes,
  phases,
  phaseMembers,
  processMembers,
  processTemplates,
  phsesTemplates,
  phasesDependencies,
  phasesTemplatesDependencies,
  tasks,
  taskMembers,
  tasksDependencies,
  tasksTemplates,
  tasksTemplatesDependencies,
  tasksChecklistsItems
]

export interface DbTable {
  name: string
  columns: { [key: string]: DbColumn }
}

export interface DbColumn {
  name: string
  completeName: string
  type: string
  length?: number
  nullable?: boolean
  default?: any
  unique?: boolean
  primary?: boolean
  foreignKey?: {
    table: string
    column: string
    onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT'
    onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT'
  }
}
