import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/encryption.js';
import readline from 'readline';
dotenv.config();
const prisma = new PrismaClient();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}
async function createAdminUser() {
    try {
        console.log('\n🔐 Create Admin User\n');
        const email = await question('Email: ');
        const password = await question('Password: ');
        const name = await question('Name: ');
        const tenantName = await question('Tenant Name: ');
        const tenantSlug = await question('Tenant Slug (lowercase, no spaces): ');
        if (!email || !password || !name || !tenantName || !tenantSlug) {
            console.error('❌ All fields are required!');
            process.exit(1);
        }
        const existingUser = await prisma.adminUser.findUnique({
            where: { email },
        });
        if (existingUser) {
            console.error('❌ User with this email already exists!');
            process.exit(1);
        }
        const existingTenant = await prisma.tenant.findUnique({
            where: { slug: tenantSlug },
        });
        if (existingTenant) {
            console.error('❌ Tenant with this slug already exists!');
            process.exit(1);
        }
        const hashedPassword = await hashPassword(password);
        const result = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: tenantName,
                    slug: tenantSlug,
                    status: 'ACTIVE',
                    plan: 'free',
                },
            });
            const adminUser = await tx.adminUser.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    role: 'TENANT_ADMIN',
                    tenantId: tenant.id,
                },
            });
            return { tenant, adminUser };
        });
        console.log('\n✅ Admin user created successfully!\n');
        console.log(`Email: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Tenant: ${tenantName} (${tenantSlug})`);
        console.log(`\n🚀 You can now login at http://localhost:8080/login\n`);
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        process.exit(1);
    }
    finally {
        rl.close();
        await prisma.$disconnect();
    }
}
createAdminUser();
//# sourceMappingURL=createAdmin.js.map