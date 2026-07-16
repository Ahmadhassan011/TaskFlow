import {
  PrismaClient,
  Role,
  ProjectStatus,
  TaskStatus,
  Priority,
  ShareAccess,
  ShareTarget,
  AuditDecision,
  MembershipStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123';
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);

async function main() {
  console.log('🧹 Deleting all existing records...');
  // Delete every table in one shot. CASCADE handles FK ordering.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "User", "Tenant", "TenantMembership", "Invitation", "ResourceShare",
      "AuditLog", "Project", "ProjectMember", "Task", "Subtask", "Comment",
      "Label", "TaskLabel", "RefreshToken", "PasswordResetToken",
      "EmailVerificationToken", "ActivityLog", "Notification", "Attachment"
    RESTART IDENTITY CASCADE;
  `);
  console.log('✅ Database cleared');

  const password = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ---------------------------------------------------------------------------
  // USERS
  // ---------------------------------------------------------------------------
  const usersData = [
    { email: 'owner@taskflow.com', name: 'Ahmad Hassan', role: Role.OWNER, isVerified: true },
    { email: 'admin@taskflow.com', name: 'Sara Admin', role: Role.ADMIN, isVerified: true },
    { email: 'manager@taskflow.com', name: 'Mike Manager', role: Role.MANAGER, isVerified: true },
    { email: 'member1@taskflow.com', name: 'Emma Wilson', role: Role.MEMBER, isVerified: true },
    { email: 'member2@taskflow.com', name: 'Liam Brown', role: Role.MEMBER, isVerified: true },
    { email: 'member3@taskflow.com', name: 'Olivia Davis', role: Role.MEMBER, isVerified: true },
    { email: 'owner2@acme.com', name: 'John Acme', role: Role.OWNER, isVerified: true },
    { email: 'designer@acme.com', name: 'Sophia Martin', role: Role.MEMBER, isVerified: true },
    { email: 'owner3@globex.com', name: 'Robert Globex', role: Role.OWNER, isVerified: true },
    { email: 'contractor@taskflow.com', name: 'Chris Consultant', role: Role.MEMBER, isVerified: false },
  ];

  const users: Record<string, any> = {};
  for (const u of usersData) {
    users[u.email] = await prisma.user.create({ data: { ...u, password } });
  }
  console.log(`✅ ${usersData.length} users created`);

  // ---------------------------------------------------------------------------
  // TENANTS (workspaces)
  // ---------------------------------------------------------------------------
  const tenantsData = [
    { slug: 'taskflow-demo', name: 'TaskFlow Demo Workspace', ownerEmail: 'owner@taskflow.com' },
    { slug: 'acme-corp', name: 'Acme Corporation', ownerEmail: 'owner2@acme.com' },
    { slug: 'globex-inc', name: 'Globex Inc', ownerEmail: 'owner3@globex.com' },
  ];
  const tenants: Record<string, any> = {};
  for (const t of tenantsData) {
    tenants[t.slug] = await prisma.tenant.create({
      data: { name: t.name, slug: t.slug, ownerId: users[t.ownerEmail].id },
    });
  }
  console.log(`✅ ${tenantsData.length} workspaces created`);

  // ---------------------------------------------------------------------------
  // TENANT MEMBERSHIPS
  // ---------------------------------------------------------------------------
  const memberships: [string, string, Role][] = [
    ['taskflow-demo', 'owner@taskflow.com', Role.OWNER],
    ['taskflow-demo', 'admin@taskflow.com', Role.ADMIN],
    ['taskflow-demo', 'manager@taskflow.com', Role.MANAGER],
    ['taskflow-demo', 'member1@taskflow.com', Role.MEMBER],
    ['taskflow-demo', 'member2@taskflow.com', Role.MEMBER],
    ['taskflow-demo', 'member3@taskflow.com', Role.MEMBER],
    ['taskflow-demo', 'contractor@taskflow.com', Role.MEMBER],
    ['acme-corp', 'owner2@acme.com', Role.OWNER],
    ['acme-corp', 'designer@acme.com', Role.MEMBER],
    ['acme-corp', 'contractor@taskflow.com', Role.GUEST],
    ['globex-inc', 'owner3@globex.com', Role.OWNER],
  ];
  for (const [slug, email, role] of memberships) {
    await prisma.tenantMembership.create({
      data: { tenantId: tenants[slug].id, userId: users[email].id, role, status: MembershipStatus.ACTIVE },
    });
  }
  console.log(`✅ ${memberships.length} memberships created`);

  // ---------------------------------------------------------------------------
  // PROJECTS
  // ---------------------------------------------------------------------------
  const projectsData = [
    { slug: 'website-redesign', name: 'Website Redesign', desc: 'Complete redesign of the company website with modern UI/UX.', status: ProjectStatus.ACTIVE, tenant: 'taskflow-demo', owner: 'manager@taskflow.com', start: -60, end: 120 },
    { slug: 'mobile-app', name: 'Mobile App Development', desc: 'Cross-platform mobile app for iOS and Android.', status: ProjectStatus.ACTIVE, tenant: 'taskflow-demo', owner: 'manager@taskflow.com', start: -30, end: 240 },
    { slug: 'api-platform', name: 'API Platform', desc: 'Public REST + GraphQL API with rate limiting and docs.', status: ProjectStatus.ACTIVE, tenant: 'taskflow-demo', owner: 'admin@taskflow.com', start: -20, end: 180 },
    { slug: 'marketing-campaign', name: 'Q3 Marketing Campaign', desc: 'Launch campaign across social and email channels.', status: ProjectStatus.ON_HOLD, tenant: 'taskflow-demo', owner: 'member1@taskflow.com', start: -10, end: 60 },
    { slug: 'erp-implementation', name: 'ERP Implementation', desc: 'Roll out the new ERP across departments.', status: ProjectStatus.ACTIVE, tenant: 'acme-corp', owner: 'owner2@acme.com', start: -45, end: 200 },
    { slug: 'brand-refresh', name: 'Brand Refresh', desc: 'New logo, palette, and brand guidelines.', status: ProjectStatus.COMPLETED, tenant: 'acme-corp', owner: 'designer@acme.com', start: -90, end: -5 },
    { slug: 'data-migration', name: 'Legacy Data Migration', desc: 'Migrate data from the legacy system to the new warehouse.', status: ProjectStatus.ACTIVE, tenant: 'globex-inc', owner: 'owner3@globex.com', start: -15, end: 90 },
  ];
  const projects: Record<string, any> = {};
  for (const p of projectsData) {
    projects[p.slug] = await prisma.project.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.desc,
        status: p.status,
        startDate: daysFromNow(p.start),
        endDate: p.end ? daysFromNow(p.end) : null,
        ownerId: users[p.owner].id,
        tenantId: tenants[p.tenant].id,
      },
    });
  }
  console.log(`✅ ${projectsData.length} projects created`);

  // ---------------------------------------------------------------------------
  // PROJECT MEMBERS
  // ---------------------------------------------------------------------------
  const projectMembers: [string, string, string][] = [
    ['website-redesign', 'manager@taskflow.com', 'manager'],
    ['website-redesign', 'member1@taskflow.com', 'member'],
    ['website-redesign', 'member2@taskflow.com', 'member'],
    ['website-redesign', 'contractor@taskflow.com', 'member'],
    ['mobile-app', 'manager@taskflow.com', 'manager'],
    ['mobile-app', 'member1@taskflow.com', 'member'],
    ['mobile-app', 'member3@taskflow.com', 'member'],
    ['api-platform', 'admin@taskflow.com', 'manager'],
    ['api-platform', 'member2@taskflow.com', 'member'],
    ['marketing-campaign', 'member1@taskflow.com', 'manager'],
    ['marketing-campaign', 'member3@taskflow.com', 'member'],
    ['erp-implementation', 'owner2@acme.com', 'manager'],
    ['erp-implementation', 'designer@acme.com', 'member'],
    ['brand-refresh', 'designer@acme.com', 'manager'],
    ['data-migration', 'owner3@globex.com', 'manager'],
  ];
  for (const [slug, email, role] of projectMembers) {
    await prisma.projectMember.create({
      data: { projectId: projects[slug].id, userId: users[email].id, role },
    });
  }
  console.log(`✅ ${projectMembers.length} project members added`);

  // ---------------------------------------------------------------------------
  // LABELS (per project)
  // ---------------------------------------------------------------------------
  const labelDefs = [
    { name: 'Bug', color: '#EF4444' },
    { name: 'Feature', color: '#3B82F6' },
    { name: 'Urgent', color: '#F59E0B' },
    { name: 'Design', color: '#A855F7' },
    { name: 'Backend', color: '#10B981' },
    { name: 'Frontend', color: '#06B6D4' },
  ];
  const labels: Record<string, any> = {};
  for (const slug of Object.keys(projects)) {
    for (const l of labelDefs) {
      const key = `${slug}:${l.name}`;
      labels[key] = await prisma.label.create({
        data: { name: l.name, color: l.color, projectId: projects[slug].id, tenantId: projects[slug].tenantId },
      });
    }
  }
  console.log(`✅ ${Object.keys(labels).length} labels created`);

  // ---------------------------------------------------------------------------
  // TASKS (generated per project)
  // ---------------------------------------------------------------------------
  const taskTitlePool = [
    'Design wireframes', 'Implement authentication', 'Fix navigation bug', 'Set up CI/CD pipeline',
    'Write API documentation', 'Build dashboard widgets', 'Optimize database queries', 'Add dark mode',
    'Create onboarding flow', 'Integrate payment gateway', 'Write unit tests', 'Refactor legacy service',
    'Improve error handling', 'Add export to CSV', 'Set up monitoring', 'Migrate to new schema',
    'Build admin panel', 'Implement search', 'Add email notifications', 'Create landing page',
    'Polish mobile layout', 'Add role-based access', 'Write E2E tests', 'Set up analytics',
  ];
  const taskStatuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.DONE];
  const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT];

  const tasks: any[] = [];
  let titleIdx = 0;
  for (const slug of Object.keys(projects)) {
    const project = projects[slug];
    const members = projectMembers.filter((pm) => pm[0] === slug).map((pm) => pm[1]);
    if (members.length === 0) members.push('owner@taskflow.com');
    const count = 4 + (titleIdx % 3); // 4-6 tasks per project
    for (let i = 0; i < count; i++) {
      const assignee = users[members[i % members.length]];
      const status = taskStatuses[(titleIdx + i) % taskStatuses.length];
      const priority = priorities[(titleIdx + i) % priorities.length];
      const task = await prisma.task.create({
        data: {
          title: taskTitlePool[titleIdx % taskTitlePool.length],
          description: `Auto-generated task for ${project.name}.`,
          status,
          priority,
          dueDate: daysFromNow(5 + ((titleIdx + i) % 40)),
          projectId: project.id,
          tenantId: project.tenantId,
          assigneeId: assignee.id,
        },
      });
      tasks.push({ ...task, slug, assignee: assignee.email });
      titleIdx++;
    }
  }
  console.log(`✅ ${tasks.length} tasks created`);

  // ---------------------------------------------------------------------------
  // SUBTASKS, COMMENTS, TASK LABELS (loop over tasks)
  // ---------------------------------------------------------------------------
  let subtaskCount = 0;
  let commentCount = 0;
  let taskLabelCount = 0;
  const commentTexts = [
    'Looks good, let’s proceed.',
    'Can we get a review by Friday?',
    'I started on this, will update soon.',
    'Blocked by the API change.',
    'Merged and deployed to staging.',
  ];
  const projectAssigneesForComments = (slug: string) =>
    projectMembers.filter((pm) => pm[0] === slug).map((pm) => pm[1]);

  for (const t of tasks) {
    const candidateCommenters = projectAssigneesForComments(t.slug);
    const subCount = 2 + (tasks.indexOf(t) % 3);
    for (let i = 0; i < subCount; i++) {
      await prisma.subtask.create({
        data: { title: `Subtask ${i + 1} for ${t.title}`, isCompleted: i % 2 === 0, taskId: t.id },
      });
      subtaskCount++;
    }
    const cCount = 1 + (tasks.indexOf(t) % 3);
    for (let i = 0; i < cCount; i++) {
      const author = users[candidateCommenters[i % candidateCommenters.length]];
      await prisma.comment.create({
        data: { content: commentTexts[(tasks.indexOf(t) + i) % commentTexts.length], taskId: t.id, authorId: author.id },
      });
      commentCount++;
    }
    // attach 1-2 labels
    const labelKeys = Object.keys(labels).filter((k) => k.startsWith(`${t.slug}:`));
    for (let i = 0; i < Math.min(2, labelKeys.length); i++) {
      await prisma.taskLabel.create({
        data: { taskId: t.id, labelId: labels[labelKeys[(tasks.indexOf(t) + i) % labelKeys.length]].id },
      });
      taskLabelCount++;
    }
  }
  console.log(`✅ ${subtaskCount} subtasks, ${commentCount} comments, ${taskLabelCount} task-labels created`);

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------------
  const notifTypes = ['ASSIGNED', 'COMMENTED', 'DUE_SOON', 'STATUS_CHANGED'];
  let notifCount = 0;
  for (const email of Object.keys(users)) {
    const u = users[email];
    const tenantSlug = memberships.find((m) => m[1] === email)?.[0] ?? 'taskflow-demo';
    for (let i = 0; i < 3; i++) {
      await prisma.notification.create({
        data: {
          type: notifTypes[(notifCount + i) % notifTypes.length],
          message: `Notification #${i + 1} for ${u.name}`,
          read: i === 0,
          link: '/dashboard',
          tenantId: tenants[tenantSlug].id,
          userId: u.id,
        },
      });
      notifCount++;
    }
  }
  console.log(`✅ ${notifCount} notifications created`);

  // ---------------------------------------------------------------------------
  // ACTIVITY LOGS
  // ---------------------------------------------------------------------------
  const activityActions = ['PROJECT_CREATED', 'TASK_CREATED', 'TASK_UPDATED', 'COMMENT_ADDED', 'MEMBER_ADDED'];
  let activityCount = 0;
  for (const slug of Object.keys(tenants)) {
    const tenant = tenants[slug];
    const tenantUsers = memberships.filter((m) => m[0] === slug).map((m) => m[1]);
    for (let i = 0; i < 5; i++) {
      const u = users[tenantUsers[i % tenantUsers.length]];
      await prisma.activityLog.create({
        data: {
          action: activityActions[i % activityActions.length],
          entityType: i % 2 === 0 ? 'PROJECT' : 'TASK',
          entityId: i % 2 === 0 ? projects[Object.keys(projects)[0]].id : tasks[i % tasks.length].id,
          changes: { sample: true, index: i },
          ipAddress: '127.0.0.1',
          tenantId: tenant.id,
          userId: u.id,
        },
      });
      activityCount++;
    }
  }
  console.log(`✅ ${activityCount} activity logs created`);

  // ---------------------------------------------------------------------------
  // AUDIT LOGS
  // ---------------------------------------------------------------------------
  const auditActions = ['PROJECT_VIEW', 'TASK_VIEW', 'MEMBER_INVITE', 'ROLE_CHANGE', 'SHARE_CREATE'];
  let auditCount = 0;
  for (const slug of Object.keys(tenants)) {
    const tenant = tenants[slug];
    const tenantUsers = memberships.filter((m) => m[0] === slug).map((m) => m[1]);
    for (let i = 0; i < 6; i++) {
      const u = users[tenantUsers[i % tenantUsers.length]];
      const decision = i % 5 === 0 ? AuditDecision.DENY : AuditDecision.ALLOW;
      await prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorId: u.id,
          actorRole: u.role,
          action: auditActions[i % auditActions.length],
          resourceType: i % 2 === 0 ? 'PROJECT' : 'TASK',
          resourceId: i % 2 === 0 ? projects[Object.keys(projects)[0]].id : tasks[i % tasks.length].id,
          decision,
          reason: decision === AuditDecision.DENY ? 'Insufficient permissions' : 'Authorized',
          ipAddress: '192.168.1.' + (10 + i),
        },
      });
      auditCount++;
    }
  }
  console.log(`✅ ${auditCount} audit logs created`);

  // ---------------------------------------------------------------------------
  // INVITATIONS
  // ---------------------------------------------------------------------------
  const invitations = [
    { tenant: 'taskflow-demo', email: 'newhire@taskflow.com', role: Role.MEMBER, accepted: false },
    { tenant: 'taskflow-demo', email: 'intern@taskflow.com', role: Role.GUEST, accepted: false },
    { tenant: 'acme-corp', email: 'vendor@acme.com', role: Role.GUEST, accepted: true },
    { tenant: 'globex-inc', email: 'partner@globex.com', role: Role.MEMBER, accepted: false },
  ];
  for (const inv of invitations) {
    await prisma.invitation.create({
      data: {
        email: inv.email,
        role: inv.role,
        token: `tok_${inv.tenant}_${Math.random().toString(36).slice(2, 10)}`,
        expiresAt: daysFromNow(inv.accepted ? -1 : 7),
        acceptedAt: inv.accepted ? daysFromNow(-1) : null,
        tenantId: tenants[inv.tenant].id,
        invitedById: users[memberships.find((m) => m[0] === inv.tenant && m[2] === Role.OWNER)![1]].id,
      },
    });
  }
  console.log(`✅ ${invitations.length} invitations created`);

  // ---------------------------------------------------------------------------
  // RESOURCE SHARES
  // ---------------------------------------------------------------------------
  const shares = [
    { tenant: 'taskflow-demo', resourceType: 'PROJECT', slug: 'website-redesign', targetType: ShareTarget.USER, email: 'member3@taskflow.com', access: ShareAccess.VIEW },
    { tenant: 'taskflow-demo', resourceType: 'TASK', slug: 'mobile-app', targetType: ShareTarget.EMAIL, email: 'external@client.com', access: ShareAccess.EDIT, taskIdx: 4 },
    { tenant: 'acme-corp', resourceType: 'PROJECT', slug: 'erp-implementation', targetType: ShareTarget.USER, email: 'designer@acme.com', access: ShareAccess.MANAGE },
  ];
  for (const s of shares) {
    let resourceId: string;
    if (s.resourceType === 'PROJECT') {
      resourceId = projects[s.slug].id;
    } else {
      resourceId = tasks.find((t) => t.slug === s.slug)!.id;
    }
    const data: any = {
      resourceType: s.resourceType,
      resourceId,
      targetType: s.targetType,
      access: s.access,
      tenantId: tenants[s.tenant].id,
      createdById: users[memberships.find((m) => m[0] === s.tenant && (m[2] === Role.OWNER || m[2] === Role.ADMIN || m[2] === Role.MANAGER))![1]].id,
    };
    if (s.targetType === ShareTarget.USER) {
      data.userId = users[s.email].id;
    } else {
      data.email = s.email;
    }
    await prisma.resourceShare.create({ data });
  }
  console.log(`✅ ${shares.length} resource shares created`);

  // ---------------------------------------------------------------------------
  // ATTACHMENTS (metadata only; no physical file)
  // ---------------------------------------------------------------------------
  let attachCount = 0;
  const mimeSamples = ['application/pdf', 'image/png', 'text/plain'];
  for (let i = 0; i < 6; i++) {
    const t = tasks[i % tasks.length];
    await prisma.attachment.create({
      data: {
        filename: `file-${i + 1}-${t.id.slice(0, 6)}.bin`,
        originalName: `attachment-${i + 1}.${['pdf', 'png', 'txt'][i % 3]}`,
        mimeType: mimeSamples[i % mimeSamples.length],
        size: 1024 * (i + 1) * 12,
        taskId: t.id,
        uploadedById: t.assigneeId,
      },
    });
    attachCount++;
  }
  console.log(`✅ ${attachCount} attachments created`);

  // ---------------------------------------------------------------------------
  // TOKENS (refresh / reset / verification)
  // ---------------------------------------------------------------------------
  await prisma.refreshToken.create({
    data: { token: 'refresh_demo_active', expiresAt: daysFromNow(7), userId: users['owner@taskflow.com'].id },
  });
  await prisma.passwordResetToken.create({
    data: { token: 'reset_demo_expired', expiresAt: daysFromNow(-1), used: false, userId: users['admin@taskflow.com'].id },
  });
  await prisma.emailVerificationToken.create({
    data: { token: 'verify_demo', expiresAt: daysFromNow(2), userId: users['contractor@taskflow.com'].id },
  });
  console.log('✅ Token records created');

  // ---------------------------------------------------------------------------
  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Demo accounts (password for all: ' + DEMO_PASSWORD + '):');
  for (const u of usersData) {
    console.log(`   ${u.role.padEnd(7)} ${u.email}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
