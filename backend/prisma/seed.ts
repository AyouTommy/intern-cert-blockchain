import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化数据...\n');

  // 创建高校
  const university1 = await prisma.university.upsert({
    where: { code: 'UNIV001' },
    update: {},
    create: {
      code: 'UNIV001',
      name: '北京大学',
      englishName: 'Peking University',
      province: '北京',
      city: '北京',
      address: '北京市海淀区颐和园路5号',
      website: 'https://www.pku.edu.cn',
      isVerified: true,
    },
  });

  const university2 = await prisma.university.upsert({
    where: { code: 'UNIV002' },
    update: {},
    create: {
      code: 'UNIV002',
      name: '清华大学',
      englishName: 'Tsinghua University',
      province: '北京',
      city: '北京',
      address: '北京市海淀区清华园1号',
      website: 'https://www.tsinghua.edu.cn',
      isVerified: true,
    },
  });

  console.log('✅ 高校数据创建完成');

  // 创建企业
  const company1 = await prisma.company.upsert({
    where: { code: 'COMP001' },
    update: {},
    create: {
      code: 'COMP001',
      name: '阿里巴巴集团',
      englishName: 'Alibaba Group',
      industry: '互联网/电子商务',
      scale: '10000人以上',
      province: '浙江',
      city: '杭州',
      address: '浙江省杭州市余杭区文一西路969号',
      website: 'https://www.alibaba.com',
      contactPerson: '张三',
      contactEmail: 'hr@alibaba.com',
      isVerified: true,
    },
  });

  const company2 = await prisma.company.upsert({
    where: { code: 'COMP002' },
    update: {},
    create: {
      code: 'COMP002',
      name: '腾讯科技',
      englishName: 'Tencent',
      industry: '互联网/游戏',
      scale: '10000人以上',
      province: '广东',
      city: '深圳',
      address: '广东省深圳市南山区高新科技园',
      website: 'https://www.tencent.com',
      contactPerson: '李四',
      contactEmail: 'hr@tencent.com',
      isVerified: true,
    },
  });

  console.log('✅ 企业数据创建完成');

  // 创建管理员用户
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: '系统管理员',
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
    },
  });

  console.log('✅ 管理员账户创建完成');
  console.log('   📧 邮箱: admin@example.com');
  console.log('   🔑 密码: admin123\n');

  // 创建高校用户
  const uniPassword = await bcrypt.hash('university123', 12);
  const uniUser = await prisma.user.upsert({
    where: { email: 'university@pku.edu.cn' },
    update: {},
    create: {
      email: 'university@pku.edu.cn',
      password: uniPassword,
      name: '北大管理员',
      role: 'UNIVERSITY',
      universityId: university1.id,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log('✅ 高校管理员账户创建完成');
  console.log('   📧 邮箱: university@pku.edu.cn');
  console.log('   🔑 密码: university123\n');

  // 创建企业用户
  const compPassword = await bcrypt.hash('company123', 12);
  const compUser = await prisma.user.upsert({
    where: { email: 'hr@alibaba.com' },
    update: {},
    create: {
      email: 'hr@alibaba.com',
      password: compPassword,
      name: '阿里HR',
      role: 'COMPANY',
      companyId: company1.id,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log('✅ 企业用户账户创建完成');
  console.log('   📧 邮箱: hr@alibaba.com');
  console.log('   🔑 密码: company123\n');

  // 创建学生用户
  const stuPassword = await bcrypt.hash('student123', 12);
  const student = await prisma.user.upsert({
    where: { email: 'student@pku.edu.cn' },
    update: {},
    create: {
      email: 'student@pku.edu.cn',
      password: stuPassword,
      name: '张同学',
      role: 'STUDENT',
      isActive: true,
      emailVerified: true,
    },
  });

  // 创建学生档案
  await prisma.studentProfile.upsert({
    where: { studentId: '2024001001' },
    update: {},
    create: {
      studentId: '2024001001',
      userId: student.id,
      grade: '2024级',
      major: '计算机科学与技术',
      department: '信息科学技术学院',
      enrollmentYear: 2024,
      graduationYear: 2028,
    },
  });

  console.log('✅ 学生账户创建完成');
  console.log('   📧 邮箱: student@pku.edu.cn');
  console.log('   🔑 密码: student123\n');

  // 创建默认证明模板
  await prisma.certificateTemplate.upsert({
    where: { id: 'default-template-pku' },
    update: {},
    create: {
      id: 'default-template-pku',
      name: '标准实习证明模板',
      description: '北京大学标准实习证明模板',
      content: `
        兹证明 {{studentName}}，学号 {{studentId}}，系我校 {{department}} {{major}} 专业学生，
        于 {{startDate}} 至 {{endDate}} 在 {{companyName}} {{position}} 岗位实习，
        实习期间表现良好。

        特此证明。

        {{universityName}}
        {{issueDate}}
      `,
      fields: JSON.stringify([
        { name: 'studentName', label: '学生姓名', type: 'text', required: true },
        { name: 'studentId', label: '学号', type: 'text', required: true },
        { name: 'department', label: '院系', type: 'text', required: true },
        { name: 'major', label: '专业', type: 'text', required: true },
        { name: 'companyName', label: '企业名称', type: 'text', required: true },
        { name: 'position', label: '实习岗位', type: 'text', required: true },
        { name: 'startDate', label: '开始日期', type: 'date', required: true },
        { name: 'endDate', label: '结束日期', type: 'date', required: true },
      ]),
      isDefault: true,
      universityId: university1.id,
    },
  });

  console.log('✅ 证明模板创建完成');

  // 创建系统配置
  const configs = [
    { key: 'site_name', value: '高校实习证明上链系统', description: '网站名称' },
    { key: 'blockchain_enabled', value: 'true', description: '是否启用区块链' },
    { key: 'auto_upchain', value: 'false', description: '是否自动上链' },
    { key: 'verify_expiry_days', value: '365', description: '验证链接有效期（天）' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }

  console.log('✅ 系统配置创建完成');

  console.log('\n🎉 数据初始化完成！\n');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
